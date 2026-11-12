"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { slug: "", label: "Visão geral" },
  { slug: "anamnese", label: "Anamnese" },
  { slug: "avaliacoes", label: "Avaliações" },
  { slug: "energia", label: "Energia e metas" },
  { slug: "plano", label: "Plano alimentar" },
  { slug: "diario", label: "Diário" },
  { slug: "chat", label: "Chat" },
  { slug: "notas", label: "Evolução clínica" },
  { slug: "dados", label: "Dados e convite" },
];

export function PatientTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/nutri/pacientes/${id}`;
  return (
    <nav className="no-print -mb-px flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Seções do paciente">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
