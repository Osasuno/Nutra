import { Suspense } from "react";
import type { Metadata } from "next";
import { MealLogForm } from "@/components/diary/MealLogForm";
import { MealLogList } from "@/components/diary/MealLogList";
import { NoLink } from "@/components/patient/NoLink";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";

export const metadata: Metadata = { title: "Diário alimentar" };

export default function PatientDiaryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { active } = await getPatientLinks();
  if (!active) return <NoLink feature="O diário alimentar" />;
  const logs = await prisma.mealLog.findMany({ where: { patientId: active.id }, orderBy: { date: "desc" }, take: 60 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Diário alimentar" description="Registre o que comeu. Sua nutricionista acompanha e envia feedback." />
      <MealLogForm patientId={active.id} />
      <MealLogList logs={logs} viewer="PATIENT" nutritionistName={active.nutritionist.name} />
    </div>
  );
}
