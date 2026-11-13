import { Suspense } from "react";
import type { Metadata } from "next";
import { AnamnesisView } from "@/components/anamnesis/AnamnesisView";
import { ExamUploads } from "@/components/anamnesis/ExamUploads";
import { NoLink } from "@/components/patient/NoLink";
import { PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { omitNutriOnly, parseAnamnesis } from "@/lib/anamnesis";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";
import { listExams } from "@/lib/exams";

export const metadata: Metadata = { title: "Anamnese e exames" };

export default function PatientAnamnesisPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { user, active } = await getPatientLinks();
  if (!active) return <NoLink feature="A anamnese" />;
  const [anamnesis, exams] = await Promise.all([
    prisma.anamnesis.findUnique({ where: { patientId: active.id } }),
    listExams(active.id, user.id),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Anamnese e exames"
        description="A anamnese é registrada pela sua nutricionista. Aqui você acompanha o que foi anotado e envia seus exames."
      />
      <ExamUploads patientId={active.id} exams={exams} viewer="PATIENT" currentUserId={user.id} />
      <div>
        <SectionTitle>Sua anamnese</SectionTitle>
        <AnamnesisView
          data={omitNutriOnly(parseAnamnesis(anamnesis?.data))}
          sex={active.sex}
          updatedAt={anamnesis?.updatedAt.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
