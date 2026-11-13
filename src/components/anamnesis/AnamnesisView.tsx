import { ClipboardList } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import {
  isFilled,
  visibleFields,
  visibleSections,
  type AnamnesisData,
  type AnamnesisField,
  type AnamnesisValue,
} from "@/lib/anamnesis";
import { fmt, fmtDate } from "@/lib/format";

const isoDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : v);

function Answer({ field, value }: { field: AnamnesisField; value: AnamnesisValue }) {
  switch (field.type) {
    case "number":
      return (
        <>
          {fmt(Number(value))}
          {field.unit ? ` ${field.unit}` : ""}
        </>
      );
    case "scale":
      return (
        <>
          {String(value)} de {field.max}
          {field.minLabel && field.maxLabel ? (
            <span className="text-slate-500">
              {" "}
              ({field.min} = {field.minLabel.toLowerCase()}, {field.max} = {field.maxLabel.toLowerCase()})
            </span>
          ) : null}
        </>
      );
    case "checkboxes":
      return (
        <ul className="flex flex-wrap gap-1.5">
          {(value as string[]).map((v) => (
            <li key={v} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {v}
            </li>
          ))}
        </ul>
      );
    case "repeater":
      return (
        <ul className="space-y-1">
          {(value as Record<string, string>[])
            .filter((row) => Object.values(row).some((x) => String(x ?? "").trim()))
            .map((row, i) => (
              <li key={i} className="rounded-md bg-slate-50 px-2.5 py-1.5">
                {field.columns
                  .map((c) => (row[c.id] ? `${c.type === "date" ? isoDate(row[c.id]) : row[c.id]}` : null))
                  .filter(Boolean)
                  .join(" · ")}
              </li>
            ))}
        </ul>
      );
    case "frequency":
      return (
        <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {Object.entries(value as Record<string, string>).map(([item, option]) => (
            <li key={item}>
              <span className="text-slate-500">{item}:</span> {option}
            </li>
          ))}
        </ul>
      );
    case "date":
      return <>{isoDate(String(value))}</>;
    default:
      return (
        <span className="whitespace-pre-wrap">
          {String(value)}
          {field.unit ? ` ${field.unit}` : ""}
        </span>
      );
  }
}

/** Anamnese só para leitura (área do paciente). Mostra apenas o que já foi preenchido. */
export function AnamnesisView({ data, sex, updatedAt }: { data: AnamnesisData; sex: string | null; updatedAt: string | null }) {
  const ctx = { sex, role: "PATIENT" as const };
  const sections = visibleSections(data, ctx)
    .map((section) => ({ section, fields: visibleFields(section, data, ctx).filter((f) => isFilled(data[f.id])) }))
    .filter((s) => s.fields.length);

  if (!sections.length) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8" />}
        title="Sua anamnese ainda não foi registrada"
        description="A nutricionista preenche a anamnese na consulta. Depois ela aparece aqui para você acompanhar."
      />
    );
  }

  return (
    <div className="space-y-4">
      {updatedAt ? <p className="text-xs text-slate-500">Atualizada pela sua nutricionista em {fmtDate(updatedAt)}.</p> : null}
      {sections.map(({ section, fields }) => (
        <Card key={section.id}>
          <CardHeader title={section.title} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className={field.wide || field.type === "repeater" || field.type === "frequency" ? "sm:col-span-2" : undefined}
                >
                  <dt className="text-xs font-medium text-slate-500">{field.label}</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">
                    <Answer field={field} value={data[field.id]} />
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
