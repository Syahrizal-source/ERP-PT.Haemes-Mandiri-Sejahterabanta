import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export interface AuthUser {
  id: number;
  email: string;
  role_id: string;
}

export async function getAuthFromRequest(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const payload = verifyToken(token);

    return {
      id: payload.id,
      email: payload.email,
      role_id: payload.role_id,
    };
  } catch {
    return null;
  }
}
