import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthFromRequest();

  if (!user) {
    return NextResponse.json(
      { message: "Belum login atau sesi tidak valid" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      message: "Sesi aktif",
      user,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
