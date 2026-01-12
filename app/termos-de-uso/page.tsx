export default function TermosDeUso() {
  return (
    <main className="min-h-screen max-w-4xl mx-auto px-6 py-12 text-zinc-800">
      <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>

      <p className="mb-4">
        Ao acessar e utilizar o aplicativo <strong>Resolve Aí Prefeito</strong>,
        você concorda com os termos descritos abaixo.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Uso do serviço</h2>
      <p className="mb-4">
        O aplicativo tem como objetivo permitir que cidadãos registrem e acompanhem
        solicitações relacionadas à cidade. O uso indevido da plataforma é proibido.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Responsabilidades do usuário</h2>
      <ul className="list-disc pl-6 mb-4">
        <li>Fornecer informações verdadeiras</li>
        <li>Não utilizar linguagem ofensiva</li>
        <li>Não enviar conteúdos ilegais</li>
        <li>Respeitar outros usuários</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Limitação de responsabilidade</h2>
      <p className="mb-4">
        Não nos responsabilizamos por informações incorretas fornecidas pelos usuários
        ou por eventuais falhas técnicas.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Suspensão de contas</h2>
      <p className="mb-4">
        Contas que violarem estes termos poderão ser suspensas ou removidas sem aviso prévio.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Alterações</h2>
      <p className="mb-4">
        Reservamo-nos o direito de modificar estes termos a qualquer momento.
      </p>

      <p className="mt-8 text-sm text-zinc-500">
        Última atualização: {new Date().getFullYear()}
      </p>
    </main>
  )
}
