//proxy.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/admin/auth", // login admin liberado
  "/employee/login",
  "/api",
  "/_next",
  "/favicon.ico",
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

// ✅ evita redirecionar para rota inexistente por links antigos
function normalizeNext(pathname: string) {
  // se algum lugar ainda manda pra /cases, corrige para /admin/cases
  if (pathname === "/cases" || pathname.startsWith("/cases/")) {
    return pathname.replace(/^\/cases/, "/admin/cases")
  }
  return pathname
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 🔓 libera rotas públicas
  if (isPublicPath(pathname)) return NextResponse.next()

  // ✅ se alguém acessar /cases (antigo), manda pro lugar certo
  if (pathname === "/cases" || pathname.startsWith("/cases/")) {
    const url = req.nextUrl.clone()
    url.pathname = normalizeNext(pathname)
    return NextResponse.redirect(url)
  }

  // 🔒 protege apenas área admin (recomendado)
  // (se você quiser proteger "/" também, deixe o pathname === "/")
  if (pathname.startsWith("/admin")) {
    const adminSession = req.cookies.get("admin_session")?.value

    if (!adminSession) {
      const url = req.nextUrl.clone()
      url.pathname = "/admin/auth"
      url.searchParams.set("next", normalizeNext(pathname))
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}