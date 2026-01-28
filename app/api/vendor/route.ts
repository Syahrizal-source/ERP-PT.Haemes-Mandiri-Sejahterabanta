import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { vendorSchema } from "@/lib/validators/vendor";

type VendorRow = {
  id_vendor: number;
  nama: string;
  npwp?: string;
  alamat?: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("vendor")
    .select("id_vendor,nama,npwp,alamat")
    .order("nama");

  if (error || !data) {
    return NextResponse.json({ error: "Gagal ambil vendor" }, { status: 500 });
  }

  const result: VendorRow[] = data.map((r) => ({
    id_vendor: r.id_vendor as number,
    nama: r.nama as string,
    npwp: r.npwp ?? undefined,
    alamat: r.alamat ?? undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = vendorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("vendor")
    .insert(parsed.data)
    .select("id_vendor,nama,npwp,alamat")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert vendor" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
