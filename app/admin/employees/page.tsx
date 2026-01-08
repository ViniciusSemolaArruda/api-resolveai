import Header from "app/components/Header"
import { prisma } from "lib/prisma"
import EmployeeTable from "./EmployeeTable"

export const dynamic = "force-dynamic"

function roleLabel(role: string) {
  const map: Record<string, string> = {
    ILUMINACAO_PUBLICA: "Iluminação Pública",
    BURACO_NA_VIA: "Buraco na Via",
    COLETA_DE_LIXO: "Coleta de Lixo",
    OBSTRUCAO_DE_CALCADA: "Obstrução de Calçada",
    VAZAMENTO_DE_AGUA: "Vazamento de Água",
    OUTROS: "Outros",
  }
  return map[role] ?? role
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const q = (searchParams?.q ?? "").trim()

  const employees = await prisma.employee.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { cpf: { contains: q } },
            ...(Number.isFinite(Number(q))
              ? [{ employeeCode: Number(q) }]
              : []),
          ],
        }
      : undefined,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      employeeCode: true,
      name: true,
      cpf: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  const rows = employees.map((e) => ({
    ...e,
    roleLabel: roleLabel(e.role),
  }))

  return (
    <>
      <Header />

      <div className="min-h-screen bg-zinc-50 px-6 py-10 pt-16 dark:bg-black">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Funcionários
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Lista de funcionários cadastrados (IP, cargo e status).
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/admin/employees/new"
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-black"
              >
                + Cadastrar Funcionário
              </a>
            </div>
          </div>

          {/* Busca */}
          <form
            className="mb-4 flex gap-2"
            action="/admin/employees"
            method="GET"
          >
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome, CPF ou IP..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
            />
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Buscar
            </button>
          </form>

          <EmployeeTable employees={rows} />
        </div>
      </div>
    </>
  )
}
