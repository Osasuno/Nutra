import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { AcceptInviteButton } from "@/components/patient/AcceptInviteButton";
import { Alert, ButtonLink, Card, Skeleton } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { findInvite } from "@/lib/links";

export const metadata: Metadata = { title: "Convite" };

export default function InvitePage(props: PageProps<"/convite/[token]">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-emerald-50 to-slate-50">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 pt-10">
        <Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}>
          <InviteContent params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}

async function InviteContent({ params }: { params: PageProps<"/convite/[token]">["params"] }) {
  const { token } = await params;
  const [invite, user] = await Promise.all([findInvite(token), getCurrentUser()]);
  const next = encodeURIComponent(`/convite/${token}`);

  if (!invite || invite.userId) {
    return (
      <Card className="h-fit w-full max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Convite inválido</h1>
        <p className="mt-2 text-sm text-slate-500">
          Este link já foi usado ou expirou. Peça um novo link para a sua nutricionista.
        </p>
        <ButtonLink href={user ? (user.role === "NUTRITIONIST" ? "/nutri" : "/paciente") : "/login"} className="mt-5" variant="outline">
          {user ? "Ir para o painel" : "Entrar"}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="h-fit w-full max-w-md p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Convite de acompanhamento</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">
        {invite.nutritionist.name} convidou você, {invite.name.split(" ")[0]}!
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Com a conta você preenche a anamnese, vê seu plano alimentar, registra refeições com fotos e conversa com
        a sua nutricionista.
      </p>
      <div className="mt-6">
        {user?.role === "PATIENT" ? (
          <>
            <p className="mb-3 text-sm text-slate-500">Conectado como {user.email}.</p>
            <AcceptInviteButton token={token} />
          </>
        ) : user?.role === "NUTRITIONIST" ? (
          <Alert tone="yellow">Você está conectado como nutricionista. Saia da conta para aceitar o convite como paciente.</Alert>
        ) : (
          <div className="flex flex-col gap-2">
            <ButtonLink href={`/cadastro?convite=${encodeURIComponent(token)}`}>Criar minha conta</ButtonLink>
            <ButtonLink href={`/login?next=${next}`} variant="outline">
              Já tenho conta
            </ButtonLink>
          </div>
        )}
      </div>
    </Card>
  );
}
