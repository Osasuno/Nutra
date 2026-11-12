import { Suspense } from "react";
import type { Metadata } from "next";
import { MapPin, Search } from "lucide-react";
import { RequestLinkButton } from "@/components/patient/ConnectForms";
import { Alert, Avatar, Button, Card, EmptyState, Input, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";

export const metadata: Metadata = { title: "Encontrar nutricionista" };

export default function DirectoryPage(props: PageProps<"/paciente/nutricionistas">) {
  return (
    <>
      <PageHeader title="Encontrar nutricionista" description="Profissionais cadastrados na plataforma que aceitam novos pacientes." />
      <Suspense fallback={<PageSkeleton />}>
        <Directory searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Directory({ searchParams }: { searchParams: PageProps<"/paciente/nutricionistas">["searchParams"] }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const { active, pending } = await getPatientLinks();

  const profiles = await prisma.nutritionistProfile.findMany({
    where: {
      showInDirectory: true,
      acceptingPatients: true,
      ...(query
        ? {
            OR: [
              { user: { name: { contains: query, mode: "insensitive" } } },
              { city: { contains: query, mode: "insensitive" } },
              { specialties: { contains: query, mode: "insensitive" } },
              { bio: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
    take: 50,
  });
  const pendingIds = new Set(pending.map((p) => p.nutritionistId));

  return (
    <div className="space-y-4">
      {active ? (
        <Alert tone="yellow">
          Você já está em acompanhamento com {active.nutritionist.name}. Para trocar, encerre o vínculo atual em Meu perfil.
        </Alert>
      ) : null}
      <form className="flex max-w-xl gap-2" action="/paciente/nutricionistas">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={query} placeholder="Nome, cidade ou especialidade" className="pl-9" aria-label="Buscar" />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      {profiles.length === 0 ? (
        <EmptyState title="Nenhuma nutricionista encontrada" description="Tente outra busca." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <Avatar name={p.user.name} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{p.user.name}</p>
                  <p className="text-xs text-slate-500">{p.crn}</p>
                  {p.city || p.state ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {[p.city, p.state].filter(Boolean).join(" / ")}
                    </p>
                  ) : null}
                </div>
              </div>
              {p.specialties ? <p className="text-sm font-medium text-emerald-700">{p.specialties}</p> : null}
              {p.bio ? <p className="line-clamp-4 text-sm text-slate-600">{p.bio}</p> : null}
              <div className="mt-auto">
                {pendingIds.has(p.user.id) ? (
                  <p className="text-sm text-amber-700">Solicitação enviada. Aguardando resposta.</p>
                ) : active ? null : (
                  <RequestLinkButton nutritionistId={p.user.id} name={p.user.name} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
