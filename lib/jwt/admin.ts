// lib/jwt/admin.ts
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken"

export type AdminTokenPayload = {
  userId: string
  role: "ADMIN"
}

function getAdminSecret(): Secret {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET (ou JWT_SECRET) não definido no ambiente")
  }
  return secret
}

export function signToken(payload: { userId: string }) {
  const userId = payload.userId.trim()
  if (!userId) throw new Error("signToken: userId obrigatório")

  return jwt.sign(
    { userId, role: "ADMIN" },
    getAdminSecret(),
    {
      expiresIn: "7d",
      subject: userId, // ✅ cria o claim sub
    }
  )
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, getAdminSecret())

  // jwt.verify pode retornar string | JwtPayload
  if (typeof decoded === "string") {
    throw new Error("Token inválido")
  }

  const payload = decoded as JwtPayload & {
    userId?: string
    role?: string
  }

  const userId = String(payload.sub ?? payload.userId ?? "").trim()
  if (!userId) {
    throw new Error("Token sem sub (userId)")
  }

  return {
    userId,
    role: "ADMIN",
  }
}
