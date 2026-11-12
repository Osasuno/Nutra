import { Suspense } from "react";
import { Link2, Settings2, ShieldAlert, User } from "lucide-react";
import { PatientForm } from "@/components/nutri/PatientForm";
import { InviteActions, StatusActions } from "@/components/nutri/PatientActions";
import { Alert, Card, CardBody, CardHeader, PageSkeleton } from "@/components/ui";
import { requireNutriPatient } from "@/lib/dal";
import { toDateInput } from "@/lib/format";

export default function PatientDataPage(props: PageProps<"/nutri/pacientes/[id]/dados">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/dados">["params"] }) {
  const { id } = await params;
  const { patient } = await requireNutriPatient(id);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card>
        <CardHeader title="Dados do paciente" icon={<User className="h-5 w-5" />} />
        <CardBody className="py-5">
          <PatientForm
            patientId={id}
            initial={{
              name: patient.name,
              email: patient.email ?? "",
              phone: patient.phone ?? "",
              birthDate: toDateInput(patient.birthDate),
              sex: patient.sex ?? "",
              objective: patient.objective ?? "",
            }}
          />
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Acesso do paciente" icon={<Link2 className="h-5 w-5" />} />
          <CardBody>
            {patient.userId ? (
              <Alert tone="green" title="Conta vinculada">
                O paciente acessa a plataforma, preenche a anamnese, vê o plano ativo, registra o diário e conversa
                com você pelo chat.
              </Alert>
            ) : patient.inviteToken ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Envie este link para o paciente criar a conta já vinculada a você. Ele também pode usar o seu
                  código de convite no cadastro.
                </p>
                <InviteActions patientId={id} token={patient.inviteToken} patientName={patient.name} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sem convite disponível.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Acompanhamento" icon={<Settings2 className="h-5 w-5" />} />
          <CardBody>
            <StatusActions patientId={id} status={patient.status} />
          </CardBody>
        </Card>

        <Alert tone="yellow" title="Proteção de dados (LGPD)">
          <span className="inline-flex items-start gap-1">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Dados de saúde são sensíveis. Compartilhe o link de
            convite apenas com o próprio paciente.
          </span>
        </Alert>
      </div>
    </div>
  );
}
