import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ButtonLink, Card, Skeleton } from "@/components/ui";
import { findPasswordReset, RESET_HOURS } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false, follow: false } };

export default function NewPasswordPage(props: PageProps<"/nova-senha/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-md" />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nova-senha/[token]">["params"] }) {
  const { token } = await params;
  const reset = await findPasswordReset(token);
  if (!reset) {
    return (
      <Card className="h-fit w-full max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Link inválido</h1>
        <p className="mt-2 text-sm text-slate-500">
          Este link já foi usado, foi trocado por um mais novo ou passou do prazo de {RESET_HOURS} horas. Peça um
          novo à sua nutricionista.
        </p>
        <ButtonLink href="/login" className="mt-5" variant="outline">
          Entrar
        </ButtonLink>
      </Card>
    );
  }
  return <ResetPasswordForm token={token} firstName={reset.user.name.split(" ")[0]} email={reset.user.email} />;
}
