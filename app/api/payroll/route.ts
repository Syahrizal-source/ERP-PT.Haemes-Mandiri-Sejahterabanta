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
  status_ptkp: string;
};

type Pph21Row = {
  id: number;
};

function formatTanggalPayroll(tahun: number, bulan: number): string {
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, 1));

  return tanggal.toISOString().slice(0, 10);
}

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
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengambil data payroll";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = payrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data payroll tidak valid",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const input: PayrollInput = parsed.data;

    // =========================================
    // AMBIL DATA PEGAWAI
    // =========================================

    const { data: pegawai, error: pegawaiError } = await db
      .from("pegawai")
      .select("id, nama, gaji_pokok, tunjangan, status_ptkp")
      .eq("id", input.id_pegawai)
      .single();

    if (pegawaiError || !pegawai) {
      return NextResponse.json(
        { error: "Data pegawai tidak ditemukan" },
        { status: 400 },
      );
    }

    const pegawaiData: PegawaiRow = pegawai;

    if (!pegawaiData.status_ptkp?.trim()) {
      return NextResponse.json(
        {
          error:
            "Status PTKP pegawai belum diisi. Lengkapi data pegawai terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    // =========================================
    // HITUNG PAYROLL
    // =========================================

    const tanggal = formatTanggalPayroll(input.tahun, input.bulan);

    const total_gaji = pegawaiData.gaji_pokok;
    const total_tunjangan = pegawaiData.tunjangan;
    const total_potongan = input.total_potongan;

    const pph21 = total_gaji * 0.05;
    const bpjs = total_gaji * 0.02;

    const net_gaji =
      total_gaji + total_tunjangan - total_potongan - pph21 - bpjs;

    if (!Number.isFinite(net_gaji) || net_gaji < 0) {
      return NextResponse.json(
        { error: "Net gaji tidak boleh minus atau tidak valid" },
        { status: 400 },
      );
    }

    // =========================================
    // INSERT PAYROLL
    // =========================================

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
        {
          error: payrollError?.message ?? "Gagal menyimpan data payroll",
        },
        { status: 500 },
      );
    }

    const payroll: PayrollRow = payrollInsert;

    // =========================================
    // AUTO GENERATE PPH21
    // =========================================

    try {
      const { data: existingPph, error: existingPphError } = await db
        .from("pph21")
        .select("id")
        .eq("id_payroll", payroll.id)
        .maybeSingle();

      if (existingPphError) {
        throw new Error(existingPphError.message);
      }

      const existingPphData: Pph21Row | null = existingPph;

      if (!existingPphData) {
        const gajiBruto = payroll.total_gaji;
        const biayaJabatan = gajiBruto * 0.05;
        const iuran = payroll.bpjs;
        const tarif = 5;

        const tanggalPph21 = formatTanggalPayroll(payroll.tahun, payroll.bulan);

        const hasilPph21 = hitungPph21({
          id_payroll: payroll.id,
          nama: pegawaiData.nama,
          status_ptkp: pegawaiData.status_ptkp,
          gaji_bruto: gajiBruto,
          biaya_jabatan: biayaJabatan,
          iuran,
          tarif_pph21: tarif,
          tanggal: tanggalPph21,
        });

        const nilaiPph21: number = hasilPph21.nilai_pph21;

        if (Number.isFinite(nilaiPph21) && nilaiPph21 > 0) {
          // =====================================
          // INSERT DATA PPH21
          // =====================================

          const { data: pphInsert, error: pphError } = await db
            .from("pph21")
            .insert({
              id_payroll: payroll.id,
              nama: pegawaiData.nama,
              status_ptkp: pegawaiData.status_ptkp,
              gaji_bruto: gajiBruto,
              biaya_jabatan: biayaJabatan,
              iuran,
              tarif_pph21: tarif,
              thr: hasilPph21.thr,
              penghasilan_bruto: hasilPph21.penghasilan_bruto,
              nilai_pph21: nilaiPph21,
              tanggal: tanggalPph21,
            })
            .select("id")
            .single();

          if (pphError) {
            throw new Error(pphError.message);
          }

          if (pphInsert) {
            // =================================
            // POSTING JURNAL PPH21
            // =================================

            try {
              await postPph21({
                id_payroll: payroll.id,
                nama: pegawaiData.nama,
                status_ptkp: pegawaiData.status_ptkp,
                gaji_bruto: gajiBruto,
                biaya_jabatan: biayaJabatan,
                iuran,
                tarif_pph21: tarif,
                thr: hasilPph21.thr,
                penghasilan_bruto: hasilPph21.penghasilan_bruto,
                nilai_pph21: nilaiPph21,
                tanggal: tanggalPph21,
              });
            } catch (error: unknown) {
              console.error("JURNAL PPH21 AUTO ERROR:", error);
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error("AUTO PPH21 ERROR:", error);
    }

    // =========================================
    // AMBIL COA PAYROLL
    // =========================================

    const coaBeban = await getCoaMappingDetail("PAYROLL", "BEBAN");

    const coaHutang = await getCoaMappingDetail("PAYROLL", "HUTANG");

    // =========================================
    // POSTING JURNAL PAYROLL
    // =========================================

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
        tanggal,
        `PAY-${payroll.id}`,
        `Payroll ${pegawaiData.nama} ${input.bulan}/${input.tahun}`,
        lines,
      );

      const { error: updateJurnalError } = await db
        .from("payroll")
        .update({ id_jurnal: jurnalId })
        .eq("id", payroll.id);

      if (updateJurnalError) {
        console.error(
          "UPDATE ID JURNAL PAYROLL ERROR:",
          updateJurnalError.message,
        );
      }
    } catch (error: unknown) {
      console.error("JURNAL PAYROLL ERROR:", error);
    }

    return NextResponse.json({
      message: "Payroll berhasil dibuat",
      data: {
        ...payroll,
        id_jurnal: jurnalId,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memproses payroll";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
