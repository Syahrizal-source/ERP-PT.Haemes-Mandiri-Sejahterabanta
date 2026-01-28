import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/supabase/server";

interface LoginBody {
  email: string;
  password: string;
}

interface UserRow {
  id: number;
  name: string;
  password: string;
  role_id: string;
}

export async function POST(req: Request) {
  try {
    const body: LoginBody = await req.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { message: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    const { data: user, error } = await db
      .from("users")
      .select("id, name, password, role_id")
      .eq("email", body.email)
      .maybeSingle<UserRow>();

    if (error || !user) {
      return NextResponse.json(
        { message: "Email atau password salah" },
        { status: 401 },
      );
    }

    const match = await bcrypt.compare(body.password, user.password);

    if (!match) {
      return NextResponse.json(
        { message: "Email atau password salah" },
        { status: 401 },
      );
    }

    const res = NextResponse.json({
      message: "Login berhasil",
      user: {
        id: user.id,
        name: user.name,
        role: user.role_id,
      },
    });

    // set session cookie
    res.cookies.set("session_user", String(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 jam
    });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
