import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  AdministrasiSchema,
  AdministrasiInput,
} from "@/lib/validators/administrasi";

export interface AdministrasiRow extends AdministrasiInput {
  id: number;
  created_at: string;
  updated_at: string;
}

/* ======================
   GET ADMINISTRASI
====================== */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("administrasi")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return NextResponse.json(
        { message: "Gagal ambil data administrasi" },
        { status: 500 },
      );
    }

    return NextResponse.json(data as AdministrasiRow[]);
  } catch {
    return NextResponse.json(
      { message: "Gagal ambil data administrasi" },
      { status: 500 },
    );
  }
}

/* ======================
   POST ADMINISTRASI
====================== */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed: AdministrasiInput = AdministrasiSchema.parse(body);

    const { error } = await db.from("administrasi").insert(parsed);

    if (error) {
      return NextResponse.json(
        { message: "Gagal simpan administrasi" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Administrasi berhasil disimpan" },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "Gagal simpan administrasi" },
      { status: 400 },
    );
  }
}
