// lib/auth.ts
import { jwtVerify, SignJWT } from "jose"
import { prisma } from "./prisma"
import type { EmployeeRole } from "@prisma/client"

export type JwtRole = "USER" | "ADMIN" | "EMPLOYEE"

/** Categorias do model Case */
export type AllowedCategory =
  | "ILUMINACAO_PUBLICA"
  | "BURACO_NA_VIA"
  | "COLETA_DE_LIXO"
  | "OBSTRUCAO_DE_CALCADA"
  | "VAZAMENTO_DE_AGUA"
  | "OUTROS"

/** Quem está autenticado (pode ser User ou Employee) */
export type AuthActor =
  | {
      kind: "USER"
      id: string
      name: string | null
      email: string | null
      role: "USER" | "ADMIN"
    }
  | {
      kind: "EMPLOYEE"
      id: string
      name: string | null
      employeeCode: number
      cpf: string
      employeeRole: EmployeeRole
      isActive: boolean
      role: "EMPLOYEE"
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

  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }

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
    .setSubject(user.id)
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

/**
 * ✅ Resolve o "ator" autenticado:
 * - USER/ADMIN -> prisma.user
 * - EMPLOYEE   -> prisma.employee
 */
export async function getAuthActor(req: Request): Promise<AuthActor | null> {
  const token = getBearerToken(req)
  if (!token) return null

  try {
    const { userId, role, employeeRole } = await verifyToken(token)

    // EMPLOYEE -> tabela employee
    if (role === "EMPLOYEE") {
      const e = await prisma.employee.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          cpf: true,
          role: true, // EmployeeRole do Prisma
          isActive: true,
        },
      })

      if (!e) return null
      if (!e.isActive) return null

      const finalEmpRole: EmployeeRole = employeeRole ?? e.role

      return {
        kind: "EMPLOYEE",
        id: e.id,
        name: e.name ?? null,
        employeeCode: e.employeeCode,
        cpf: e.cpf,
        employeeRole: finalEmpRole,
        isActive: e.isActive,
        role: "EMPLOYEE",
      }
    }

    // USER/ADMIN -> tabela user
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })
    if (!u) return null

    const dbRole = (u.role as JwtRole) ?? role
    const finalRole: "USER" | "ADMIN" = dbRole === "ADMIN" ? "ADMIN" : "USER"

    return {
      kind: "USER",
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      role: finalRole,
    }
  } catch (err) {
    console.error("getAuthActor failed:", err)
    return null
  }
}

/** Atalho se você quiser exigir login */
export async function requireAuthActor(req: Request): Promise<AuthActor> {
  const a = await getAuthActor(req)
  if (!a) throw new Error("UNAUTHORIZED")
  return a
}

/**
 * ✅ Mapeia cargo do funcionário -> categorias que ele pode ver
 *
 * Como no seu banco o cargo parece ser algo tipo "ILUMINACAO_PUBLICA",
 * então a permissão pode ser 1:1 com a categoria.
 */
export function allowedCategoriesForEmployee(role: EmployeeRole): AllowedCategory[] {
  const r = String(role)

  // ✅ Se o enum do Prisma for igual às categorias, isso resolve tudo:
  if (
    r === "ILUMINACAO_PUBLICA" ||
    r === "BURACO_NA_VIA" ||
    r === "COLETA_DE_LIXO" ||
    r === "OBSTRUCAO_DE_CALCADA" ||
    r === "VAZAMENTO_DE_AGUA" ||
    r === "OUTROS"
  ) {
    return [r as AllowedCategory]
  }

  // ✅ Se existir um cargo tipo ADMIN no enum do Prisma:
  if (r === "ADMIN") {
    return [
      "ILUMINACAO_PUBLICA",
      "BURACO_NA_VIA",
      "COLETA_DE_LIXO",
      "OBSTRUCAO_DE_CALCADA",
      "VAZAMENTO_DE_AGUA",
      "OUTROS",
    ]
  }

  // fallback seguro
  return []
}

export function isAdminActor(a: AuthActor) {
  return a.kind === "USER" && a.role === "ADMIN"
}
