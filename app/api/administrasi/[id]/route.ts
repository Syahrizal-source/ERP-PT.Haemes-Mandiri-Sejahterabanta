import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  AdministrasiSchema,
  AdministrasiInput,
} from "@/lib/validators/administrasi";

interface Params {
  params: Promise<{ id: string }>;
}

/* ======================
   PUT ADMINISTRASI
====================== */
export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const administrasiId = Number(id);

    if (Number.isNaN(administrasiId)) {
      return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
    }

    const body: unknown = await req.json();
    const parsed: AdministrasiInput = AdministrasiSchema.parse(body);

    const { error } = await db
      .from("administrasi")
      .update(parsed)
      .eq("id", administrasiId);

    if (error) throw error;

    return NextResponse.json({ message: "Administrasi diperbarui" });
  } catch (error) {
    console.error("PUT ADMINISTRASI ERROR:", error);
    return NextResponse.json(
      { message: "Gagal update administrasi" },
      { status: 500 },
    );
  }
}

/* ======================
   DELETE ADMINISTRASI
====================== */
export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const administrasiId = Number(id);

    if (Number.isNaN(administrasiId)) {
      return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
    }

    const { error } = await db
      .from("administrasi")
      .delete()
      .eq("id", administrasiId);

    if (error) throw error;

    return NextResponse.json({ message: "Administrasi dihapus" });
  } catch (error) {
    console.error("DELETE ADMINISTRASI ERROR:", error);
    return NextResponse.json(
      { message: "Gagal hapus administrasi" },
      { status: 500 },
    );
  }
}
