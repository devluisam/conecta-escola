import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/brand/logo"

export const metadata: Metadata = { title: "Privacidade e LGPD" }

const sections = [
  {
    title: "Quais dados tratamos",
    body: "Nome, matrícula, turma, e-mail institucional, notas, entregas de atividades, mensagens escolares e, opcionalmente, telefone e foto. Para alunos menores de idade, registramos também o responsável legal.",
  },
  {
    title: "Para que usamos",
    body: "Exclusivamente para fins educacionais: acompanhamento das atividades, comunicação entre escola, alunos e famílias, e indicadores pedagógicos. Não há publicidade, venda ou compartilhamento com terceiros.",
  },
  {
    title: "Crianças e adolescentes (art. 14 da LGPD)",
    body: "Os dados de estudantes são tratados no seu melhor interesse. A gamificação não expõe desempenho individual a colegas: não existe ranking público e os resultados de quizzes são visíveis apenas ao aluno e ao professor.",
  },
  {
    title: "Quem acessa",
    body: "Cada aluno vê apenas os próprios dados. Professores acessam somente as turmas e disciplinas sob sua responsabilidade. A coordenação acessa dados agregados e cadastrais. Essas regras são aplicadas no banco de dados (Row Level Security).",
  },
  {
    title: "Segurança",
    body: "Senhas nunca são armazenadas em texto simples, a comunicação usa HTTPS e as sessões expiram. Credenciais privadas não ficam no código-fonte.",
  },
  {
    title: "Seus direitos",
    body: "Você ou seu responsável pode solicitar acesso, correção ou exclusão de dados junto à secretaria da escola, que atua como controladora dos dados.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-surface px-5 py-10">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-7 ring-1 ring-foreground/5 sm:p-10">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold text-navy">Privacidade e proteção de dados</h1>
        <p className="mt-2 text-muted-foreground">Como o Conecta Escola trata dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-semibold text-navy">{s.title}</h2>
              <p className="mt-1.5 leading-relaxed text-foreground/80">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 rounded-lg bg-reward-50 p-3 text-sm text-reward-700">
          Projeto acadêmico: no modo demonstração todos os dados são fictícios e ficam apenas no seu navegador.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </article>
    </div>
  )
}
