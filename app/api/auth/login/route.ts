// app/api/auth/login/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { prisma } from "../../../../lib/prisma"

export const runtime = "nodejs"

const ADMIN_EMAIL = "admin@gmail.com"
const ADMIN_PASSWORD = "admin"

function getJwtSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET ausente no .env.local")
  return new TextEncoder().encode(s)
}

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "")
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "Erro desconhecido"
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string // ⚠️ aqui agora pode ser EMAIL ou IP
      password?: string
    }

    const identifierRaw = String(body?.email ?? "").trim()
    const password = String(body?.password ?? "")

    if (!identifierRaw || !password) {
      return NextResponse.json({ error: "Email/IP e senha são obrigatórios" }, { status: 400 })
    }

    const identifierLower = identifierRaw.toLowerCase()

    /**
     * ============================
     * LOGIN ADMIN FIXO (opcional)
     * ============================
     */
    if (identifierLower === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = await new SignJWT({
        sub: "admin",
        role: "ADMIN",
        kind: "admin",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(getJwtSecret())

      return NextResponse.json({
        kind: "admin",
        user: {
          id: "admin",
          name: "Administrador",
          email: ADMIN_EMAIL,
          role: "ADMIN",
        },
        token,
      })
    }

    /**
     * ============================
     * SE TEM @ -> LOGIN EMAIL (usuário normal)
     * ============================
     */
    if (identifierRaw.includes("@")) {
      const email = identifierLower

      const userDb = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          passwordHash: true,
        },
      })

      if (!userDb || !userDb.passwordHash) {
        return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
      }

      const ok = await bcrypt.compare(password, userDb.passwordHash)
      if (!ok) {
        return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
      }

      const token = await new SignJWT({
        sub: userDb.id,
        role: userDb.role,
        kind: "user",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(getJwtSecret())

      return NextResponse.json({
        kind: "user",
        user: {
          id: userDb.id,
          name: userDb.name,
          email: userDb.email,
          role: userDb.role,
        },
        token,
      })
    }

    /**
     * ============================
     * SENÃO -> LOGIN IP (funcionário)
     * ============================
     */
    const ipDigits = onlyDigits(identifierRaw)
    if (!ipDigits) {
      return NextResponse.json({ error: "Informe um email ou IP válido." }, { status: 400 })
    }

    const employeeCode = Number(ipDigits)
    if (!Number.isFinite(employeeCode)) {
      return NextResponse.json({ error: "IP inválido." }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeCode },
      select: {
        id: true,
        name: true,
        cpf: true,
        role: true,
        employeeCode: true,
        passwordHash: true,
        // status: true, // se existir no schema
      },
    })

    if (!employee || !employee.passwordHash) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    // se você tiver status no schema, descomenta e usa:
    // if (employee.status !== "ATIVO") {
    //   return NextResponse.json({ error: "Funcionário inativo." }, { status: 403 })
    // }

    const ok = await bcrypt.compare(password, employee.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    const token = await new SignJWT({
      sub: employee.id,
      role: "EMPLOYEE",
      kind: "employee",
      employeeCode: employee.employeeCode,
      employeeRole: employee.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(getJwtSecret())

    return NextResponse.json({
      kind: "employee",
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        employeeCode: employee.employeeCode,
      },
      token,
    })
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    return NextResponse.json({ error: "Erro ao logar", message }, { status: 500 })
  }
}
