import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ProyekMaster } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

/**
 * GET ALL PROYEK
 */
export async function GET() {
  const { data, error } = await db
    .from("proyek_master")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * CREATE PROYEK
 * return: { id: UUID }
 */
export async function POST(req: NextRequest) {
  try {
    type CreateProyekRequest = Omit<ProyekMaster, "id" | "created_at">;

    const body: CreateProyekRequest = await req.json();

    validatePositive(body.nilai_kontrak, "Nilai Kontrak");

    if (body.margin_target != null) {
      validatePositive(body.margin_target, "Margin Target");
    }

    const JENIS_PROYEK = [
      "PENGURUGAN",
      "CUT_FILL",
      "LAND_CLEARING",
      "JALAN",
      "DRAINASE",
      "APARTEMEN",
      "GEDUNG",
      "PERUMAHAN",
    ] as const;

    const STATUS_PROYEK = [
      "DRAFT",
      "OPEN",
      "BERJALAN",
      "SELESAI",
      "DITUTUP",
      "BATAL",
    ] as const;

    const METODE_KONTRAK = ["LUMPSUM", "UNIT_PRICE"] as const;

    if (!JENIS_PROYEK.includes(body.jenis_proyek)) {
      throw new Error("Jenis proyek tidak valid.");
    }

    if (!STATUS_PROYEK.includes(body.status)) {
      throw new Error("Status proyek tidak valid.");
    }

    if (!METODE_KONTRAK.includes(body.metode_kontrak)) {
      throw new Error("Metode kontrak tidak valid.");
    }

    const { data, error } = await db
      .from("proyek_master")
      .insert(body)
      .select("id")
      .single();

    if (error) {
      throw error;
    }
    return NextResponse.json({ id: data.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
