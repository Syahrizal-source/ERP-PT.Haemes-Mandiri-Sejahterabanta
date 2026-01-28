import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { jurnalPenutupSchema } from "@/lib/validators/jurnal-penutup";
import { calcHMSLabaRugi } from "@/lib/jurnal/calc-laba-rugi";

/* =========================
   Types
========================= */
type HMSResult = {
  total_pendapatan: number;
  total_beban: number;
  laba_rugi: number;
};

type JurnalDetailInsert = {
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;
};

/* =========================
   POST: Generate Jurnal Penutup (HMS / UT Standard)
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = jurnalPenutupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_periode } = parsed.data;

  // 1️⃣ Cek periode
  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode,status")
    .eq("id_periode", id_periode)
    .single();

  if (periodeError || !periode) {
    return NextResponse.json(
      { error: "Periode tidak ditemukan" },
      { status: 404 },
    );
  }

  if (periode.status === "CLOSED") {
    return NextResponse.json(
      { error: "Periode sudah CLOSED" },
      { status: 400 },
    );
  }

  // 2️⃣ Hitung laba rugi HMS (UT Rule)
  let hms: HMSResult;

  try {
    hms = await calcHMSLabaRugi(db, id_periode);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  if (hms.total_pendapatan === 0 && hms.total_beban === 0) {
    return NextResponse.json(
      { error: "Tidak ada pendapatan/beban untuk ditutup" },
      { status: 400 },
    );
  }

  // 3️⃣ Ambil COA wajib
  const { data: coaRows, error: coaError } = await db
    .from("coa")
    .select("id_coa,kode")
    .in("kode", ["4000", "5000", "3999", "3001"]);

  if (coaError || !coaRows || coaRows.length < 4) {
    return NextResponse.json(
      { error: "COA closing belum lengkap" },
      { status: 500 },
    );
  }

  const pendapatan = coaRows.find((c) => c.kode === "4000");
  const beban = coaRows.find((c) => c.kode === "5000");
  const ikhtisar = coaRows.find((c) => c.kode === "3999");
  const modal = coaRows.find((c) => c.kode === "3001");

  if (!pendapatan || !beban || !ikhtisar || !modal) {
    return NextResponse.json(
      { error: "COA closing tidak valid" },
      { status: 500 },
    );
  }

  // 4️⃣ Insert header jurnal penutup
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: new Date().toISOString().slice(0, 10),
      no_bukti: `CLOSE-${id_periode}`,
      keterangan: "Jurnal Penutup Otomatis (HMS/UT)",
      id_periode,
      sumber: "PENUTUP",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal penutup" },
      { status: 500 },
    );
  }

  const id_jurnal_penutup: number = header.id_jurnal;

  // 5️⃣ Detail jurnal penutup HMS (UT Standard)
  const details: JurnalDetailInsert[] = [];

  // Tutup pendapatan
  if (hms.total_pendapatan > 0) {
    details.push(
      {
        id_jurnal: id_jurnal_penutup,
        id_coa: pendapatan.id_coa,
        debit: hms.total_pendapatan,
        kredit: 0,
      },
      {
        id_jurnal: id_jurnal_penutup,
        id_coa: ikhtisar.id_coa,
        debit: 0,
        kredit: hms.total_pendapatan,
      },
    );
  }

  // Tutup beban
  if (hms.total_beban > 0) {
    details.push(
      {
        id_jurnal: id_jurnal_penutup,
        id_coa: ikhtisar.id_coa,
        debit: hms.total_beban,
        kredit: 0,
      },
      {
        id_jurnal: id_jurnal_penutup,
        id_coa: beban.id_coa,
        debit: 0,
        kredit: hms.total_beban,
      },
    );
  }

  // Tutup laba / rugi
  if (hms.laba_rugi > 0) {
    if (hms.total_pendapatan > hms.total_beban) {
      // LABA
      details.push(
        {
          id_jurnal: id_jurnal_penutup,
          id_coa: ikhtisar.id_coa,
          debit: hms.laba_rugi,
          kredit: 0,
        },
        {
          id_jurnal: id_jurnal_penutup,
          id_coa: modal.id_coa,
          debit: 0,
          kredit: hms.laba_rugi,
        },
      );
    } else {
      // RUGI
      details.push(
        {
          id_jurnal: id_jurnal_penutup,
          id_coa: modal.id_coa,
          debit: hms.laba_rugi,
          kredit: 0,
        },
        {
          id_jurnal: id_jurnal_penutup,
          id_coa: ikhtisar.id_coa,
          debit: 0,
          kredit: hms.laba_rugi,
        },
      );
    }
  }

  // 6️⃣ Validasi HMS/UT: total debit = total kredit
  const totalDebit = details.reduce(
    (s: number, d: JurnalDetailInsert) => s + d.debit,
    0,
  );

  const totalKredit = details.reduce(
    (s: number, d: JurnalDetailInsert) => s + d.kredit,
    0,
  );

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal penutup tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  // 7️⃣ Update periode CLOSED
  const { error: closeError } = await db
    .from("periode")
    .update({ status: "CLOSED" })
    .eq("id_periode", id_periode);

  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 });
  }

  return NextResponse.json({ id_jurnal_penutup });
}
