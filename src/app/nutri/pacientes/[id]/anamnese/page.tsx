import { Suspense } from "react";
import { AnamnesisForm } from "@/components/anamnesis/AnamnesisForm";
import { ExamUploads } from "@/components/anamnesis/ExamUploads";
import { Alert, PageSkeleton } from "@/components/ui";
import { parseAnamnesis } from "@/lib/anamnesis";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";
import { listExams } from "@/lib/exams";

export default function AnamnesisPage(props: PageProps<"/nutri/pacientes/[id]/anamnese">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/anamnese">["params"] }) {
  const { id } = await params;
  const { user, patient } = await requireNutriPatient(id);
  const [anamnesis, exams] = await Promise.all([
    prisma.anamnesis.findUnique({ where: { patientId: id } }),
    listExams(id, patient.userId),
  ]);
  return (
    <div className="space-y-4">
      <ExamUploads patientId={id} exams={exams} viewer="NUTRITIONIST" currentUserId={user.id} />
      {!patient.sex ? (
        <Alert tone="yellow">
          Informe o sexo do paciente em “Dados e convite” para exibir a seção de saúde da mulher apenas quando
          aplicável.
        </Alert>
      ) : null}
      <AnamnesisForm
        patientId={id}
        initialData={parseAnamnesis(anamnesis?.data)}
        role="NUTRITIONIST"
        sex={patient.sex}
        updatedAt={anamnesis?.updatedAt.toISOString() ?? null}
      />
      <p className="text-xs text-slate-500">
        A antropometria (peso, circunferências, dobras e bioimpedância) é registrada na aba Avaliações, com
        histórico e gráficos.
      </p>
    </div>
  );
}
