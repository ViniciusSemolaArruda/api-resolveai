// lib/auth.ts
import { jwtVerify, SignJWT } from "jose"
import { prisma } from "./prisma"

export type JwtRole = "USER" | "ADMIN"

export type AuthUser = {
  id: string
  name: string | null
  email: string
  role: JwtRole
}

type JwtPayload = {
  sub?: string
  role?: JwtRole
}

function getJwtSecretKey() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET ausente no ambiente")
  return new TextEncoder().encode(s)
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1] ?? null
}

export async function signUserToken(user: { id: string; role: JwtRole }) {
  return new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecretKey())
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecretKey())
  const p = payload as unknown as JwtPayload

  const userId = String(p.sub ?? "").trim()
  const role = (p.role ?? "USER") as JwtRole

  if (!userId) throw new Error("Token sem sub (userId)")

  return { userId, role }
}

/**
 * ✅ Retorna o usuário logado (do BD).
 * - Se token inválido / user não existe: retorna null
 */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const { userId } = await verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) return null

    // email no seu schema está String @unique (não nullable)
    if (!user.email) return null

    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      role: user.role as JwtRole,
    }
  } catch {
    return null
  }
}

/**
 * ✅ Exige autenticação (ou lança erro)
 */
export async function requireAuth(req: Request): Promise<AuthUser> {
  const u = await getAuthUser(req)
  if (!u) throw new Error("UNAUTHORIZED")
  return u
}

export function isAdmin(u: AuthUser) {
  return u.role === "ADMIN"
}
