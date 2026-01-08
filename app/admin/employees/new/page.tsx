"use client"

import { useEffect, useMemo, useState } from "react"
import Header from "app/components/Header"

type EmployeeRole =
  | "ILUMINACAO_PUBLICA"
  | "BURACO_NA_VIA"
  | "COLETA_DE_LIXO"
  | "OBSTRUCAO_DE_CALCADA"
  | "VAZAMENTO_DE_AGUA"
  | "OUTROS"

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ILUMINACAO_PUBLICA: "Iluminação Pública",
  BURACO_NA_VIA: "Buraco na Via",
  COLETA_DE_LIXO: "Coleta de Lixo",
  OBSTRUCAO_DE_CALCADA: "Obstrução de Calçada",
  VAZAMENTO_DE_AGUA: "Vazamento de Água",
  OUTROS: "Outros",
}

const ROLE_PREFIX: Record<EmployeeRole, number> = {
  ILUMINACAO_PUBLICA: 1,
  BURACO_NA_VIA: 2,
  COLETA_DE_LIXO: 3,
  OBSTRUCAO_DE_CALCADA: 4,
  VAZAMENTO_DE_AGUA: 5,
  OUTROS: 9,
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "")
}

function formatCPF(value: string) {
  const v = onlyDigits(value).slice(0, 11)
  const p1 = v.slice(0, 3)
  const p2 = v.slice(3, 6)
  const p3 = v.slice(6, 9)
  const p4 = v.slice(9, 11)
  if (v.length <= 3) return p1
  if (v.length <= 6) return `${p1}.${p2}`
  if (v.length <= 9) return `${p1}.${p2}.${p3}`
  return `${p1}.${p2}.${p3}-${p4}`
}

// Gera: [prefixo do cargo][6 dígitos aleatórios] -> ex: 1xxxxxx
function generateEmployeeCode(role: EmployeeRole) {
  const prefix = ROLE_PREFIX[role]
  const randomPart = Math.floor(100000 + Math.random() * 900000) // 6 dígitos
  return Number(`${prefix}${randomPart}`)
}

export default function NewEmployeePage() {
  const [role, setRole] = useState<EmployeeRole>("ILUMINACAO_PUBLICA")
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")

  // ✅ hydration-safe: só gera no client depois do mount
  const [employeeCode, setEmployeeCode] = useState<number | null>(null)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ✅ gera 1x quando a page monta (evita mismatch SSR/Client)
  useEffect(() => {
    setEmployeeCode(generateEmployeeCode(role))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (onlyDigits(cpf).length !== 11) return false
    if (!password || password.length < 6) return false
    if (password !== confirmPassword) return false
    if (!employeeCode) return false
    return true
  }, [name, cpf, password, confirmPassword, employeeCode])

  function regenerateCode(nextRole?: EmployeeRole) {
    const r = nextRole ?? role
    setEmployeeCode(generateEmployeeCode(r))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!employeeCode) {
      setError("Não foi possível gerar o IP. Clique em 'Gerar outro'.")
      return
    }

    if (!canSubmit) {
      setError("Preencha tudo corretamente (CPF válido e senha confirmada).")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          cpf: onlyDigits(cpf),
          role,
          employeeCode, // IP gerado
          password,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao criar funcionário")
      }

      setSuccess(`Funcionário criado! IP: ${data.employeeCode ?? employeeCode}`)

      // limpa campos (mantém cargo)
      setName("")
      setCpf("")
      setPassword("")
      setConfirmPassword("")
      regenerateCode()
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError("Erro inesperado ao criar funcionário")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-zinc-50 px-6 py-10 pt-16 dark:bg-black">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Cadastrar Funcionário
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              O IP (código) é gerado automaticamente com base no cargo.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {/* Cargo */}
            <label className="block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Cargo
              </span>
              <select
                value={role}
                onChange={(e) => {
                  const nextRole = e.target.value as EmployeeRole
                  setRole(nextRole)
                  setEmployeeCode(generateEmployeeCode(nextRole))
                }}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
              >
                {Object.keys(ROLE_LABEL).map((key) => (
                  <option key={key} value={key}>
                    {ROLE_LABEL[key as EmployeeRole]}
                  </option>
                ))}
              </select>
            </label>

            {/* Nome */}
            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Nome completo
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vinicius Semola Arruda"
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
                required
              />
            </label>

            {/* CPF */}
            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                CPF
              </span>
              <input
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
                inputMode="numeric"
                required
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Digite apenas números (a máscara é automática).
              </p>
            </label>

            {/* IP (employeeCode) */}
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    IP do Funcionário (gerado)
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    {employeeCode ?? "Gerando..."}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Começa com {ROLE_PREFIX[role]} por causa do cargo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => regenerateCode()}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Gerar outro
                </button>
              </div>
            </div>

            {/* Senha */}
            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
                required
              />
            </label>

            {/* Confirmar senha */}
            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Confirmar senha
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-700"
                required
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">As senhas não conferem.</p>
              )}
            </label>

            {/* Alerts */}
            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                {success}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {loading ? "Criando..." : "Criar funcionário"}
            </button>

            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Obs: o CPF precisa ter 11 dígitos. A senha precisa ter no mínimo 6 caracteres.
            </p>
          </form>
        </div>
      </div>
    </>
  )
}
