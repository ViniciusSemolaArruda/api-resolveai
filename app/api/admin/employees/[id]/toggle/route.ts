import { NextResponse } from "next/server"
import { prisma } from "lib/prisma"

export const runtime = "nodejs"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    const current = await prisma.employee.findUnique({
      where: { id },
      select: { isActive: true },
    })

    if (!current) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: {
        id: true,
        isActive: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro inesperado" }, { status: 500 })
  }
}
