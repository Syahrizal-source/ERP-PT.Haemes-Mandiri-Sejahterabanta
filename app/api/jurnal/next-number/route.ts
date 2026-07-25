import { NextRequest } from "next/server";

import { db } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const prefix = request.nextUrl.searchParams.get("prefix");

  if (!prefix) {
    return Response.json(
      {
        message: "Prefix wajib diisi",
      },
      {
        status: 400,
      },
    );
  }

  const { data } = await db
    .from("jurnal")
    .select("no_bukti")
    .like("no_bukti", `${prefix}%`)
    .order("no_bukti", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  let nextCounter = 1;

  if (data?.no_bukti) {
    const parts = data.no_bukti.split("-");

    const lastNumber = Number(parts.at(-1));

    if (Number.isFinite(lastNumber)) {
      nextCounter = lastNumber + 1;
    }
  }

  const next_number = `${prefix}-${String(nextCounter).padStart(4, "0")}`;

  return Response.json({
    next_number,
  });
}
