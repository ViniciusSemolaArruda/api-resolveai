// lib/auth.ts
import { jwtVerify, SignJWT } from "jose"
import { prisma } from "./prisma"

export type JwtRole = "USER" | "ADMIN" | "EMPLOYEE"

export type EmployeeRole =
  | "ILUMINACAO"
  | "BURACOS"
  | "LIXO"
  | "FISCALIZACAO"
  | "ADMIN"

export type AuthUser = {
  id: string
  name: string | null
  email: string
  role: JwtRole
  employeeRole?: EmployeeRole | null
}

type JwtPayload = {
  sub?: string
  id?: string
  userId?: string
  role?: JwtRole
  employeeRole?: EmployeeRole | null
}

function getJwtSecretKey() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET ausente no ambiente")
  return new TextEncoder().encode(s)
}

function cleanToken(raw: string) {
  let t = (raw ?? "").trim()

  // remove aspas se veio stringificada
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }

  // se alguém salvou "Bearer xxx" como token
  t = t.replace(/^Bearer\s+/i, "").trim()

  return t
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim()
  return token ? cleanToken(token) : null
}

export async function signUserToken(user: {
  id: string
  role: JwtRole
  employeeRole?: EmployeeRole | null
}) {
  return new SignJWT({
    role: user.role,
    employeeRole: user.employeeRole ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id) // ✅ sub correto
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecretKey())
}

export async function verifyToken(token: string) {
  const cleaned = cleanToken(token)
  const { payload } = await jwtVerify(cleaned, getJwtSecretKey())
  const p = payload as unknown as JwtPayload

  const userId =
    String(p.sub ?? "").trim() ||
    String(p.userId ?? "").trim() ||
    String(p.id ?? "").trim()

  const role = (p.role ?? "USER") as JwtRole
  const employeeRole = (p.employeeRole ?? null) as EmployeeRole | null

  if (!userId) throw new Error("Token sem sub/userId/id")

  return { userId, role, employeeRole }
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const { userId } = await verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // ✅ se você tiver no schema, descomenta e ajusta o nome:
        // employeeRole: true,
      },
    })

    if (!user?.email) return null

    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      role: user.role as JwtRole,
      employeeRole: null, // 👈 troque para user.employeeRole se existir no schema
    }
  } catch (err) {
    console.error("getAuthUser failed:", err)
    return null
  }
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const u = await getAuthUser(req)
  if (!u) throw new Error("UNAUTHORIZED")
  return u
}

export function isAdmin(u: AuthUser) {
  return u.role === "ADMIN"
}

export function isEmployee(u: AuthUser) {
  return u.role === "EMPLOYEE"
}
