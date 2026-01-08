// app/admin/auth/AdminAuthClient.tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

function sanitizeNext(next: string | null) {
  // ✅ dashboard é "/"
  const fallback = "/"

  const raw = (next ?? "").trim()
  if (!raw) return fallback

  // ✅ só aceita rotas internas
  if (!raw.startsWith("/")) return fallback
  if (raw.startsWith("//")) return fallback

  // ✅ evita mandar pra rota inexistente antiga
  if (raw === "/cases" || raw.startsWith("/cases/")) return "/admin/cases"

  return raw
}

export default function AdminAuthClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const next = useMemo(() => sanitizeNext(searchParams.get("next")), [searchParams])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erro ao entrar")

      if (data?.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("accessToken", data.token)
      }

      if (data?.user) {
        localStorage.setItem("admin_user", JSON.stringify(data.user))
      }

      router.replace(next) // ✅ agora vai pra "/" por padrão
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-lg shadow"
      >
        <h1 className="text-xl font-bold mb-4">Acesso Administrativo</h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mb-3 w-full rounded border px-3 py-2"
          autoComplete="email"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="mb-3 w-full rounded border px-3 py-2"
          autoComplete="current-password"
          required
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  )
}
