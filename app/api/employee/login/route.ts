import { NextResponse } from "next/server"
import { prisma } from "lib/prisma"
import { compare } from "bcryptjs"

export async function POST(req: Request) {
  const { employeeCode, password } = await req.json()

  if (!employeeCode || !password) {
    return NextResponse.json(
      { error: "Dados obrigatórios" },
      { status: 400 }
    )
  }

  const employee = await prisma.employee.findUnique({
    where: { employeeCode },
  })

  if (!employee || !employee.isActive) {
    return NextResponse.json(
      { error: "Funcionário não encontrado ou inativo" },
      { status: 401 }
    )
  }

  const passwordValid = await compare(password, employee.passwordHash)

  if (!passwordValid) {
    return NextResponse.json(
      { error: "IP ou senha inválidos" },
      { status: 401 }
    )
  }

  /**
   * ⚠️ AQUI é onde depois entra JWT ou cookie
   * por enquanto vamos só confirmar login
   */

  return NextResponse.json({
    id: employee.id,
    name: employee.name,
    role: employee.role,
    employeeCode: employee.employeeCode,
  })
}
