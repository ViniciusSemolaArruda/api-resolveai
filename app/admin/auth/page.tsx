// app/admin/auth/page.tsx
import { Suspense } from "react"
import AdminAuthClient from "./AdminAuthClient"

export const dynamic = "force-dynamic"

export default function AdminAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-100">
          <div className="text-sm text-zinc-600">Carregando…</div>
        </div>
      }
    >
      <AdminAuthClient />
    </Suspense>
  )
}
