import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({
    message: "Logout berhasil",
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };

  // Hapus cookie autentikasi utama
  res.cookies.set("token", "", cookieOptions);

  // Hapus cookie sesi lama jika masih ada
  res.cookies.set("session_user", "", cookieOptions);

  return res;
}
