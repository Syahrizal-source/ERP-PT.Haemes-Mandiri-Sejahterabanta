import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;

if (!SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

/**
 * Payload yang kita simpan di token
 * (JANGAN extend JwtPayload di sini)
 */
export interface AuthTokenPayload {
  userId: number;
  role: "PIC" | "ADMIN" | "USER";
}

/**
 * Sign JWT
 */
export function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: "1d",
  };

  return jwt.sign(payload, SECRET, options);
}

/**
 * Verify JWT
 */
export function verifyToken(token: string): AuthTokenPayload & JwtPayload {
  const decoded = jwt.verify(token, SECRET);

  if (typeof decoded === "string") {
    throw new Error("Invalid token");
  }

  return decoded as AuthTokenPayload & JwtPayload;
}
