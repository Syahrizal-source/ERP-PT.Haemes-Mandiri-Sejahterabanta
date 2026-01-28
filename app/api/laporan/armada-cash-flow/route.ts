import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =====================
   TYPE DEFINITIONS
===================== */

interface ArmadaRow {
  jumlah_tagihan: number;
  bersih: number;
}

interface CashFlowRow {
  penerimaan: number;
  pengembalian: number;
  pengeluaran: number;
  kasbon: number;
}

interface LaporanGabunganResponse {
  omset_armada: number;
  bersih_armada: number;
  cash_in: number;
  cash_out: number;
  saldo_bersih: number;
}

/* =====================
   GET LAPORAN
===================== */

export async function GET() {
  try {
    /* ===== ARMADA ===== */
    const { data: armada, error: armadaError } = await db
      .from("armada")
      .select("jumlah_tagihan, bersih");

    if (armadaError || !armada) {
      throw armadaError;
    }

    const omsetArmada: number = armada.reduce(
      (total: number, row: ArmadaRow) => total + Number(row.jumlah_tagihan),
      0,
    );

    const bersihArmada: number = armada.reduce(
      (total: number, row: ArmadaRow) => total + Number(row.bersih),
      0,
    );

    /* ===== CASH FLOW ===== */
    const { data: cash, error: cashError } = await db
      .from("cash_flow_armada")
      .select("penerimaan, pengembalian, pengeluaran, kasbon");

    if (cashError || !cash) {
      throw cashError;
    }

    const cashIn: number = cash.reduce(
      (total: number, row: CashFlowRow) =>
        total + Number(row.penerimaan) + Number(row.pengembalian),
      0,
    );

    const cashOut: number = cash.reduce(
      (total: number, row: CashFlowRow) =>
        total + Number(row.pengeluaran) + Number(row.kasbon),
      0,
    );

    const saldoBersih: number = Math.max(0, cashIn - cashOut);

    const response: LaporanGabunganResponse = {
      omset_armada: omsetArmada,
      bersih_armada: bersihArmada,
      cash_in: cashIn,
      cash_out: cashOut,
      saldo_bersih: saldoBersih,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("LAPORAN ARMADA + CASH FLOW ERROR:", error);
    return NextResponse.json(
      { message: "Gagal ambil laporan gabungan" },
      { status: 500 },
    );
  }
}
