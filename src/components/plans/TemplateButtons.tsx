"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client-api";
import { fmt } from "@/lib/format";

/** No editor: guarda a versão salva do plano como modelo da nutricionista. */
export function SaveAsTemplateButton({ planId, defaultTitle, dirty }: { planId: string; defaultTitle: string; dirty: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/plan-templates", { body: { fromPlanId: planId, title: title.trim() || defaultTitle } });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o modelo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setTitle(defaultTitle);
          setDone(false);
          setError(null);
          setOpen(true);
        }}
        title="Salvar como modelo"
        aria-label="Salvar como modelo"
      >
        <LayoutTemplate className="h-4 w-4" />
      </Button>
      {open ? (
        <Modal title="Salvar como modelo" onClose={() => setOpen(false)}>
          {done ? (
            <div className="space-y-3">
              <Alert tone="green">Modelo salvo. Em outro paciente, use “Usar modelo” ao criar o plano.</Alert>
              <div className="flex justify-end gap-2">
                <Link href="/nutri/modelos" className="text-sm font-medium text-emerald-700 hover:underline">
                  Ver modelos
                </Link>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <p className="text-sm text-slate-600">
                O modelo guarda as refeições, os alimentos, as substituições e as orientações. As metas não vão: o plano novo usa as do
                paciente.
              </p>
              {dirty ? <Alert tone="yellow">Há alterações não salvas: o modelo usa a última versão salva do plano.</Alert> : null}
              <Field label="Nome do modelo" htmlFor="template-title">
                <Input id="template-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus />
              </Field>
              {error ? <Alert tone="red">{error}</Alert> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar modelo
                </Button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}
    </>
  );
}

export type TemplateOption = { id: string; title: string; meals: number; items: number; kcal: number };

/** Na lista de planos do paciente: cria um plano a partir de um modelo. */
export function UseTemplateButton({ patientId, templates }: { patientId: string; templates: TemplateOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function use(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await api<{ id: string }>(`/api/patients/${patientId}/meal-plans`, { body: { fromTemplateId: id } });
      router.push(`/nutri/pacientes/${patientId}/plano/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o plano.");
      setBusy(null);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <LayoutTemplate className="h-4 w-4" /> Usar modelo
      </Button>
      {open ? (
        <Modal title="Criar plano a partir de um modelo" onClose={() => setOpen(false)}>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-600">
              Você ainda não tem modelos. Abra um plano e use o botão <strong>Salvar como modelo</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">As metas do plano novo seguem este paciente (protocolo e cálculo de energia).</p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                      <p className="text-xs text-slate-500">
                        {t.meals} refeições · {t.items} alimentos · {fmt(t.kcal, 0)} kcal
                      </p>
                    </div>
                    <Button size="sm" onClick={() => void use(t.id)} disabled={busy !== null} className="shrink-0">
                      {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Usar
                    </Button>
                  </li>
                ))}
              </ul>
              {error ? <Alert tone="red">{error}</Alert> : null}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}
