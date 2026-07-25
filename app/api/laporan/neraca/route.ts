import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Coa = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";
};

type JurnalDetail = {
  id_coa: number;
  debit: number;
  kredit: number;
  id_jurnal: number;
};

type Jurnal = {
  id_jurnal: number;
  id_periode: number;
  is_posted: boolean;
};

type NeracaRow = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS";
  saldo: number;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const idPeriodeParam = searchParams.get("id_periode");

  if (!idPeriodeParam) {
    return NextResponse.json(
      { error: "id_periode wajib diisi" },
      { status: 400 },
    );
  }

  const id_periode = Number(idPeriodeParam);

  if (!Number.isInteger(id_periode)) {
    return NextResponse.json(
      { error: "id_periode tidak valid" },
      { status: 400 },
    );
  }

  /* =========================
     AMBIL DATA
  ========================= */

  const { data: jurnalData, error: jurnalError } = await db
    .from("jurnal")
    .select("id_jurnal, id_periode, is_posted")
    .eq("id_periode", id_periode)
    .eq("is_posted", true);

  if (jurnalError) {
    return NextResponse.json({ error: jurnalError.message }, { status: 500 });
  }

  const jurnalIds = jurnalData.map((j) => j.id_jurnal);

  const { data: detailData, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_coa, debit, kredit, id_jurnal")
    .in("id_jurnal", jurnalIds);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  const { data: coaData, error: coaError } = await db
    .from("coa")
    .select("id_coa, kode, nama, tipe");

  if (coaError) {
    return NextResponse.json({ error: coaError.message }, { status: 500 });
  }

  const coaMap = new Map<number, Coa>();
  for (const c of coaData) {
    coaMap.set(c.id_coa, c);
  }

  /* =========================
     HITUNG LABA
  ========================= */
  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const d of detailData as JurnalDetail[]) {
    const coa = coaMap.get(d.id_coa);
    if (!coa) continue;

    if (coa.tipe === "PENDAPATAN") {
      totalPendapatan += d.kredit - d.debit;
    }

    if (coa.tipe === "BEBAN") {
      totalBeban += d.debit - d.kredit;
    }
  }

  const labaBersih = totalPendapatan - totalBeban;

  /* =========================
     NERACA
  ========================= */
  const map = new Map<number, NeracaRow>();

  for (const d of detailData as JurnalDetail[]) {
    const coa = coaMap.get(d.id_coa);
    if (!coa) continue;

    if (
      coa.tipe !== "ASET" &&
      coa.tipe !== "LIABILITAS" &&
      coa.tipe !== "EKUITAS"
    )
      continue;

    if (!map.has(coa.id_coa)) {
      map.set(coa.id_coa, {
        id_coa: coa.id_coa,
        kode: coa.kode,
        nama: coa.nama,
        tipe: coa.tipe,
        saldo: 0,
      });
    }

    const item = map.get(coa.id_coa);
    if (!item) continue;

    if (coa.tipe === "ASET") {
      item.saldo += d.debit - d.kredit;
    } else {
      item.saldo += d.kredit - d.debit;
    }
  }

  const rows = Array.from(map.values());

  /* =========================
     TAMBAH LABA KE EKUITAS
  ========================= */
  rows.push({
    id_coa: 999998,
    kode: "LABA",
    nama: "Laba Berjalan",
    tipe: "EKUITAS",
    saldo: labaBersih,
  });

  /* =========================
     TOTAL
  ========================= */
  const total_aset = rows
    .filter((r) => r.tipe === "ASET")
    .reduce((s, r) => s + r.saldo, 0);

  const total_liabilitas = rows
    .filter((r) => r.tipe === "LIABILITAS")
    .reduce((s, r) => s + r.saldo, 0);

  const total_ekuitas = rows
    .filter((r) => r.tipe === "EKUITAS")
    .reduce((s, r) => s + r.saldo, 0);

  return NextResponse.json({
    id_periode,
    laba_bersih: labaBersih,
    total_aset,
    total_liabilitas,
    total_ekuitas,
    balance_check:
      Math.round(total_aset) === Math.round(total_liabilitas + total_ekuitas),
    rows,
  });
}
