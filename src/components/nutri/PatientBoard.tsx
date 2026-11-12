"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { EmptyState, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { normalizeText } from "@/lib/text";
import type { PatientCardData } from "@/lib/patients";
import { PatientCard } from "./PatientCard";

type Filter = "ACTIVE" | "ARCHIVED" | "ALL" | "ATTENTION";
type Sort = "activity" | "name" | "unread" | "appointment";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ACTIVE", label: "Ativos" },
  { id: "ATTENTION", label: "Precisam de atenção" },
  { id: "ARCHIVED", label: "Arquivados" },
  { id: "ALL", label: "Todos" },
];

function needsAttention(p: PatientCardData) {
  if (p.status !== "ACTIVE") return false;
  const idle = p.lastLogAt ? (Date.now() - new Date(p.lastLogAt).getTime()) / 86_400_000 : Infinity;
  return p.unreadMessages > 0 || p.pendingFeedback > 0 || (p.hasAccount && idle >= 7);
}

export function PatientBoard({ patients }: { patients: PatientCardData[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [sort, setSort] = useState<Sort>("activity");

  const counts = useMemo(
    () => ({
      ACTIVE: patients.filter((p) => p.status === "ACTIVE").length,
      ATTENTION: patients.filter(needsAttention).length,
      ARCHIVED: patients.filter((p) => p.status === "ARCHIVED").length,
      ALL: patients.length,
    }),
    [patients],
  );

  const visible = useMemo(() => {
    const q = normalizeText(query);
    const list = patients.filter((p) => {
      if (filter === "ACTIVE" && p.status !== "ACTIVE") return false;
      if (filter === "ARCHIVED" && p.status !== "ARCHIVED") return false;
      if (filter === "ATTENTION" && !needsAttention(p)) return false;
      if (q && !normalizeText(`${p.name} ${p.email ?? ""} ${p.objective ?? ""}`).includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "pt-BR");
        case "unread":
          return b.unreadMessages - a.unreadMessages || b.pendingFeedback - a.pendingFeedback;
        case "appointment": {
          const ta = a.nextAppointment ? new Date(a.nextAppointment).getTime() : Infinity;
          const tb = b.nextAppointment ? new Date(b.nextAppointment).getTime() : Infinity;
          return ta - tb;
        }
        default:
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      }
    });
  }, [patients, query, filter, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                filter === f.id ? "bg-emerald-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {f.label} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente..."
              className="pl-9"
              aria-label="Buscar paciente"
            />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto" aria-label="Ordenar">
            <option value="activity">Atividade recente</option>
            <option value="name">Nome (A–Z)</option>
            <option value="unread">Pendências</option>
            <option value="appointment">Próxima consulta</option>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={patients.length === 0 ? "Nenhum paciente ainda" : "Nenhum paciente encontrado"}
          description={
            patients.length === 0
              ? "Cadastre seu primeiro paciente ou compartilhe seu código de convite para que ele crie a conta já vinculada a você."
              : "Ajuste a busca ou o filtro."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <PatientCard key={p.id} patient={p} />
          ))}
        </div>
      )}
    </div>
  );
}
