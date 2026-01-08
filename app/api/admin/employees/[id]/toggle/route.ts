import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "lib/prisma"
export const runtime = "nodejs"

export async function PATCH(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "ID ausente" }, { status: 400 })
    }

    const current = await prisma.employee.findUnique({
      where: { id },
      select: { isActive: true },
    })

    if (!current) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 }
      )
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: { id: true, isActive: true },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro inesperado"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
