import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { PiutangProyekAccounting, StatusPiutangProyek } from "@/types/proyek";

import {
  piutangProyekSchema,
  validatePiutangProyek,
} from "@/lib/validators/piutang-proyek";

import { postPiutangProyek } from "@/lib/accounting/postPiutangProyek";

/* =========================
   GET
========================= */

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    const customer = searchParams.get("customer");

    const status = searchParams.get("status") as StatusPiutangProyek | null;

    let query = db
      .from("v_piutang_proyek")
      .select("*")
      .order("tanggal", { ascending: false });

    if (idProyek && idProyek.trim() !== "") {
      query = query.eq("id_proyek", idProyek);
    }

    if (customer && customer.trim() !== "") {
      query = query.ilike("customer", `%${customer}%`);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const result: PiutangProyekAccounting[] = (data ??
      []) as PiutangProyekAccounting[];

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body: unknown = await req.json();

    const parsed = piutangProyekSchema.parse(body);

    validatePiutangProyek(parsed);

    /* =========================
       RUMUS ANTI MINUS
    ========================= */

    const saldo = Number(parsed.nilai_piutang) - Number(parsed.penerimaan);

    if (saldo < 0) {
      return NextResponse.json(
        {
          error: "Saldo piutang tidak boleh minus",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       POST JURNAL
    ========================= */

    const idJurnal = await postPiutangProyek(parsed);

    /* =========================
       INSERT DATABASE
    ========================= */

    const insertData = {
      id_proyek: parsed.id_proyek,
      tanggal: parsed.tanggal,

      customer: parsed.customer,

      tanggal_pembayaran: parsed.tanggal_pembayaran,

      nilai_piutang: Number(parsed.nilai_piutang),

      penerimaan: Number(parsed.penerimaan),

      keterangan: parsed.keterangan,

      status: parsed.status,

      id_jurnal: idJurnal,

      is_posted: true,
    };

    const { data, error } = await db
      .from("piutang_proyek")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Piutang proyek berhasil disimpan",

        data,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 400,
      },
    );
  }
}
