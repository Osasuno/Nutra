import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Skeleton } from "@/components/ui";
import { findInvite } from "@/lib/links";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage(props: PageProps<"/cadastro">) {
  return (
    <Suspense fallback={<Skeleton className="h-[36rem] w-full max-w-lg" />}>
      <RegisterContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function RegisterContent({ searchParams }: { searchParams: PageProps<"/cadastro">["searchParams"] }) {
  const params = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const tipo = str(params.tipo);
  const code = str(params.codigo);
  const inviteToken = str(params.convite);

  let inviteInfo = null;
  if (inviteToken) {
    const invite = await findInvite(inviteToken);
    if (invite && !invite.userId) {
      inviteInfo = {
        patientName: invite.name,
        email: invite.email,
        nutritionistName: invite.nutritionist.name,
      };
    }
  }

  const role = inviteInfo || code || tipo === "paciente" ? "PATIENT" : "NUTRITIONIST";

  return <RegisterForm defaults={{ role, code, invite: inviteToken, inviteInfo }} />;
}
