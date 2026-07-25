import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */

type RequestBody = {
  id_periode: number;
};

type JurnalRow = {
  id_jurnal: number;
};

type DetailRow = {
  id_coa: number;
  debit: number;
  kredit: number;
};

type CoaRow = {
  id_coa: number;
  tipe: "PENDAPATAN" | "BEBAN" | "ASET" | "LIABILITAS" | "EKUITAS";
};

type InsertDetail = {
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;
};

type PeriodeRow = {
  id_periode: number;
};

/* =========================
   HANDLER
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /* =========================
       PARSE BODY
    ========================= */
    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null || !("id_periode" in body)) {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const { id_periode } = body as RequestBody;

    if (!Number.isInteger(id_periode)) {
      return NextResponse.json(
        { error: "id_periode tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       AMBIL JURNAL
    ========================= */
    const { data: jurnalData, error: jurnalError } = await db
      .from("jurnal")
      .select("id_jurnal")
      .eq("id_periode", id_periode)
      .eq("is_posted", true);

    if (jurnalError) {
      return NextResponse.json({ error: jurnalError.message }, { status: 500 });
    }

    const jurnalIds: number[] = (jurnalData ?? []).map(
      (j) => (j as JurnalRow).id_jurnal,
    );

    if (jurnalIds.length === 0) {
      return NextResponse.json({ message: "Tidak ada jurnal" });
    }

    /* =========================
       DETAIL
    ========================= */
    const { data: detailData, error: detailError } = await db
      .from("jurnal_detail")
      .select("id_coa, debit, kredit")
      .in("id_jurnal", jurnalIds);

    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    /* =========================
       COA
    ========================= */
    const { data: coaData, error: coaError } = await db
      .from("coa")
      .select("id_coa, tipe");

    if (coaError) {
      return NextResponse.json({ error: coaError.message }, { status: 500 });
    }

    const coaMap = new Map<number, CoaRow>();
    for (const c of coaData ?? []) {
      coaMap.set((c as CoaRow).id_coa, c as CoaRow);
    }

    /* =========================
       HITUNG LABA
    ========================= */
    const saldoMap = new Map<number, number>();

    let pendapatan = 0;
    let beban = 0;

    for (const d of detailData ?? []) {
      const row = d as DetailRow;
      const coa = coaMap.get(row.id_coa);
      if (!coa) continue;

      const debit = Number(row.debit);
      const kredit = Number(row.kredit);

      if (coa.tipe === "PENDAPATAN") {
        const val = kredit - debit;
        pendapatan += val;
        saldoMap.set(row.id_coa, (saldoMap.get(row.id_coa) ?? 0) + val);
      }

      if (coa.tipe === "BEBAN") {
        const val = debit - kredit;
        beban += val;
        saldoMap.set(row.id_coa, (saldoMap.get(row.id_coa) ?? 0) + val);
      }
    }

    const laba = pendapatan - beban;

    /* =========================
       RETAINED EARNING
    ========================= */
    const { data: retained } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "30001")
      .single();

    if (!retained) {
      return NextResponse.json(
        { error: "COA retained tidak ditemukan" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT JURNAL CLOSING
    ========================= */
    const { data: jurnalBaru } = await db
      .from("jurnal")
      .insert({
        tanggal: new Date().toISOString().slice(0, 10),
        no_bukti: `CLOSE-${id_periode}-${Date.now()}`,
        keterangan: "Tutup Buku",
        sumber: "PENYESUAIAN",
        id_periode,
        is_posted: true,
      })
      .select("id_jurnal")
      .single();

    if (!jurnalBaru) {
      return NextResponse.json(
        { error: "Gagal insert jurnal" },
        { status: 500 },
      );
    }

    const closingDetails: InsertDetail[] = [];

    for (const [id_coa, val] of saldoMap.entries()) {
      if (val === 0) continue;

      closingDetails.push({
        id_jurnal: jurnalBaru.id_jurnal,
        id_coa,
        debit: val > 0 ? val : 0,
        kredit: val < 0 ? Math.abs(val) : 0,
      });
    }

    closingDetails.push({
      id_jurnal: jurnalBaru.id_jurnal,
      id_coa: retained.id_coa,
      debit: laba < 0 ? Math.abs(laba) : 0,
      kredit: laba > 0 ? laba : 0,
    });

    await db.from("jurnal_detail").insert(closingDetails);

    /* =========================
       CLOSE PERIODE
    ========================= */
    await db
      .from("periode")
      .update({
        status: "CLOSED",
        is_closed: true,
      })
      .eq("id_periode", id_periode);

    /* =========================
   VALIDASI: PASTIKAN DIA OPEN
========================= */
    const { data: periodeCheck } = await db
      .from("periode")
      .select("status")
      .eq("id_periode", id_periode)
      .single();

    if (!periodeCheck || periodeCheck.status !== "OPEN") {
      return NextResponse.json(
        { error: "Periode bukan OPEN / sudah ditutup" },
        { status: 400 },
      );
    }

    /* =========================
   CLOSE PERIODE (HANYA 1)
========================= */
    await db
      .from("periode")
      .update({
        status: "CLOSED",
        is_closed: true,
      })
      .eq("id_periode", id_periode);

    /* =========================
       INSERT PERIODE BARU
    ========================= */
    const { data: newPeriode } = await db
      .from("periode")
      .insert({
        nama_periode: `OPEN-${Date.now()}`,
        status: "OPEN",
        is_closed: false,
      })
      .select("id_periode")
      .single();

    if (!newPeriode) {
      return NextResponse.json(
        { error: "Gagal membuat periode baru" },
        { status: 500 },
      );
    }

    /* =========================
       OPENING BALANCE
    ========================= */
    const { data: allDetail } = await db
      .from("jurnal_detail")
      .select("id_coa, debit, kredit");

    const saldoMapAll = new Map<number, number>();

    for (const d of allDetail ?? []) {
      const row = d as DetailRow;
      const coa = coaMap.get(row.id_coa);
      if (!coa) continue;

      if (coa.tipe === "ASET") {
        saldoMapAll.set(
          row.id_coa,
          (saldoMapAll.get(row.id_coa) ?? 0) + (row.debit - row.kredit),
        );
      } else if (coa.tipe === "LIABILITAS" || coa.tipe === "EKUITAS") {
        saldoMapAll.set(
          row.id_coa,
          (saldoMapAll.get(row.id_coa) ?? 0) + (row.kredit - row.debit),
        );
      }
    }

    const { data: jurnalOpen } = await db
      .from("jurnal")
      .insert({
        tanggal: new Date().toISOString().slice(0, 10),
        no_bukti: `OPEN-${newPeriode.id_periode}-${Date.now()}`,
        keterangan: "Opening Balance",
        sumber: "PENYESUAIAN",
        id_periode: newPeriode.id_periode,
        is_posted: true,
      })
      .select("id_jurnal")
      .single();

    if (!jurnalOpen) {
      return NextResponse.json(
        { error: "Gagal opening jurnal" },
        { status: 500 },
      );
    }

    const openingDetails: InsertDetail[] = [];

    for (const [id_coa, saldo] of saldoMapAll.entries()) {
      if (saldo === 0) continue;

      openingDetails.push({
        id_jurnal: jurnalOpen.id_jurnal,
        id_coa,
        debit: saldo > 0 ? saldo : 0,
        kredit: saldo < 0 ? Math.abs(saldo) : 0,
      });
    }
    if (!openingDetails.length) {
      return NextResponse.json({
        message: "Opening balance kosong (tidak ada saldo)",
      });
    }

    await db.from("jurnal_detail").insert(openingDetails);

    return NextResponse.json({
      message: "Tutup buku & opening berhasil",
      laba,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
