import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { payrollSchema, type PayrollInput } from "@/lib/validators/payroll";
import { postPayroll } from "@/lib/accounting/postPayroll";
import type { JurnalLine } from "@/types/accounting";
import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";

/* =========================
   TYPES
========================= */

type Context = {
  params: Promise<{ id: string }>;
};

type PayrollRow = {
  id: number;
  id_pegawai: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
  pph21: number;
  bpjs: number;
  net_gaji: number;
  id_jurnal: number | null;
};

type PegawaiRow = {
  id: number;
  nama: string;
  gaji_pokok: number;
  tunjangan: number;
};

/* =========================
   GET BY ID (JOIN PEGAWAI)
========================= */

export async function GET(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const payrollId: number = Number(id);

    const { data, error } = await db
      .from("payroll")
      .select(
        `
        *,
        pegawai (
          id,
          nama,
          divisi
        )
      `,
      )
      .eq("id", payrollId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   PUT (UPDATE)
========================= */

export async function PUT(
  req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const payrollId: number = Number(id);

    const body: unknown = await req.json();

    const parsed = payrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data payroll tidak valid" },
        { status: 400 },
      );
    }

    const input: PayrollInput = parsed.data;

    /* =========================
       AMBIL PEGAWAI
    ========================= */

    const { data: pegawai, error: pegawaiError } = await db
      .from("pegawai")
      .select("id, nama, gaji_pokok, tunjangan")
      .eq("id", input.id_pegawai)
      .single();

    if (pegawaiError || !pegawai) {
      return NextResponse.json(
        { error: "Data pegawai tidak ditemukan" },
        { status: 400 },
      );
    }

    const pegawaiData: PegawaiRow = pegawai;

    /* =========================
       HITUNG
    ========================= */

    const total_gaji: number = pegawaiData.gaji_pokok;
    const total_tunjangan: number = pegawaiData.tunjangan;
    const total_potongan: number = input.total_potongan;

    const pph21: number = total_gaji * 0.05;
    const bpjs: number = total_gaji * 0.02;

    const net_gaji: number =
      total_gaji + total_tunjangan - total_potongan - pph21 - bpjs;

    /* =========================
       ANTI MINUS
    ========================= */

    if (net_gaji < 0) {
      return NextResponse.json(
        { error: "Net gaji tidak boleh minus" },
        { status: 400 },
      );
    }

    /* =========================
       UPDATE PAYROLL
    ========================= */

    const { data, error } = await db
      .from("payroll")
      .update({
        id_pegawai: pegawaiData.id,
        bulan: input.bulan,
        tahun: input.tahun,
        total_gaji,
        total_tunjangan,
        total_potongan,
        pph21,
        bpjs,
        net_gaji,
      })
      .eq("id", payrollId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Gagal update payroll" },
        { status: 500 },
      );
    }

    const payroll: PayrollRow = data;

    /* =========================
       COA
    ========================= */

    const coaBeban = await getCoaMappingDetail("PAYROLL", "BEBAN");
    const coaHutang = await getCoaMappingDetail("PAYROLL", "HUTANG");

    /* =========================
       JURNAL (REPOST)
    ========================= */

    try {
      const lines: JurnalLine[] = [
        {
          id_coa: coaBeban.id_coa,
          debit: net_gaji,
          kredit: 0,
        },
        {
          id_coa: coaHutang.id_coa,
          debit: 0,
          kredit: net_gaji,
        },
      ];

      const jurnalId: number = await postPayroll(
        `${input.tahun}-${String(input.bulan).padStart(2, "0")}-01`,
        `PAY-${payroll.id}`,
        `Payroll ${pegawaiData.nama} ${input.bulan}/${input.tahun}`,
        lines,
      );

      await db
        .from("payroll")
        .update({ id_jurnal: jurnalId })
        .eq("id", payroll.id);
    } catch (err: unknown) {
      console.error("JURNAL UPDATE ERROR:", err);
    }

    return NextResponse.json({
      message: "Payroll berhasil diupdate",
      data: payroll,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const payrollId: number = Number(id);

    const { error } = await db.from("payroll").delete().eq("id", payrollId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Payroll berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
