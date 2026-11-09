import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { hutangSchema } from "@/lib/validators/hutang";
import { postHutang } from "@/lib/accounting/postHutang";

type HutangStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

interface HutangRow {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status: HutangStatus;
}

/* =========================
   GET: List Hutang
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("hutang")
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data hutang" },
      { status: 500 },
    );
  }

  const result: HutangRow[] = data.map((row) => ({
    id_hutang: Number(row.id_hutang),
    supplier: String(row.supplier),
    no_invoice: String(row.no_invoice),
    tanggal: String(row.tanggal),
    jatuh_tempo: String(row.jatuh_tempo),
    nilai: Number(row.nilai),
    status: row.status as HutangStatus,
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Hutang + Jurnal
========================= */

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Data hutang tidak valid" },
        { status: 400 },
      );
    }

    const parsed = hutangSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(parsed.error.format(), { status: 400 });
    }

    const { supplier, no_invoice, tanggal, jatuh_tempo, nilai, status } =
      parsed.data;

    if (!Number.isFinite(nilai) || nilai <= 0) {
      return NextResponse.json(
        { error: "Nilai hutang tidak valid" },
        { status: 400 },
      );
    }

    /* ===============================
       1. Cek nomor invoice
    ================================ */

    const { data: existing, error: existingError } = await db
      .from("hutang")
      .select("id_hutang")
      .eq("no_invoice", no_invoice)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: `Gagal memeriksa nomor invoice hutang: ${existingError.message}`,
        },
        { status: 500 },
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "No invoice hutang sudah dipakai" },
        { status: 400 },
      );
    }

    /* ===============================
       2. Insert Hutang
    ================================ */

    const { data, error } = await db
      .from("hutang")
      .insert({
        supplier,
        no_invoice,
        tanggal,
        jatuh_tempo,
        nilai,
        status,
      })
      .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message ?? "Gagal insert hutang",
        },
        { status: 500 },
      );
    }

    /* ===============================
       3. Posting Jurnal

       COA ditentukan otomatis melalui
       coa_mapping:

       HUTANG / BEBAN
       → 2655 / 5020 Biaya Pokok Jasa

       HUTANG / HUTANG
       → 2747 / 21107 Hutang Vendor
    ================================ */

    const noBukti: string = `HTG-${data.id_hutang}`;

    const jurnalId: number = await postHutang(
      tanggal,
      noBukti,
      `Hutang ke ${supplier}`,
      Number(nilai),
    );

    /* ===============================
       4. Response
    ================================ */

    return NextResponse.json(
      {
        ...data,
        id_jurnal: jurnalId,
        message: "Hutang berhasil disimpan dan jurnal telah dibuat.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat hutang";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
