"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Header from "./components/Header"
import { ClipboardList, ShieldCheck, Users, ArrowRight, RefreshCw, MapPin } from "lucide-react"

function QuickLink({
  title,
  desc,
  href,
  icon,
}: {
  title: string
  desc: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100">
            {icon}
          </div>
          <div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
          </div>
        </div>

        <ArrowRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
      </div>
    </Link>
  )
}

export default function Home() {
  const router = useRouter()

  return (
    <>
      <Header />

      <div className="min-h-screen bg-zinc-50 pt-16 font-sans dark:bg-black">
        <main className="mx-auto w-full max-w-7xl px-6 py-10">
          {/* Top */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                <ShieldCheck className="h-4 w-4" />
                Painel Administrativo
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Dashboard • Gestão de Ocorrências
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Acesse rapidamente as áreas de gestão e acompanhe as ocorrências cadastradas.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/admin/cases"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <ClipboardList className="h-4 w-4" />
                Ver casos
              </Link>

              <button
                type="button"
                onClick={() => router.refresh()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Acesso rápido */}
          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Acesso rápido</h2>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Admin</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <QuickLink
                href="/admin/cases"
                title="Casos (Ocorrências)"
                desc="Ver, filtrar e acompanhar atualizações."
                icon={<ClipboardList className="h-5 w-5" />}
              />

              <QuickLink
                href="/admin/employees"
                title="Funcionários"
                desc="Gerenciar equipe, cargos e permissões."
                icon={<Users className="h-5 w-5" />}
              />

              <QuickLink
                href="/admin"
                title="Admin"
                desc="Acessar configurações e áreas administrativas."
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Atividades recentes (sem “em breve”) */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Atividades recentes
                </h3>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { title: "Caso atualizado", sub: "Status alterado e mensagem adicionada", when: "recente" },
                  { title: "Novo caso registrado", sub: "Ocorrência enviada pelo usuário", when: "recente" },
                  { title: "Caso concluído", sub: "Finalizado pela equipe responsável", when: "recente" },
                ].map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {a.title}
                      </div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.sub}</div>
                    </div>
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {a.when}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Link
                  href="/admin/cases"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                >
                  Ver casos <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Cobertura por região com imagem */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Cobertura por região
                </h3>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  Mapa
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30">
                <Image
                  src="/mapa.png"
                  alt="Mapa de cobertura por região"
                  width={1200}
                  height={800}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
