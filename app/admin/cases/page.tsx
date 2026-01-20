// app/admin/cases/page.tsx
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

type CaseEventItem = {
  id: string
  status: CaseStatus
  message?: string | null
  photoUrl?: string | null
  createdAt: string
  employee?: { employeeCode: number; name: string | null } | null
  author?: { id: string; name: string | null; email: string } | null
}

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
  events?: CaseEventItem[]
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

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || ""
}

function formatDateBR(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR")
}

function formatDateTimeBR(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusChipClass(status: CaseStatus) {
  switch (status) {
    case "RECEBIDA":
      return "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900/50"
    case "EM_ANDAMENTO":
      return "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/50"
    case "AGUARDANDO_ATUALIZACAO":
      return "bg-purple-50 text-purple-700 ring-purple-200/60 dark:bg-purple-950/30 dark:text-purple-200 dark:ring-purple-900/50"
    case "CONCLUIDA":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/50"
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800"
  }
}

function dotClass(status: CaseStatus) {
  switch (status) {
    case "RECEBIDA":
      return "bg-blue-500"
    case "EM_ANDAMENTO":
      return "bg-amber-500"
    case "AGUARDANDO_ATUALIZACAO":
      return "bg-purple-500"
    case "CONCLUIDA":
      return "bg-emerald-500"
    default:
      return "bg-zinc-400"
  }
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

function getLastEvent(c: CaseItem) {
  if (!c.events?.length) return null
  const sorted = [...c.events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return sorted[0] ?? null
}

/** ✅ Foto do usuário (REPORT) — SEMPRE essa na coluna "Foto" */
function getReportPhotoUrl(c: CaseItem) {
  return c.photos?.find((p) => p.kind === "REPORT")?.url || null
}

/* =========================
   Modal de imagem fullscreen
========================= */
function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
      >
        ✕ Fechar
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="imagem"
        className="max-h-[95vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function ConfirmDeleteModal({
  protocol,
  onCancel,
  onConfirm,
  loading,
}: {
  protocol: string
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Excluir ocorrência?
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Você está prestes a excluir a ocorrência <b>{protocol}</b>. Essa ação é permanente.
        </p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================
   Timeline completa (conteúdo)
========================= */
function EventsTimeline({
  events,
  onOpenImage,
}: {
  events?: CaseEventItem[]
  onOpenImage: (src: string) => void
}) {
  if (!events || events.length === 0) {
    return <div className="text-xs text-zinc-500 dark:text-zinc-400">Sem atualizações.</div>
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="space-y-2">
      {sorted.map((ev) => (
        <div key={ev.id} className="relative pl-5">
          <div className="absolute left-[6px] top-0 h-full w-px bg-zinc-200 dark:bg-zinc-800" />
          <div
            className={`absolute left-1 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-950 ${dotClass(
              ev.status
            )}`}
          />

          <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{formatDateTimeBR(ev.createdAt)}</span>

                <span className="text-zinc-500 dark:text-zinc-400">•</span>

                <span className="inline-flex items-center rounded-full bg-zinc-50 px-2 py-0.5 font-semibold text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800">
                  IP {ev.employee?.employeeCode ?? "—"}
                </span>

                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1 ${statusChipClass(
                    ev.status
                  )}`}
                >
                  {STATUS_LABEL[ev.status] ?? ev.status}
                </span>
              </div>

              {ev.employee?.name ? (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {ev.employee.name}
                </span>
              ) : null}
            </div>

            {ev.message ? (
              <div className="mt-2 whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                {ev.message}
              </div>
            ) : null}

            {/* ✅ Foto do funcionário (atualização) fica aqui */}
            {ev.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ev.photoUrl}
                alt="foto atualização"
                onClick={() => onOpenImage(ev.photoUrl!)}
                className="mt-2 h-24 w-full cursor-zoom-in rounded-lg object-cover ring-1 ring-zinc-200 transition hover:opacity-80 dark:ring-zinc-800"
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

/* =========================
   Popover de Atualizações
   ✅ abre e só fecha no botão
========================= */
function UpdatesPopover({
  caseId,
  currentStatus,
  events,
  lastEvent,
  onOpenImage,
  openId,
  setOpenId,
}: {
  caseId: string
  currentStatus: CaseStatus
  events?: CaseEventItem[]
  lastEvent: CaseEventItem | null
  onOpenImage: (src: string) => void
  openId: string | null
  setOpenId: (id: string | null) => void
}) {
  const isOpen = openId === caseId
  const count = events?.length ?? 0

  function open() {
    if (!isOpen) setOpenId(caseId)
  }
  function close() {
    if (isOpen) setOpenId(null)
  }

  return (
    <div className="relative">
      <div className="min-w-[320px] max-w-[520px]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusChipClass(
              currentStatus
            )}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass(currentStatus)}`} />
            {STATUS_LABEL[currentStatus] ?? currentStatus}
          </span>

          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            • {count ? `${count} atualização(ões)` : "0 atualizações"}
          </span>

          {/* ✅ único toggle */}
          <button
            type="button"
            onClick={() => (isOpen ? close() : open())}
            className="ml-auto inline-flex items-center text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            {isOpen ? "Fechar histórico" : "Abrir histórico"}
          </button>
        </div>

        {/* Preview do último evento (clicar abre, mas não fecha) */}
        {lastEvent ? (
          <div
            className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
            onClick={() => open()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") open()
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{formatDateTimeBR(lastEvent.createdAt)}</span>
              <span className="text-zinc-500 dark:text-zinc-400">•</span>
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-semibold text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800">
                IP {lastEvent.employee?.employeeCode ?? "—"}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ring-1 ${statusChipClass(
                  lastEvent.status
                )}`}
              >
                {STATUS_LABEL[lastEvent.status] ?? lastEvent.status}
              </span>
            </div>

            {lastEvent.message ? (
              <div className="mt-2 line-clamp-2 whitespace-pre-line text-zinc-600 dark:text-zinc-300">
                {lastEvent.message}
              </div>
            ) : (
              <div className="mt-2 text-zinc-500 dark:text-zinc-400">Sem mensagem.</div>
            )}

            {lastEvent.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastEvent.photoUrl}
                alt="foto atualização"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpenImage(lastEvent.photoUrl!)
                }}
                className="mt-2 h-16 w-full cursor-zoom-in rounded-lg object-cover ring-1 ring-zinc-200 transition hover:opacity-80 dark:ring-zinc-800"
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Sem atualizações.</div>
        )}
      </div>

      {/* ✅ NÃO tem overlay pra fechar clicando fora */}
      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[520px] max-w-[80vw]">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Histórico completo • {count}
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[420px] overflow-auto p-4">
              <EventsTimeline events={events} onOpenImage={onOpenImage} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CasesPage() {
  const router = useRouter()

  const [items, setItems] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [category, setCategory] = useState<CaseCategory | "ALL">("ALL")
  const [status, setStatus] = useState<CaseStatus | "ALL">("ALL")

  const [openImage, setOpenImage] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<CaseItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [openUpdatesId, setOpenUpdatesId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const token = getToken()
      if (!token) {
        router.replace("/admin/auth?next=/cases")
        return
      }

      const res = await fetch("/api/cases", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      const data = await res.json()

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token")
        localStorage.removeItem("accessToken")
        setError(data?.error || "Sem acesso. Faça login novamente.")
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

  async function deleteCase(caseId: string) {
    const token = getToken()
    if (!token) {
      router.replace("/admin/auth?next=/cases")
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token")
        localStorage.removeItem("accessToken")
        alert(data?.error || "Sem acesso. Faça login novamente.")
        router.replace("/admin/auth?next=/cases")
        return
      }

      if (!res.ok) throw new Error(data?.error || "Erro ao excluir")

      setItems((prev) => prev.filter((x) => x.id !== caseId))
      setDeleteTarget(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao excluir"
      alert(msg)
    } finally {
      setDeleting(false)
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

      const last = getLastEvent(c)
      const hay = [
        c.protocol,
        c.address,
        c.description,
        c.user?.name ?? "",
        c.user?.email ?? "",
        CATEGORY_LABEL[c.category] ?? c.category,
        STATUS_LABEL[c.status] ?? c.status,
        last?.employee?.employeeCode ? String(last.employee.employeeCode) : "",
        last?.message ?? "",
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
              placeholder="Buscar por protocolo, endereço, usuário, IP, mensagem..."
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
                    <th className="px-4 py-3">Atualizações</th>
                    <th className="px-4 py-3">Endereço</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        Nenhum caso encontrado.
                      </td>
                    </tr>
                  )}

                  {filtered.map((c) => {
                    // ✅ Foto da coluna sempre é a do usuário (REPORT)
                    const reportPhoto = getReportPhotoUrl(c)
                    const last = getLastEvent(c)

                    return (
                      <tr
                        key={c.id}
                        className="border-t border-zinc-200 align-top dark:border-zinc-800"
                      >
                        <td className="px-4 py-3">
                          {reportPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={reportPhoto}
                              alt="foto do usuário"
                              onClick={() => setOpenImage(reportPhoto)}
                              className="h-12 w-12 cursor-zoom-in rounded-lg object-cover transition hover:opacity-80"
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
                          <UpdatesPopover
                            caseId={c.id}
                            currentStatus={c.status}
                            events={c.events}
                            lastEvent={last}
                            onOpenImage={(src) => setOpenImage(src)}
                            openId={openUpdatesId}
                            setOpenId={(id) => setOpenUpdatesId(id)}
                          />
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

                        <td className="px-4 py-3">{formatDateBR(c.createdAt)}</td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-zinc-200 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Dica: use a busca para achar por <b>IP</b>, <b>mensagem</b> ou <b>protocolo</b>.
            </div>
          </div>
        </div>
      </div>

      {openImage && <ImageModal src={openImage} onClose={() => setOpenImage(null)} />}

      {deleteTarget && (
        <ConfirmDeleteModal
          protocol={deleteTarget.protocol}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteCase(deleteTarget.id)}
        />
      )}
    </>
  )
}
