// lib/auth.ts
import { jwtVerify, SignJWT } from "jose"
import { prisma } from "./prisma"

export type JwtRole = "USER" | "ADMIN" | "EMPLOYEE"

// cargo do funcionário (você pode ajustar depois)
export type EmployeeRole =
  | "ILUMINACAO"
  | "BURACOS"
  | "LIXO"
  | "FISCALIZACAO"
  | "ADMIN" // opcional, se quiser

export type AuthUser = {
  id: string
  name: string | null
  email: string
  role: JwtRole
  employeeRole?: EmployeeRole | null
}

type JwtPayload = {
  sub?: string
  role?: JwtRole
  employeeRole?: EmployeeRole | null
}

function getJwtSecretKey() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET ausente no ambiente")
  return new TextEncoder().encode(s)
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() ?? null
}

export async function signUserToken(user: { id: string; role: JwtRole; employeeRole?: EmployeeRole | null }) {
  return new SignJWT({
    sub: user.id,
    role: user.role,
    employeeRole: user.employeeRole ?? null,
  })
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
  const employeeRole = (p.employeeRole ?? null) as EmployeeRole | null

  if (!userId) throw new Error("Token sem sub (userId)")

  return { userId, role, employeeRole }
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

    // 👇 se seu schema não tem employeeRole, deixe como null (ou troque o nome do campo)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!user) return null
    if (!user.email) return null

    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      role: user.role as JwtRole,
      employeeRole: null,
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

export function isEmployee(u: AuthUser) {
  return u.role === "EMPLOYEE"
}
