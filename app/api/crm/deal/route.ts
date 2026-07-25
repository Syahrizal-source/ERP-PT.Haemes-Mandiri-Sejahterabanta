import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { getCoaMapping } from "@/lib/accounting/mapping";

/* =========================
   TYPES
========================= */
type Deal = {
  id: string;
  id_customer: string | null;
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas: number | null;
  closing_date: string | null;
  created_at: string;
};

type CreateDealBody = {
  id_customer?: string;
  nama_deal: string;
  nilai: number;
  tahap: string;
  probabilitas?: number;
  closing_date?: string;
};

/* =========================
   GET
========================= */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db.from("crm_deal").select("*");

    if (error) {
      console.error("GET CRM DEAL ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    const safeData: Deal[] = (data ?? []).map((item) => ({
      id: item.id ?? "",
      id_customer: item.id_customer ?? null,
      nama_deal: item.nama_deal ?? "",
      nilai: Number(item.nilai ?? 0),
      tahap: item.tahap ?? "OPEN",
      probabilitas:
        item.probabilitas !== null && item.probabilitas !== undefined
          ? Number(item.probabilitas)
          : null,
      closing_date: item.closing_date ?? null,
      created_at: "",
    }));

    return NextResponse.json(safeData);
  } catch (err) {
    console.error("FATAL CRM DEAL ERROR:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/* =========================
   POST
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: CreateDealBody = await req.json();

  if (!body.nama_deal || body.nilai <= 0) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { data, error } = await db
    .from("crm_deal")
    .insert({
      id_customer: body.id_customer ?? null,
      nama_deal: body.nama_deal,
      nilai: body.nilai,
      tahap: body.tahap,
      probabilitas: body.probabilitas ?? null,
      closing_date: body.closing_date ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert gagal" },
      { status: 400 },
    );
  }

  /* =========================
     AUTO JURNAL (SMART MAPPING)
  ========================= */
  if (body.tahap?.toUpperCase() === "CLOSED") {
    try {
      console.log("AUTO JURNAL TRIGGERED");

      const { data: existing } = await db
        .from("jurnal")
        .select("id_jurnal")
        .ilike("keterangan", `%${body.nama_deal}%`);

      if (existing && existing.length > 0) {
        console.log("JURNAL SUDAH ADA, SKIP");
      } else {
        const { data: jurnal, error: jurnalError } = await db
          .from("jurnal")
          .insert({
            tanggal: new Date().toISOString(),
            no_bukti: `CRM-${Date.now()}`,
            sumber: "CRM_DEAL",
            keterangan: `Deal Closed - ${body.nama_deal}`,
            id_periode: 14,
            is_posted: true,
          })
          .select()
          .single();

        if (jurnalError || !jurnal) {
          console.error("ERROR INSERT JURNAL:", jurnalError);
        } else {
          console.log("JURNAL CREATED:", jurnal.id_jurnal);

          /* =========================
             SMART COA MAPPING
          ========================= */
          const mapping = getCoaMapping({
            sumber: "UMUM", // fallback aman (tidak merusak sistem lama)
          });

          const { error: detailError } = await db.from("jurnal_detail").insert([
            {
              id_jurnal: jurnal.id_jurnal,
              id_coa: mapping.kas,
              debit: body.nilai,
              kredit: 0,
            },
            {
              id_jurnal: jurnal.id_jurnal,
              id_coa: mapping.pendapatan,
              debit: 0,
              kredit: body.nilai,
            },
          ]);

          if (detailError) {
            console.error("ERROR DETAIL:", detailError);
          } else {
            console.log("DETAIL INSERTED");
          }
        }
      }
    } catch (err) {
      console.error("FATAL AUTO JURNAL:", err);
    }
  }

  return NextResponse.json(data as Deal);
}
