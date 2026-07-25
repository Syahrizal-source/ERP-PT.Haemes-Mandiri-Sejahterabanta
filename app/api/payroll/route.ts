import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { postPayroll } from "@/lib/accounting/postPayroll";
import { payrollSchema, type PayrollInput } from "@/lib/validators/payroll";
import type { JurnalLine } from "@/types/accounting";
import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";
import { hitungPph21 } from "@/lib/validators/pph21";
import { postPph21 } from "@/lib/accounting/postPph21";

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
   GET (JOIN PEGAWAI)
========================= */

export async function GET(): Promise<NextResponse> {
  try {
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
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
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
       AMBIL DATA PEGAWAI
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
       HITUNG (AMBIL DARI PEGAWAI)
    ========================= */
    const tanggalObj: Date = new Date(input.tahun, input.bulan, 0);
    const tanggal: string = tanggalObj.toISOString().split("T")[0];
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
       INSERT PAYROLL
    ========================= */

    const { data: payrollInsert, error: payrollError } = await db
      .from("payroll")
      .insert({
        id_pegawai: pegawaiData.id,
        bulan: input.bulan,
        tahun: input.tahun,
        tanggal,
        total_gaji,
        total_tunjangan,
        total_potongan,
        pph21,
        bpjs,
        net_gaji,
      })
      .select()
      .single();

    if (payrollError || !payrollInsert) {
      return NextResponse.json(
        { error: payrollError?.message },
        { status: 500 },
      );
    }

    const payroll: PayrollRow = payrollInsert;

    /* =========================
   AUTO GENERATE PPH21
========================= */

    try {
      /* ===== CEK DUPLIKAT ===== */
      const { data: existingPph } = await db
        .from("pph21")
        .select("id")
        .eq("id_payroll", payroll.id)
        .maybeSingle();

      if (!existingPph) {
        /* ===== HITUNG ===== */
        const gajiBruto: number = payroll.total_gaji;

        const biayaJabatan: number = gajiBruto * 0.05;
        const iuran: number = payroll.bpjs;

        const tarif: number = 5;

        const nilaiPph21: number = hitungPph21({
          id_payroll: payroll.id,
          nama: pegawaiData.nama,
          gaji_bruto: gajiBruto,
          biaya_jabatan: biayaJabatan,
          iuran: iuran,
          tarif_pph21: tarif,
          nilai_pph21: 0,
          tanggal: `${payroll.tahun}-${String(payroll.bulan).padStart(2, "0")}-01`,
        });

        if (nilaiPph21 > 0) {
          /* ===== INSERT ===== */
          const { data: pphInsert, error: pphError } = await db
            .from("pph21")
            .insert({
              id_payroll: payroll.id,
              nama: pegawaiData.nama,
              gaji_bruto: gajiBruto,
              biaya_jabatan: biayaJabatan,
              iuran: iuran,
              tarif_pph21: tarif,
              nilai_pph21: nilaiPph21,
              tanggal: `${payroll.tahun}-${String(payroll.bulan).padStart(2, "0")}-01`,
            })
            .select()
            .single();

          if (!pphError && pphInsert) {
            /* ===== JURNAL ===== */
            try {
              await postPph21({
                id_payroll: payroll.id,
                nama: pegawaiData.nama,
                gaji_bruto: gajiBruto,
                biaya_jabatan: biayaJabatan,
                iuran: iuran,
                tarif_pph21: tarif,
                nilai_pph21: nilaiPph21,
                tanggal: `${payroll.tahun}-${String(payroll.bulan).padStart(2, "0")}-01`,
              });
            } catch (err) {
              console.error("JURNAL PPH21 AUTO ERROR:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("AUTO PPH21 ERROR:", err);
    }

    /* =========================
       COA
    ========================= */

    const coaBeban = await getCoaMappingDetail("PAYROLL", "BEBAN");
    const coaHutang = await getCoaMappingDetail("PAYROLL", "HUTANG");

    /* =========================
       JURNAL
    ========================= */

    let jurnalId: number | null = null;

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

      jurnalId = await postPayroll(
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
      console.error("JURNAL ERROR:", err);
    }

    return NextResponse.json({
      message: "Payroll berhasil dibuat",
      data: payroll,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
