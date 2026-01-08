//app\api\admin\employees\route.ts
import { NextResponse } from "next/server"
import { prisma } from "lib/prisma"
import { EmployeeRole } from "@prisma/client"
import { hash } from "bcryptjs"
export const runtime = "nodejs"
function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "")
}

const ROLE_PREFIX: Record<EmployeeRole, number> = {
  ILUMINACAO_PUBLICA: 1,
  BURACO_NA_VIA: 2,
  COLETA_DE_LIXO: 3,
  OBSTRUCAO_DE_CALCADA: 4,
  VAZAMENTO_DE_AGUA: 5,
  OUTROS: 9,
}

function generateEmployeeCode(role: EmployeeRole) {
  const prefix = ROLE_PREFIX[role]
  const randomPart = Math.floor(100000 + Math.random() * 900000) // 6 dígitos
  return Number(`${prefix}${randomPart}`)
}

async function generateUniqueEmployeeCode(role: EmployeeRole) {
  // tenta algumas vezes evitar colisão
  for (let i = 0; i < 12; i++) {
    const code = generateEmployeeCode(role)
    const exists = await prisma.employee.findUnique({
      where: { employeeCode: code },
      select: { id: true },
    })
    if (!exists) return code
  }
  throw new Error("Não foi possível gerar um IP único. Tente novamente.")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const name = String(body?.name ?? "").trim()
    const cpf = onlyDigits(body?.cpf)
    const role = body?.role as EmployeeRole
    const password = String(body?.password ?? "")
    const confirmPassword = String(body?.confirmPassword ?? "")
    const employeeCodeFromClient =
      typeof body?.employeeCode === "number" ? body.employeeCode : null

    if (!name || !cpf || !role || !password || !confirmPassword) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 })
    }

    if (cpf.length !== 11) {
      return NextResponse.json({ error: "CPF inválido (precisa ter 11 dígitos)." }, { status: 400 })
    }

    // garante que o role é válido de verdade
    if (!Object.prototype.hasOwnProperty.call(ROLE_PREFIX, role)) {
      return NextResponse.json({ error: "Cargo inválido." }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Senha precisa ter no mínimo 6 caracteres." }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "As senhas não conferem." }, { status: 400 })
    }

    // CPF único
    const cpfExists = await prisma.employee.findUnique({
      where: { cpf },
      select: { id: true },
    })
    if (cpfExists) {
      return NextResponse.json({ error: "Já existe funcionário com esse CPF." }, { status: 409 })
    }

    // employeeCode: preferimos gerar no servidor (mais seguro)
    // mas se você quiser aceitar o do client, nós validamos e ainda garantimos unicidade
    let employeeCode: number

    if (employeeCodeFromClient) {
      const expectedPrefix = ROLE_PREFIX[role]
      const actualPrefix = Number(String(employeeCodeFromClient).slice(0, 1))
      if (actualPrefix !== expectedPrefix) {
        return NextResponse.json(
          { error: "IP inválido para o cargo selecionado. Gere novamente." },
          { status: 400 }
        )
      }

      const codeExists = await prisma.employee.findUnique({
        where: { employeeCode: employeeCodeFromClient },
        select: { id: true },
      })
      if (codeExists) {
        // se colidiu, gera outro automaticamente
        employeeCode = await generateUniqueEmployeeCode(role)
      } else {
        employeeCode = employeeCodeFromClient
      }
    } else {
      employeeCode = await generateUniqueEmployeeCode(role)
    }

    const passwordHash = await hash(password, 10)

    const employee = await prisma.employee.create({
      data: {
        name,
        cpf,
        role,
        employeeCode,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        role: true,
        employeeCode: true,
        createdAt: true,
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro inesperado." }, { status: 500 })
  }
}
