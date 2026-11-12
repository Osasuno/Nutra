"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Plus, Save, Trash2 } from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { Alert, Button, Card, Input, Select, Textarea } from "@/components/ui";
import {
  sectionProgress,
  visibleFields,
  visibleSections,
  type AnamnesisData,
  type AnamnesisField,
  type AnamnesisValue,
  type FrequencyField,
  type OptionsField,
  type RepeaterField,
  type ScaleField,
} from "@/lib/anamnesis";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";

const EXCLUSIVE = new Set(["Nenhuma", "Nenhuma conhecida", "Sem queixas", "Sem alterações"]);

type Props = {
  patientId: string;
  initialData: AnamnesisData;
  role: "NUTRITIONIST" | "PATIENT";
  sex: string | null;
  updatedAt: string | null;
};

export function AnamnesisForm({ patientId, initialData, role, sex, updatedAt }: Props) {
  const [data, setData] = useState<AnamnesisData>(initialData);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(updatedAt);
  const [error, setError] = useState<string | null>(null);
  const formTop = useRef<HTMLDivElement>(null);
  const ctx = useMemo(() => ({ sex, role }), [sex, role]);

  const sections = visibleSections(data, ctx);
  const current = sections.find((s) => s.id === sectionId) ?? sections[0];
  const index = sections.indexOf(current);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update(id: string, value: AnamnesisValue | undefined) {
    setData((d) => {
      const next = { ...d };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
    setDirty(true);
  }

  async function save(goNext: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ updatedAt: string }>(`/api/patients/${patientId}/anamnesis`, {
        method: "PUT",
        body: { data },
      });
      setLastSaved(res.updatedAt);
      setDirty(false);
      if (goNext && index < sections.length - 1) {
        goTo(sections[index + 1].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const fields = visibleFields(current, data, ctx);

  /** Troca de seção e leva ao início do formulário (no celular a lista de seções fica acima). */
  function goTo(id: string) {
    setSectionId(id);
    requestAnimationFrame(() => formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
      {/* Celular: seletor compacto no lugar da lista das 12 seções. */}
      <div className="lg:hidden">
        <label htmlFor="anamnesis-section" className="mb-1.5 block text-sm font-medium text-slate-700">
          Seção
        </label>
        <Select id="anamnesis-section" value={current.id} onChange={(e) => goTo(e.target.value)}>
          {sections.map((s, i) => {
            const p = sectionProgress(s, data, ctx);
            const complete = p.total > 0 && p.filled === p.total;
            return (
              <option key={s.id} value={s.id}>
                {`${i + 1}. ${s.title} (${complete ? "completa" : `${p.filled}/${p.total}`})`}
              </option>
            );
          })}
        </Select>
      </div>

      <nav className="hidden space-y-1 lg:sticky lg:top-20 lg:block lg:self-start" aria-label="Seções da anamnese">
        {sections.map((s, i) => {
          const p = sectionProgress(s, data, ctx);
          const complete = p.total > 0 && p.filled === p.total;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                s.id === current.id ? "bg-emerald-50 font-medium text-emerald-800" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                  complete ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600",
                )}
              >
                {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="flex-1">{s.title}</span>
              <span className="text-xs text-slate-400">
                {p.filled}/{p.total}
              </span>
            </button>
          );
        })}
      </nav>

      <Card>
        {/* scroll-mt: o cabeçalho fixo do app (56px) não cobre o título ao rolar até aqui. */}
        <div ref={formTop} className="scroll-mt-20 border-b border-slate-100 px-4 py-4 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Seção {index + 1} de {sections.length}
          </p>
          <h2 className="text-lg font-semibold text-slate-900">{current.title}</h2>
          {current.description ? <p className="text-sm text-slate-500">{current.description}</p> : null}
        </div>
        <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 sm:px-5">
          {fields.map((field) => (
            <div key={field.id} className={cn(field.wide || isWideType(field) ? "sm:col-span-2" : "")}>
              <FieldInput field={field} value={data[field.id]} onChange={(v) => update(field.id, v)} />
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 flex flex-col gap-2 rounded-b-xl border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
          <p className="text-xs text-slate-500">
            {dirty ? "Alterações não salvas" : lastSaved ? `Salvo em ${fmtDateTime(lastSaved)}` : "Ainda não salvo"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4" /> Salvar
            </Button>
            {index < sections.length - 1 ? (
              <Button onClick={() => save(true)} disabled={saving} className="flex-[2] sm:flex-none">
                Salvar e continuar <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
        {error ? (
          <div className="px-4 pb-4 sm:px-5">
            <Alert tone="red">{error}</Alert>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function isWideType(field: AnamnesisField) {
  return field.type === "repeater" || field.type === "frequency" || field.type === "scale";
}

function FieldLabel({ field }: { field: AnamnesisField }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-slate-700">
        {field.label}
        {field.unit ? <span className="font-normal text-slate-400"> ({field.unit})</span> : null}
      </p>
      {field.help ? <p className="text-xs text-slate-500">{field.help}</p> : null}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AnamnesisField;
  value: AnamnesisValue | undefined;
  onChange: (value: AnamnesisValue | undefined) => void;
}) {
  switch (field.type) {
    case "text":
    case "date":
    case "time":
      return (
        <label className="block">
          <FieldLabel field={field} />
          <Input
            type={field.type}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value || undefined)}
            maxLength={field.type === "text" ? 500 : undefined}
          />
        </label>
      );
    case "textarea":
      return (
        <label className="block">
          <FieldLabel field={field} />
          <Textarea
            rows={3}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value || undefined)}
            maxLength={5000}
          />
        </label>
      );
    case "number":
      return (
        <label className="block">
          <FieldLabel field={field} />
          <NumberInput
            value={typeof value === "number" ? value : null}
            onValueChange={(v) => {
              if (v === null) onChange(undefined);
              else onChange(Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, v)));
            }}
          />
        </label>
      );
    case "select":
      return (
        <label className="block">
          <FieldLabel field={field} />
          <Select value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">Selecione</option>
            {field.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </label>
      );
    case "radio":
      return <RadioInput field={field} value={value} onChange={onChange} />;
    case "checkboxes":
      return <CheckboxesInput field={field} value={value} onChange={onChange} />;
    case "scale":
      return <ScaleInput field={field} value={value} onChange={onChange} />;
    case "repeater":
      return <RepeaterInput field={field} value={value} onChange={onChange} />;
    case "frequency":
      return <FrequencyInput field={field} value={value} onChange={onChange} />;
  }
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm transition",
        active ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function RadioInput({ field, value, onChange }: { field: OptionsField; value: unknown; onChange: (v: AnamnesisValue | undefined) => void }) {
  if (field.descriptions) {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(value === o ? undefined : o)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition",
                value === o ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <span className="font-medium">{o}</span>
              <span className="block text-xs text-slate-500">{field.descriptions?.[o]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-2">
        {field.options.map((o) => (
          <Pill key={o} active={value === o} onClick={() => onChange(value === o ? undefined : o)}>
            {o}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function CheckboxesInput({ field, value, onChange }: { field: OptionsField; value: unknown; onChange: (v: AnamnesisValue | undefined) => void }) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  function toggle(option: string) {
    let next: string[];
    if (selected.includes(option)) next = selected.filter((o) => o !== option);
    else if (EXCLUSIVE.has(option)) next = [option];
    else next = [...selected.filter((o) => !EXCLUSIVE.has(o)), option];
    onChange(next.length ? next : undefined);
  }
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-2">
        {field.options.map((o) => (
          <Pill key={o} active={selected.includes(o)} onClick={() => toggle(o)}>
            {o}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function ScaleInput({ field, value, onChange }: { field: ScaleField; value: unknown; onChange: (v: AnamnesisValue | undefined) => void }) {
  const steps = Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i);
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className={cn(
              "h-9 w-9 rounded-lg text-sm font-medium transition",
              value === n ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {field.minLabel || field.maxLabel ? (
        <div className="mt-1 flex justify-between text-xs text-slate-400" style={{ maxWidth: `${steps.length * 2.6}rem` }}>
          <span>{field.minLabel}</span>
          <span>{field.maxLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function RepeaterInput({ field, value, onChange }: { field: RepeaterField; value: unknown; onChange: (v: AnamnesisValue | undefined) => void }) {
  const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];
  const max = field.maxRows ?? 30;
  const setRow = (i: number, col: string, v: string) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [col]: v } : r));
    onChange(next);
  };
  const remove = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length ? next : undefined);
  };
  const add = () => onChange([...rows, Object.fromEntries(field.columns.map((c) => [c.id, ""]))]);

  return (
    <div>
      <FieldLabel field={field} />
      {field.columns.map((c) =>
        c.suggestions ? (
          <datalist key={c.id} id={`${field.id}-${c.id}`}>
            {c.suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null,
      )}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 md:flex-row md:items-start">
            {field.columns.map((c) => (
              <label key={c.id} className={cn("block", c.grow ? "md:flex-[2]" : "md:flex-1")}>
                <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{c.label}</span>
                {c.type === "textarea" ? (
                  <Textarea rows={2} value={row[c.id] ?? ""} onChange={(e) => setRow(i, c.id, e.target.value)} maxLength={2000} />
                ) : (
                  <Input
                    type={c.type === "number" ? "text" : c.type ?? "text"}
                    inputMode={c.type === "number" ? "decimal" : undefined}
                    list={c.suggestions ? `${field.id}-${c.id}` : undefined}
                    value={row[c.id] ?? ""}
                    onChange={(e) => setRow(i, c.id, e.target.value)}
                    maxLength={500}
                  />
                )}
              </label>
            ))}
            <button
              type="button"
              onClick={() => remove(i)}
              className="self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 md:mt-5 md:self-start"
              aria-label="Remover linha"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {rows.length < max ? (
        <Button variant="secondary" size="sm" className="mt-2" onClick={add}>
          <Plus className="h-4 w-4" /> {field.addLabel}
        </Button>
      ) : null}
    </div>
  );
}

function FrequencyInput({ field, value, onChange }: { field: FrequencyField; value: unknown; onChange: (v: AnamnesisValue | undefined) => void }) {
  const answers = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
  const set = (item: string, option: string) => {
    const next = { ...answers };
    if (next[item] === option) delete next[item];
    else next[item] = option;
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div>
      <FieldLabel field={field} />
      {/* Celular: cada alimento com as opções em botões que quebram linha. A partir de sm, tabela. */}
      <div className="relative rounded-lg border border-slate-200 sm:overflow-x-auto">
        <table className="w-full text-sm sm:min-w-[640px]">
          <thead className="hidden bg-slate-50 text-xs text-slate-500 sm:table-header-group">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Alimento / grupo</th>
              {field.options.map((o) => (
                <th key={o} className="px-1 py-2 text-center font-medium">
                  {o}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {field.items.map((item) => (
              <tr key={item} className="block px-3 py-3 hover:bg-slate-50/60 sm:table-row sm:p-0">
                <td className="block pb-2 font-medium text-slate-700 sm:table-cell sm:px-3 sm:py-2 sm:pb-2 sm:font-normal">{item}</td>
                {field.options.map((o) => (
                  <td key={o} className="mb-1.5 mr-1.5 inline-block sm:mb-0 sm:mr-0 sm:table-cell sm:px-1 sm:py-2 sm:text-center">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 has-checked:border-emerald-500 has-checked:bg-emerald-50 has-checked:text-emerald-800 sm:border-0 sm:p-0 sm:has-checked:bg-transparent">
                      <input
                        type="radio"
                        name={`${field.id}-${item}`}
                        checked={answers[item] === o}
                        onChange={() => set(item, o)}
                        onClick={() => answers[item] === o && set(item, o)}
                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                        aria-label={`${item}: ${o}`}
                      />
                      <span className="sm:hidden">{o}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
