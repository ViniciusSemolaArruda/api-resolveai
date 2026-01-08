//app\admin\employees\EmployeeTable.tsx
"use client"

import { useState } from "react"

type EmployeeRow = {
  id: string
  employeeCode: number
  name: string
  cpf: string
  role: string
  roleLabel: string
  isActive: boolean
  createdAt: Date
}

export default function EmployeeTable({ employees }: { employees: EmployeeRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleActive(id: string) {
    setError(null)
    setLoadingId(id)

    try {
      const res = await fetch(`/api/admin/employees/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao alterar status")

      // jeito simples: recarrega a página para atualizar lista
      window.location.reload()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError("Erro inesperado")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Total: <span className="font-semibold">{employees.length}</span>
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <tr>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((e) => (
              <tr
                key={e.id}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-semibold">{e.employeeCode}</td>
                <td className="px-4 py-3">{e.name}</td>
                <td className="px-4 py-3">{e.cpf}</td>
                <td className="px-4 py-3">{e.roleLabel}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                      e.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {e.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {new Date(e.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(e.id)}
                    disabled={loadingId === e.id}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {loadingId === e.id
                      ? "Processando..."
                      : e.isActive
                      ? "Desativar"
                      : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}

            {employees.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                >
                  Nenhum funcionário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
