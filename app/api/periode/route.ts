import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ===============================
   SETUP SUPABASE
================================ */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

/* ===============================
   TYPES
================================ */
type PeriodeStatus = "OPEN" | "CLOSED";

interface PeriodeRow {
  id_periode: string;
  nama_periode: string;
  status: PeriodeStatus;
  created_at: string;
  jurnal?: {
    id_jurnal: number;
  }[];
}

/* ===============================
   GET: List Periode
================================ */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from<PeriodeRow>("periode")
      .select(
        `
    id_periode,
    nama_periode,
    status,
    created_at,

    jurnal (
      id_jurnal
    )
  `,
      )
      .order("status", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }
    /* ===============================
   FILTER:
   - tampilkan OPEN
   - tampilkan CLOSED yang punya jurnal
================================ */
    const filteredData = (data ?? []).filter(
      (periode): boolean =>
        periode.status === "OPEN" || (periode.jurnal?.length ?? 0) > 0,
    );

    return NextResponse.json(filteredData);
  } catch (err) {
    console.error("GET PERIODE ERROR:", err);

    return NextResponse.json(
      {
        message: "Gagal ambil data periode",
      },
      {
        status: 500,
      },
    );
  }
}

/* ===============================
   POST: Create Periode
================================ */
interface CreatePeriodeInput {
  nama_periode: string; // "01-01-2026 s/d 31-12-2026"
  status?: PeriodeStatus;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePeriodeInput;

    if (!body.nama_periode || body.nama_periode.trim().length < 10) {
      return NextResponse.json(
        { message: "nama_periode tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from<PeriodeRow>("periode")
      .insert([
        {
          nama_periode: body.nama_periode.trim(),
          status: body.status ?? "OPEN",
        },
      ])
      .select("id_periode");

    if (error) throw error;

    return NextResponse.json({ id_periode: data?.[0]?.id_periode });
  } catch (err) {
    console.error("POST PERIODE ERROR:", err);
    return NextResponse.json(
      { message: "Gagal simpan periode" },
      { status: 500 },
    );
  }
}

/* ===============================
   PATCH: Edit Periode
================================ */
interface UpdatePeriodeInput {
  id_periode: string;
  nama_periode: string;
  status: PeriodeStatus;
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as UpdatePeriodeInput;

    if (!body.id_periode) {
      return NextResponse.json(
        { message: "id_periode wajib diisi" },
        { status: 400 },
      );
    }

    if (!body.nama_periode || body.nama_periode.trim().length < 10) {
      return NextResponse.json(
        { message: "nama_periode tidak valid" },
        { status: 400 },
      );
    }

    const { data: periode, error: fetchError } = await supabase
      .from<PeriodeRow>("periode")
      .select("id_periode, status")
      .eq("id_periode", body.id_periode)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!periode) {
      return NextResponse.json(
        { message: "Periode tidak ditemukan" },
        { status: 404 },
      );
    }

    if (periode.status === "CLOSED") {
      return NextResponse.json(
        { message: "Periode CLOSED tidak bisa diubah" },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabase
      .from("periode")
      .update({
        nama_periode: body.nama_periode.trim(),
        status: body.status,
      })
      .eq("id_periode", body.id_periode);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH PERIODE ERROR:", err);
    return NextResponse.json(
      { message: "Gagal update periode" },
      { status: 500 },
    );
  }
}

/* ===============================
   DELETE: Delete Periode
================================ */
export async function DELETE(req: Request) {
  try {
    const { id_periode } = (await req.json()) as { id_periode: string };

    if (!id_periode) {
      return NextResponse.json(
        { message: "id_periode wajib diisi" },
        { status: 400 },
      );
    }

    const { data: periode, error: fetchError } = await supabase
      .from<PeriodeRow>("periode")
      .select("id_periode, status")
      .eq("id_periode", id_periode)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!periode) {
      return NextResponse.json(
        { message: "Periode tidak ditemukan" },
        { status: 404 },
      );
    }

    if (periode.status === "CLOSED") {
      return NextResponse.json(
        { message: "Periode CLOSED tidak bisa dihapus" },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from("periode")
      .delete()
      .eq("id_periode", id_periode);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE PERIODE ERROR:", err);
    return NextResponse.json(
      { message: "Gagal hapus periode" },
      { status: 500 },
    );
  }
}
