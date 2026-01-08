"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Header from "../../components/Header"

export default function EmployeeLoginPage() {
  const router = useRouter()

  const [employeeCode, setEmployeeCode] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: Number(employeeCode),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao entrar")
      }

      router.push("/employee/dashboard")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Erro inesperado ao tentar entrar")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <div className="min-h-screen pt-16 flex items-center justify-center bg-zinc-100">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white p-6 rounded-lg shadow"
        >
          <h1 className="text-xl font-bold mb-4">Login do Funcionário</h1>

          <label className="block mb-3">
            <span className="text-sm">IP do Funcionário</span>
            <input
              type="number"
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>

          {error && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </>
  )
}
