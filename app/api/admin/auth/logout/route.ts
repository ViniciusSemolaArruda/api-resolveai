import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST() {
  const res = NextResponse.json({ ok: true })

  // remove cookie usado pelo middleware
  res.cookies.set("admin_session", "", {
    path: "/",
    maxAge: 0,
  })

  return res
}
