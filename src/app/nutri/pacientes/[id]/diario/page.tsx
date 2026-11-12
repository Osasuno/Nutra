import { Suspense } from "react";
import Link from "next/link";
import { MealLogList } from "@/components/diary/MealLogList";
import { Alert, PageSkeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";

export default function DiaryPage(props: PageProps<"/nutri/pacientes/[id]/diario">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/nutri/pacientes/[id]/diario">["params"];
  searchParams: PageProps<"/nutri/pacientes/[id]/diario">["searchParams"];
}) {
  const { id } = await params;
  const { filtro } = await searchParams;
  const { patient } = await requireNutriPatient(id);
  const pendingOnly = filtro === "pendentes";
  const [logs, pending] = await Promise.all([
    prisma.mealLog.findMany({
      where: { patientId: id, ...(pendingOnly ? { feedback: null } : {}) },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.mealLog.count({ where: { patientId: id, feedback: null } }),
  ]);
  const base = `/nutri/pacientes/${id}/diario`;

  return (
    <div className="space-y-4">
      {!patient.userId ? (
        <Alert tone="blue">O diário fica disponível quando o paciente criar a conta pelo convite (aba “Dados e convite”).</Alert>
      ) : null}
      <div className="flex gap-2 text-sm">
        <Link href={base} className={cn("rounded-full px-3 py-1.5 ring-1", !pendingOnly ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-slate-200")}>
          Todos
        </Link>
        <Link
          href={`${base}?filtro=pendentes`}
          className={cn("rounded-full px-3 py-1.5 ring-1", pendingOnly ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-slate-200")}
        >
          Sem feedback ({pending})
        </Link>
      </div>
      <MealLogList logs={logs} viewer="NUTRITIONIST" />
    </div>
  );
}
