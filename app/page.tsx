import Image from "next/image"
import Header from "./components/Header"

export default function Home() {
  return (
    <>
      <Header />

      <div className="flex min-h-screen items-center justify-center bg-zinc-50 pt-16 font-sans dark:bg-black">
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white py-32 px-16 dark:bg-black sm:items-start">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />

          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <h1 className="max-w-xl text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Painel de Gestão de Problemas (Dashboard)
            </h1>

            <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Este sistema será usado para visualizar e gerenciar problemas que precisam ser
              resolvidos, acompanhar o que já foi concluído e analisar indicadores em tempo real.
            </p>

            {/* resto do conteúdo igual */}
          </div>
        </main>
      </div>
    </>
  )
}
