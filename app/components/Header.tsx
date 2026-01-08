"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const baseMobile =
    "rounded-lg px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
  const baseDesktop = "hover:text-black dark:hover:text-white"

  const linkClass = mobile ? baseMobile : baseDesktop

  return (
    <nav
      className={cx(
        mobile
          ? "flex flex-col gap-2"
          : "hidden md:flex items-center gap-6 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      )}
    >
      <Link href="/" className={linkClass}>
        Dashboard
      </Link>

      <Link href="/admin/employees" className={linkClass}>
        Funcionários
      </Link>

      <Link href="/admin/employees/new" className={linkClass}>
        Cadastrar Funcionário
      </Link>

      <Link href="/admin/cases" className={linkClass}>
        Casos
      </Link>
    </nav>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // fecha menu ao trocar rota
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  // ESC fecha menu
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  // trava scroll no mobile
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      })
    } catch {}

    // limpa storage
    localStorage.removeItem("token")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("admin_user")

    router.replace("/admin/auth")
    router.refresh()
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            ⚙️
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Painel de Gestão
          </span>
        </div>

        {/* NAV DESKTOP */}
        <NavLinks />

        {/* AÇÕES DESKTOP */}
        <div className="hidden md:flex">
          <button
            onClick={handleLogout}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sair
          </button>
        </div>

        {/* BOTÃO MOBILE */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden rounded-lg border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* DRAWER MOBILE */}
      {open && (
        <div className="md:hidden">
          <button
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div className="fixed right-0 top-16 z-50 h-[calc(100vh-4rem)] w-full max-w-sm bg-white p-4 shadow-xl dark:bg-black">
            <NavLinks mobile />

            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button
                onClick={handleLogout}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
