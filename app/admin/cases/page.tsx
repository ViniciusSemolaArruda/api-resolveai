//app\admin\cases\page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "app/components/Header"

type CaseStatus = "RECEBIDA" | "EM_ANDAMENTO" | "AGUARDANDO_ATUALIZACAO" | "CONCLUIDA"
type CaseCategory =
  | "ILUMINACAO_PUBLICA"
  | "BURACO_NA_VIA"
  | "COLETA_DE_LIXO"
  | "OBSTRUCAO_DE_CALCADA"
  | "VAZAMENTO_DE_AGUA"
  | "OUTROS"

type CaseItem = {
  id: string
  protocol: string
  category: CaseCategory
  status: CaseStatus
  description: string
  address: string
  createdAt: string
  user?: { id: string; name: string | null; email: string } | null
  photos?: { id: string; url: string; kind: "REPORT" | "UPDATE"; createdAt: string }[]
}

const CATEGORY_LABEL: Record<CaseCategory, string> = {
  ILUMINACAO_PUBLICA: "Iluminação Pública",
  BURACO_NA_VIA: "Buraco na Via",
  COLETA_DE_LIXO: "Coleta de Lixo",
  OBSTRUCAO_DE_CALCADA: "Obstrução de Calçada",
  VAZAMENTO_DE_AGUA: "Vazamento de Água",
  OUTROS: "Outros",
}

const STATUS_LABEL: Record<CaseStatus, string> = {
  RECEBIDA: "Recebida",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_ATUALIZACAO: "Aguardando atualização",
  CONCLUIDA: "Concluída",
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as CaseCategory[]
const ALL_STATUSES = Object.keys(STATUS_LABEL) as CaseStatus[]

function isCaseCategory(v: string): v is CaseCategory {
  return (ALL_CATEGORIES as string[]).includes(v)
}

function isCaseStatus(v: string): v is CaseStatus {
  return (ALL_STATUSES as string[]).includes(v)
}

function statusBadgeClass(s: CaseStatus) {
  switch (s) {
    case "RECEBIDA":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200"
    case "EM_ANDAMENTO":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
    case "AGUARDANDO_ATUALIZACAO":
      return "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-200"
    case "CONCLUIDA":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
  }
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || ""
}

export default function CasesPage() {
  const router = useRouter()

  const [items, setItems] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [category, setCategory] = useState<CaseCategory | "ALL">("ALL")
  const [status, setStatus] = useState<CaseStatus | "ALL">("ALL")

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const token = getToken()
      if (!token) {
        // ✅ manda pro login (ajuste o caminho do seu login admin se for outro)
        router.replace("/admin/auth?next=/cases")
        return
      }

      const res = await fetch("/api/cases", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const data = await res.json()

      if (res.status === 401 || res.status === 403) {
        // token inválido/expirado ou sem permissão
        localStorage.removeItem("token")
        localStorage.removeItem("accessToken")
        setError(data?.error || "Sem acesso. Faça login novamente como ADMIN.")
        router.replace("/admin/auth?next=/cases")
        return
      }

      if (!res.ok) throw new Error(data?.error || "Erro ao carregar casos")

      setItems(Array.isArray(data) ? (data as CaseItem[]) : [])
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError("Erro inesperado ao carregar")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    return items.filter((c) => {
      if (category !== "ALL" && c.category !== category) return false
      if (status !== "ALL" && c.status !== status) return false

      if (!query) return true

      const hay = [
        c.protocol,
        c.address,
        c.description,
        c.user?.name ?? "",
        c.user?.email ?? "",
        CATEGORY_LABEL[c.category] ?? c.category,
        STATUS_LABEL[c.status] ?? c.status,
      ]
        .join(" ")
        .toLowerCase()

      return hay.includes(query)
    })
  }, [items, q, category, status])

  return (
    <>
      <Header />

      <div className="min-h-screen bg-zinc-50 px-6 py-10 pt-16 dark:bg-black">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Problemas (Casos)
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Listagem dos últimos casos cadastrados (até 100).
              </p>
            </div>

            <button
              onClick={load}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Atualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por protocolo, endereço, usuário..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700 md:col-span-2"
            />

            <select
              value={category}
              onChange={(e) => {
                const v = e.target.value
                if (v === "ALL") setCategory("ALL")
                else if (isCaseCategory(v)) setCategory(v)
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
            >
              <option value="ALL">Todas as categorias</option>
              {ALL_CATEGORIES.map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABEL[k]}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                const v = e.target.value
                if (v === "ALL") setStatus("ALL")
                else if (isCaseStatus(v)) setStatus(v)
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
            >
              <option value="ALL">Todos os status</option>
              {ALL_STATUSES.map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Conteúdo */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Mostrando: <span className="font-semibold">{filtered.length}</span>
              </p>
              {loading && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando…</span>
              )}
            </div>

            {error && (
              <div className="p-4">
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Foto</th>
                    <th className="px-4 py-3">Protocolo</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Endereço</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        Nenhum caso encontrado.
                      </td>
                    </tr>
                  )}

                  {filtered.map((c) => {
                    const photo = c.photos?.[0]?.url
                    return (
                      <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                        <td className="px-4 py-3">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt="foto"
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold">{c.protocol}</td>

                        <td className="px-4 py-3">{CATEGORY_LABEL[c.category] ?? c.category}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                              c.status
                            )}`}
                          >
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[360px] truncate">{c.address}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-zinc-900 dark:text-zinc-100">
                            {c.user?.name ?? "—"}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {c.user?.email ?? ""}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
