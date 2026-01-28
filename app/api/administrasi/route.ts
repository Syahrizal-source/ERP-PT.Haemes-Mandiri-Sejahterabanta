import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  AdministrasiSchema,
  AdministrasiInput,
} from "@/lib/validators/administrasi";

interface AdministrasiRow extends AdministrasiInput {
  id: number;
  created_at: string;
  updated_at: string;
}

/* ======================
   GET ADMINISTRASI
====================== */
export async function GET() {
  try {
    const { data, error } = await db
      .from("administrasi")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error || !data) throw error;

    return NextResponse.json(data satisfies AdministrasiRow[]);
  } catch (error) {
    console.error("GET ADMINISTRASI ERROR:", error);
    return NextResponse.json(
      { message: "Gagal ambil data administrasi" },
      { status: 500 },
    );
  }
}

/* ======================
   POST ADMINISTRASI
====================== */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = AdministrasiSchema.parse(body);

    const { error } = await db.from("administrasi").insert(parsed);

    if (error) throw error;

    return NextResponse.json(
      { message: "Administrasi berhasil disimpan" },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST ADMINISTRASI ERROR:", error);
    return NextResponse.json(
      { message: "Gagal simpan administrasi" },
      { status: 500 },
    );
  }
}
