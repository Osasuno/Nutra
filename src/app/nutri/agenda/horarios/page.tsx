import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScheduleSettingsForm } from "@/components/agenda/ScheduleSettingsForm";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { getScheduleSettings } from "@/lib/appointments";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Horários de atendimento" };

export default function ScheduleSettingsPage() {
  return (
    <>
      <Link href="/nutri/agenda" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Agenda
      </Link>
      <PageHeader
        title="Horários de atendimento"
        description="Defina quando os pacientes podem solicitar consultas. Você continua podendo agendar em qualquer horário."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("NUTRITIONIST");
  const settings = await getScheduleSettings(user.id);
  return <ScheduleSettingsForm initial={settings} />;
}
