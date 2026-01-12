export default function PoliticaPrivacidade() {
  return (
    <main className="min-h-screen max-w-4xl mx-auto px-6 py-12 text-zinc-800">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>

      <p className="mb-4">
        A sua privacidade é importante para nós. Esta Política de Privacidade descreve
        como coletamos, usamos e protegemos suas informações ao utilizar o aplicativo
        <strong> Resolve Aí Prefeito</strong>.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Informações coletadas</h2>
      <p className="mb-4">
        Podemos coletar informações como nome, e-mail, localização aproximada,
        dados do dispositivo e informações relacionadas às solicitações enviadas
        pelo usuário.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Uso das informações</h2>
      <p className="mb-4">
        As informações coletadas são utilizadas para:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Melhorar a experiência do usuário</li>
        <li>Permitir o envio e acompanhamento de solicitações</li>
        <li>Comunicação com o usuário</li>
        <li>Garantir segurança e prevenção de fraudes</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Compartilhamento de dados</h2>
      <p className="mb-4">
        Não compartilhamos seus dados pessoais com terceiros, exceto quando exigido
        por lei ou necessário para o funcionamento do serviço.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Armazenamento e segurança</h2>
      <p className="mb-4">
        Utilizamos medidas de segurança para proteger suas informações contra acessos
        não autorizados, alterações ou divulgações.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Direitos do usuário</h2>
      <p className="mb-4">
        Você pode solicitar a atualização ou exclusão de seus dados a qualquer momento
        entrando em contato conosco.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Alterações</h2>
      <p className="mb-4">
        Esta política pode ser atualizada periodicamente. Recomendamos que você revise
        esta página regularmente.
      </p>

      <p className="mt-8 text-sm text-zinc-500">
        Última atualização: {new Date().getFullYear()}
      </p>
    </main>
  )
}
