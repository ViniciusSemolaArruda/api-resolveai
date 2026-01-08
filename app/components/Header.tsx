"use client"

import Link from "next/link"

export default function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* LOGO / TÍTULO */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
            ⚙️
          </div>

          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Painel de Gestão
          </span>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-700 dark:text-zinc-300 md:flex">
          <Link href="/" className="hover:text-black dark:hover:text-white">
            Dashboard
          </Link>

          <Link
            href="/admin/employees"
            className="hover:text-black dark:hover:text-white"
          >
            Funcionários
          </Link>

          <Link
            href="/admin/employees/new"
            className="hover:text-black dark:hover:text-white"
          >
            Cadastrar Funcionário
          </Link>

          <Link href="/admin/cases" className="hover:text-black dark:hover:text-white">
  Casos
</Link>

        </nav>

        {/* AÇÕES */}
        <div className="flex items-center gap-3">
          <Link
            href="/employee/login"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Login Funcionário
          </Link>
        </div>
      </div>
    </header>
  )
}
