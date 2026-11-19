import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

interface PeriodeAktifRow {
  id_periode: number;
  status: "OPEN" | "CLOSED";
  is_closed: boolean;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
}

interface JurnalNomorRow {
  no_bukti: string;
}

export async function GET(request: NextRequest) {
  try {
    const tanggal = request.nextUrl.searchParams.get("tanggal");

    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        { message: "Tanggal jurnal wajib diisi dengan format YYYY-MM-DD" },
        { status: 400 },
      );
    }

    // Pastikan tanggal kalender benar, bukan hanya cocok dengan pola.
    const parsedDate = new Date(`${tanggal}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== tanggal
    ) {
      return NextResponse.json(
        { message: "Tanggal jurnal tidak valid" },
        { status: 400 },
      );
    }

    const { data: periode, error: periodeError } = await db
      .from("periode")
      .select("id_periode, status, is_closed, tanggal_mulai, tanggal_selesai")
      .eq("status", "OPEN")
      .maybeSingle<PeriodeAktifRow>();

    if (periodeError) {
      console.error("GET PERIODE AKTIF ERROR:", periodeError);
      return NextResponse.json(
        { message: "Gagal mengambil periode aktif" },
        { status: 500 },
      );
    }

    if (!periode) {
      return NextResponse.json(
        { message: "Tidak ada periode akuntansi yang berstatus OPEN" },
        { status: 404 },
      );
    }

    if (periode.is_closed || periode.status !== "OPEN") {
      return NextResponse.json(
        { message: "Periode aktif sudah ditutup" },
        { status: 403 },
      );
    }

    if (
      !periode.tanggal_mulai ||
      !periode.tanggal_selesai ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periode.tanggal_mulai) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periode.tanggal_selesai)
    ) {
      return NextResponse.json(
        {
          message:
            "Tanggal mulai atau tanggal selesai periode aktif belum valid",
        },
        { status: 400 },
      );
    }

    if (periode.tanggal_mulai > periode.tanggal_selesai) {
      return NextResponse.json(
        { message: "Rentang tanggal periode aktif tidak valid" },
        { status: 400 },
      );
    }

    if (tanggal < periode.tanggal_mulai || tanggal > periode.tanggal_selesai) {
      return NextResponse.json(
        {
          message: `Tanggal jurnal harus berada dalam periode OPEN (${periode.tanggal_mulai} sampai ${periode.tanggal_selesai})`,
        },
        { status: 400 },
      );
    }

    // Nomor bukti mengikuti tanggal transaksi yang dipilih pada form.
    // Contoh 2026-01-13 menjadi JU-20260113-0001.
    const tanggalNomor = tanggal.replace(/-/g, "");
    const prefix = `JU-${tanggalNomor}`;

    const { data: jurnalTerakhir, error: jurnalError } = await db
      .from("jurnal")
      .select("no_bukti")
      .like("no_bukti", `${prefix}-%`)
      .order("no_bukti", { ascending: false })
      .limit(1)
      .maybeSingle<JurnalNomorRow>();

    if (jurnalError) {
      console.error("GET NOMOR JURNAL TERAKHIR ERROR:", jurnalError);
      return NextResponse.json(
        { message: "Gagal mengambil nomor jurnal terakhir" },
        { status: 500 },
      );
    }

    let nextCounter = 1;

    if (jurnalTerakhir?.no_bukti) {
      const match = jurnalTerakhir.no_bukti.match(
        new RegExp(`^${prefix}-(\\d+)$`),
      );

      if (!match) {
        return NextResponse.json(
          { message: "Format nomor bukti terakhir tidak valid" },
          { status: 409 },
        );
      }

      const lastNumber = Number(match[1]);

      if (!Number.isSafeInteger(lastNumber) || lastNumber < 0) {
        return NextResponse.json(
          { message: "Urutan nomor bukti terakhir tidak valid" },
          { status: 409 },
        );
      }

      nextCounter = lastNumber + 1;
    }

    const next_number = `${prefix}-${String(nextCounter).padStart(4, "0")}`;

    return NextResponse.json({
      next_number,
      id_periode: periode.id_periode,
      tanggal,
    });
  } catch (error: unknown) {
    console.error("GET NEXT NUMBER ERROR:", error);
    return NextResponse.json(
      { message: "Gagal membuat nomor bukti jurnal" },
      { status: 500 },
    );
  }
}
