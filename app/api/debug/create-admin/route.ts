// app/api/debug/create-admin/route.ts
import { NextResponse } from "next/server"
import { prisma } from "lib/prisma"
import { hash } from "bcryptjs"

export const runtime = "nodejs"

export async function POST() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL ou ADMIN_PASSWORD não definidos no .env.local" },
      { status: 500 }
    )
  }

  const passwordHash = await hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      passwordHash, // ✅ FORÇA atualizar a senha
    },
    create: {
      email,
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
    },
  })

  return NextResponse.json({ ok: true, email, id: admin.id })
}
