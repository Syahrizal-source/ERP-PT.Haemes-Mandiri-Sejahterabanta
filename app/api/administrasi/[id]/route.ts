import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  AdministrasiSchema,
  AdministrasiInput,
} from "@/lib/validators/administrasi";

type Params = { id: string };

/* ======================
   PUT ADMINISTRASI
====================== */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const administrasiId = Number(id);

    if (!Number.isInteger(administrasiId)) {
      return NextResponse.json(
        { message: "ID administrasi tidak valid" },
        { status: 400 },
      );
    }

    const body: unknown = await req.json();
    const parsed: AdministrasiInput = AdministrasiSchema.parse(body);

    const { error } = await db
      .from("administrasi")
      .update(parsed)
      .eq("id", administrasiId);

    if (error) {
      return NextResponse.json(
        { message: "Gagal update administrasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Administrasi diperbarui" });
  } catch {
    return NextResponse.json(
      { message: "Gagal update administrasi" },
      { status: 400 },
    );
  }
}

/* ======================
   DELETE ADMINISTRASI
====================== */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const administrasiId = Number(id);

    if (!Number.isInteger(administrasiId)) {
      return NextResponse.json(
        { message: "ID administrasi tidak valid" },
        { status: 400 },
      );
    }

    const { error } = await db
      .from("administrasi")
      .delete()
      .eq("id", administrasiId);

    if (error) {
      return NextResponse.json(
        { message: "Gagal hapus administrasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Administrasi dihapus" });
  } catch {
    return NextResponse.json(
      { message: "Gagal hapus administrasi" },
      { status: 400 },
    );
  }
}
