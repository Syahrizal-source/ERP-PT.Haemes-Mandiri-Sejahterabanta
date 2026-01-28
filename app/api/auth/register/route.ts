import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/supabase/server";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role_id: "AAA" | "AAB" | "AAP" | "AKS" | "AAC" | "ATX";
}

export async function POST(req: Request) {
  try {
    const body: RegisterBody = await req.json();

    if (!body.name || !body.email || !body.password || !body.role_id) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    // cek email unik
    const { data: exist } = await db
      .from("users")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (exist) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    // insert user langsung approved
    await db.from("users").insert({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      role_id: body.role_id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Registrasi berhasil, silakan login" },
      { status: 201 },
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
