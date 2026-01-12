// lib/auth.ts
import { jwtVerify, SignJWT } from "jose"
import { prisma } from "./prisma"

export type LoginKind = "user" | "admin" | "employee"

// roles do sistema (do seu schema)
export type UserRole = "USER" | "ADMIN"

// categorias permitidas (iguais ao /api/cases)
export const ALLOWED_CATEGORIES = [
  "ILUMINACAO_PUBLICA",
  "BURACO_NA_VIA",
  "COLETA_DE_LIXO",
  "OBSTRUCAO_DE_CALCADA",
  "VAZAMENTO_DE_AGUA",
  "OUTROS",
] as const
export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number]

type JwtPayloadAny = {
  sub?: string
  role?: string
  kind?: string
  employeeCode?: number
  employeeRole?: string
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

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecretKey())
  const p = payload as unknown as JwtPayloadAny

  const userId = String(p.sub ?? "").trim()
  if (!userId) throw new Error("Token sem sub (id)")

  const kindRaw = String(p.kind ?? "").trim()
  const kind: LoginKind =
    kindRaw === "employee" || kindRaw === "admin" || kindRaw === "user"
      ? (kindRaw as LoginKind)
      : // fallback: se não vier kind, decide pelo role
        String(p.role ?? "").toUpperCase() === "ADMIN"
        ? "admin"
        : "user"

  return {
    userId,
    kind,
    role: String(p.role ?? "").trim(), // pode ser USER/ADMIN/EMPLOYEE
    employeeCode: typeof p.employeeCode === "number" ? p.employeeCode : undefined,
    employeeRole: typeof p.employeeRole === "string" ? p.employeeRole : undefined,
  }
}

function isAllowedCategory(v: unknown): v is AllowedCategory {
  return typeof v === "string" && (ALLOWED_CATEGORIES as readonly string[]).includes(v)
}

/**
 * Principal autenticado:
 * - admin/user => vem de prisma.user
 * - employee => vem de prisma.employee
 */
export type AuthPrincipal =
  | {
      kind: "admin" | "user"
      id: string
      role: UserRole
      name: string | null
      email: string
    }
  | {
      kind: "employee"
      id: string
      role: "EMPLOYEE"
      name: string
      employeeCode: number
      employeeRole: AllowedCategory // ⚠️ cargo do funcionário = categoria do case
      cpf?: string | null
    }

export async function getAuthPrincipal(req: Request): Promise<AuthPrincipal | null> {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const t = await verifyToken(token)

    // ===== funcionário
    if (t.kind === "employee") {
      if (!t.employeeRole || !isAllowedCategory(t.employeeRole)) return null

      const emp = await prisma.employee.findUnique({
        where: { id: t.userId },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          role: true,
          cpf: true,
          // status: true, // se existir no schema, dá pra validar ATIVO aqui
        },
      })

      if (!emp) return null
      if (!isAllowedCategory(emp.role)) return null

      return {
        kind: "employee",
        id: emp.id,
        role: "EMPLOYEE",
        name: emp.name,
        employeeCode: emp.employeeCode,
        employeeRole: emp.role,
        cpf: emp.cpf ?? null,
      }
    }

    // ===== admin/user
    const user = await prisma.user.findUnique({
      where: { id: t.userId },
      select: { id: true, name: true, email: true, role: true },
    })
    if (!user || !user.email) return null

    const r = String(user.role ?? "USER").toUpperCase()
    const role: UserRole = r === "ADMIN" ? "ADMIN" : "USER"
    const kind: "admin" | "user" = role === "ADMIN" ? "admin" : "user"

    return {
      kind,
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      role,
    }
  } catch {
    return null
  }
}

/**
 * (Opcional) helper de token para user/admin
 */
export async function signUserToken(user: { id: string; role: UserRole; kind?: "user" | "admin" }) {
  const kind = user.kind ?? (user.role === "ADMIN" ? "admin" : "user")
  return new SignJWT({ sub: user.id, role: user.role, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecretKey())
}
