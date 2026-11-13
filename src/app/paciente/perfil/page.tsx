import { Suspense } from "react";
import type { Metadata } from "next";
import { KeyRound, Stethoscope, User } from "lucide-react";
import { CodeConnectForm, LinkActionButton } from "@/components/patient/ConnectForms";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { PatientProfileForm } from "@/components/profile/PatientProfileForm";
import { NotificationsCard } from "@/components/pwa/NotificationsCard";
import { Avatar, ButtonLink, Card, CardBody, CardHeader, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { toDateInput } from "@/lib/format";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PatientProfilePage() {
  return (
    <>
      <PageHeader title="Meu perfil" />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const { user, active } = await getPatientLinks();
  const data = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, phone: true, birthDate: true, sex: true, email: true },
  });
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Meus dados" description={data.email} icon={<User className="h-5 w-5" />} />
          <CardBody className="py-5">
            <PatientProfileForm
              initial={{ name: data.name, phone: data.phone ?? "", birthDate: toDateInput(data.birthDate), sex: data.sex ?? "" }}
            />
          </CardBody>
        </Card>
        <NotificationsCard role="PATIENT" />
        <Card>
          <CardHeader title="Senha" icon={<KeyRound className="h-5 w-5" />} />
          <CardBody>
            <PasswordForm />
          </CardBody>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader title="Acompanhamento" icon={<Stethoscope className="h-5 w-5" />} />
        <CardBody className="space-y-4">
          {active ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={active.nutritionist.name} />
                <div>
                  <p className="font-medium text-slate-900">{active.nutritionist.name}</p>
                  <p className="text-xs text-slate-500">{active.nutritionist.nutritionistProfile?.crn}</p>
                </div>
              </div>
              <LinkActionButton
                patientId={active.id}
                action="end"
                label="Encerrar acompanhamento"
                confirmText={`Encerrar o acompanhamento com ${active.nutritionist.name}? Você perderá o acesso ao plano, diário e chat deste vínculo.`}
              />
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Você não está em acompanhamento no momento.</p>
              <CodeConnectForm />
              <ButtonLink href="/paciente/nutricionistas" variant="outline" size="sm">
                Encontrar nutricionista
              </ButtonLink>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
