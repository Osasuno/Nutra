import {
  Calculator,
  Camera,
  ClipboardList,
  LayoutGrid,
  MessageCircle,
  Salad,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ButtonLink, Card } from "@/components/ui";

const features = [
  {
    icon: ClipboardList,
    title: "Anamnese completíssima",
    text: "Identificação, objetivos, história clínica e familiar, sintomas, sono, estresse, hábitos, recordatório 24 h, frequência alimentar, saúde da mulher, exames e conduta.",
  },
  {
    icon: Salad,
    title: "Base de alimentos",
    text: "Tabela TACO (UNICAMP) com 597 alimentos, medidas caseiras do IBGE e produtos industrializados do Open Food Facts, com proteínas, carboidratos e gorduras por grama.",
  },
  {
    icon: Calculator,
    title: "Todas as fórmulas",
    text: "TMB e GET (Harris-Benedict, Mifflin, FAO/OMS, Schofield, Katch-McArdle, Cunningham, Tinsley, IOM), dobras cutâneas, IMC, RCQ, peso ideal, hidratação, gestação e mais.",
  },
  {
    icon: Camera,
    title: "Diário alimentar com fotos",
    text: "O paciente registra as refeições (a foto é opcional), informa fome e saciedade e recebe o feedback da nutricionista.",
  },
  {
    icon: MessageCircle,
    title: "Chat integrado",
    text: "Conversa direta entre paciente e nutricionista, organizada por paciente, com aviso de mensagens não lidas.",
  },
  {
    icon: LayoutGrid,
    title: "Visão gerencial",
    text: "Cada paciente é um card com peso, evolução, adesão ao diário, mensagens e próxima consulta. Um clique abre o prontuário completo.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost">
              Entrar
            </ButtonLink>
            <ButtonLink href="/cadastro">Criar conta</ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-28">
            <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Prontuário nutricional seguro e organizado
            </p>
            <h1 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Atendimento nutricional completo, do primeiro contato ao acompanhamento diário
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
              Nutricionistas gerenciam seus pacientes, montam planos com a tabela TACO e acompanham a
              evolução. Pacientes registram refeições, conversam com a nutri e veem seus resultados.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/cadastro?tipo=nutri" size="lg" className="w-full sm:w-auto">
                <Stethoscope className="h-5 w-5" /> Sou nutricionista
              </ButtonLink>
              <ButtonLink href="/cadastro?tipo=paciente" size="lg" variant="outline" className="w-full sm:w-auto">
                <User className="h-5 w-5" /> Sou paciente
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Tudo o que o atendimento precisa</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Stethoscope className="h-5 w-5 text-emerald-600" /> Para nutricionistas
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li>1. Crie sua conta com o seu CRN.</li>
                <li>2. Cadastre pacientes ou compartilhe seu código de convite.</li>
                <li>3. Faça a anamnese, avaliações e cálculos, e monte o plano alimentar.</li>
                <li>4. Acompanhe diário, fotos, mensagens e evolução no painel de cards.</li>
              </ol>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <User className="h-5 w-5 text-emerald-600" /> Para pacientes
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li>1. Crie sua conta (com o código da sua nutricionista, se tiver).</li>
                <li>2. Preencha a anamnese antes da consulta.</li>
                <li>3. Veja seu plano alimentar e registre suas refeições.</li>
                <li>4. Converse com sua nutricionista e acompanhe sua evolução.</li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500">
          Dados de alimentos: TACO 4ª ed. (NEPA/UNICAMP), Tabela de Medidas Referidas POF 2008–2009 (IBGE)
          e Open Food Facts (ODbL). As fórmulas apoiam a decisão clínica e não substituem a avaliação profissional.
        </div>
      </footer>
    </div>
  );
}
