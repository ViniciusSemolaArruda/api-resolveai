import { NextResponse } from "next/server"
import { prisma } from "lib/prisma"
import { compare } from "bcryptjs"

export const runtime = "nodejs"

export async function GET() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_EMAIL ou ADMIN_PASSWORD ausentes no env" },
      { status: 500 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true },
  })

  if (!user) {
    return NextResponse.json({ ok: false, error: "Admin não existe no banco" }, { status: 404 })
  }

  const match = await compare(password, user.passwordHash)

  return NextResponse.json({
    ok: true,
    email,
    role: user.role,
    passwordMatchesEnv: match,
    envPasswordLength: password.length,
  })
}
