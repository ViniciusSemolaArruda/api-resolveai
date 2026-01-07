import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
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

          <div className="max-w-2xl space-y-3 text-base leading-7 text-zinc-700 dark:text-zinc-300">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">
              Funcionalidades principais que o sistema precisa ter:
            </p>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Visão geral de problemas:</strong> quantos problemas existem no total,
                quantos estão <em>pendentes</em> e quantos foram <em>resolvidos</em>.
              </li>
              <li>
                <strong>Listagem e status:</strong> visualizar os problemas, filtrar por status
                (pendente, em andamento, resolvido) e ver detalhes de cada item.
              </li>
              <li>
                <strong>Relatórios e gráficos:</strong> gráficos mostrando evolução (ex.: por dia/semana),
                distribuição por categoria/classe e taxa de resolução.
              </li>
              <li>
                <strong>Cadastro de funcionários:</strong> um local para adicionar funcionário informando
                <strong> nome</strong> e <strong>classe</strong>.
              </li>
              <li>
                <strong>IP automático:</strong> ao cadastrar o funcionário, o <strong>IP será gerado automaticamente</strong>.
              </li>
              <li>
                <strong>Senha escolhida pelo funcionário:</strong> depois do cadastro, o funcionário precisa
                <strong> escolher a própria senha</strong> para acessar o sistema.
              </li>
            </ul>

            <p className="pt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Observação: o dashboard deve ser simples e rápido, com indicadores claros, filtros e uma visão
              que facilite decidir prioridades.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="#"
          >
            Começar
          </a>

          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="#"
          >
            Ver Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
