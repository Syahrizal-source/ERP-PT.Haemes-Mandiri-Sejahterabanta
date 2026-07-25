import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface JurnalRow {
  id_jurnal: number;
  is_posted: boolean;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const jurnalId: number = Number(id);

    if (!jurnalId) {
      return NextResponse.json(
        { message: "ID jurnal tidak valid" },
        { status: 400 },
      );
    }

    const { data: jurnalData, error: jurnalError } = await db
      .from("jurnal")
      .select("id_jurnal,is_posted")
      .eq("id_jurnal", jurnalId)
      .single();

    if (jurnalError || !jurnalData) {
      return NextResponse.json(
        { message: "Jurnal tidak ditemukan" },
        { status: 404 },
      );
    }

    const jurnal: JurnalRow = {
      id_jurnal: jurnalData.id_jurnal,
      is_posted: jurnalData.is_posted,
    };

    if (jurnal.is_posted) {
      return NextResponse.json({
        message: "Jurnal sudah diposting",
        id_jurnal: jurnal.id_jurnal,
      });
    }

    const { error: updateError } = await db
      .from("jurnal")
      .update({
        is_posted: true,
        posted_at: new Date().toISOString(),
      })
      .eq("id_jurnal", jurnal.id_jurnal);

    if (updateError) {
      return NextResponse.json(
        { message: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Jurnal berhasil diposting",
      id_jurnal: jurnal.id_jurnal,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Gagal posting jurnal" },
      { status: 500 },
    );
  }
}
