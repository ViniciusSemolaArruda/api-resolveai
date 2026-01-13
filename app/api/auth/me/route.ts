// app/api/auth/me/route.ts
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "../../../../lib/prisma"
import type { EmployeeRole } from "@prisma/client"

export const runtime = "nodejs"

type JwtRole = "USER" | "ADMIN" | "EMPLOYEE"

type JwtPayload = {
  sub?: string
  role?: JwtRole
  employeeRole?: EmployeeRole | null
}

function getJwtSecret() {
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

  // se alguém mandou "Bearer xxx" por engano
  t = t.replace(/^Bearer\s+/i, "").trim()

  return t
}

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const m = h.match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]?.trim()
  return token ? cleanToken(token) : null
}

function errorReason(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  if (err && typeof err === "object") {
    const e = err as { code?: unknown; name?: unknown; message?: unknown }
    return (
      (typeof e.code === "string" && e.code) ||
      (typeof e.name === "string" && e.name) ||
      (typeof e.message === "string" && e.message) ||
      "unknown"
    )
  }
  return "unknown"
}

export async function GET(req: Request) {
  try {
    const token = getBearer(req)
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sem token",
          hasAuthHeader: !!(req.headers.get("authorization") || req.headers.get("Authorization")),
        },
        { status: 401 }
      )
    }

    const { payload } = await jwtVerify(token, getJwtSecret())
    const p = payload as unknown as JwtPayload

    const userId = String(p.sub || "").trim()
    const role = (p.role ?? "USER") as JwtRole
    const employeeRoleFromToken = (p.employeeRole ?? null) as EmployeeRole | null

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Token sem sub (userId)" }, { status: 401 })
    }

    // ✅ FUNCIONÁRIO: busca na tabela employee
    if (role === "EMPLOYEE") {
      const employee = await prisma.employee.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          cpf: true,
          employeeCode: true,
          role: true, // EmployeeRole (do prisma)
          isActive: true,
        },
      })

      if (!employee) {
        return NextResponse.json(
          {
            ok: false,
            error: "Funcionário não existe (id do token não está no banco)",
            userIdFromToken: userId,
          },
          { status: 401 }
        )
      }

      if (!employee.isActive) {
        return NextResponse.json(
          {
            ok: false,
            error: "Funcionário desativado",
            userIdFromToken: userId,
          },
          { status: 403 }
        )
      }

      // se o token não veio com employeeRole, usa o do banco
      const finalEmployeeRole = employeeRoleFromToken ?? employee.role

      return NextResponse.json(
        {
          ok: true,
          actor: {
            kind: "EMPLOYEE",
            id: employee.id,
            name: employee.name ?? null,
            cpf: employee.cpf,
            employeeCode: employee.employeeCode,
            role: "EMPLOYEE" as const,
            employeeRole: finalEmployeeRole,
            isActive: employee.isActive,
          },
        },
        { status: 200 }
      )
    }

    // ✅ USER/ADMIN: busca na tabela user (igual antes)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Usuário não existe (id do token não está no banco)",
          userIdFromToken: userId,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        actor: {
          kind: "USER",
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: (user.role === "ADMIN" ? "ADMIN" : "USER") as "ADMIN" | "USER",
        },
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error("ME verify failed:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Token inválido",
        reason: errorReason(err),
      },
      { status: 401 }
    )
  }
}
