import { Suspense } from "react";
import type { Metadata } from "next";
import { AnamnesisForm } from "@/components/anamnesis/AnamnesisForm";
import { NoLink } from "@/components/patient/NoLink";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { omitNutriOnly, parseAnamnesis } from "@/lib/anamnesis";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";

export const metadata: Metadata = { title: "Anamnese" };

export default function PatientAnamnesisPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { active } = await getPatientLinks();
  if (!active) return <NoLink feature="A anamnese" />;
  const anamnesis = await prisma.anamnesis.findUnique({ where: { patientId: active.id } });
  return (
    <>
      <PageHeader
        title="Anamnese nutricional"
        description="Conte sobre sua saúde, rotina e alimentação. Você pode salvar e continuar depois; sua nutricionista revisa na consulta."
      />
      <AnamnesisForm
        patientId={active.id}
        initialData={omitNutriOnly(parseAnamnesis(anamnesis?.data))}
        role="PATIENT"
        sex={active.sex}
        updatedAt={anamnesis?.updatedAt.toISOString() ?? null}
      />
    </>
  );
}
