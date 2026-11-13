"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Send, X } from "lucide-react";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { prepareImage } from "@/lib/image";
import { FOLLOWED_PLAN, MEAL_TYPES, MOODS, PHOTO_DAYS_AFTER_FEEDBACK, PHOTO_DAYS_WITHOUT_FEEDBACK } from "@/lib/meal-log";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function guessMealType() {
  const h = new Date().getHours();
  if (h < 9) return "Café da manhã";
  if (h < 11) return "Lanche da manhã";
  if (h < 15) return "Almoço";
  if (h < 18) return "Lanche da tarde";
  if (h < 21) return "Jantar";
  return "Ceia";
}

function Scale({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      {/* Celular: duas fileiras iguais (0–5 e 6–10) com botões maiores para o dedo. */}
      <div className="grid grid-cols-6 gap-1.5 sm:flex sm:flex-wrap sm:gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            aria-pressed={value === n}
            className={cn(
              "h-10 rounded-md text-sm font-medium sm:h-8 sm:w-8 sm:text-xs",
              value === n ? "bg-emerald-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MealLogForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState("");
  const [mealType, setMealType] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hunger, setHunger] = useState<number | null>(null);
  const [satiety, setSatiety] = useState<number | null>(null);
  const [mood, setMood] = useState("");
  const [followedPlan, setFollowedPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Data/hora e refeição sugeridas pelo relógio do aparelho. Definidas só após montar,
  // porque o servidor não conhece o fuso horário do paciente.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(nowLocal());
    setMealType(guessMealType());
  }, []);

  // Libera a URL da pré-visualização ao trocar de foto ou sair da página.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choosePhoto(file: File | null) {
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!photo && !description.trim()) {
      setError("Envie uma foto ou descreva o que comeu.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const form = new FormData();
      form.set("date", new Date(date).toISOString());
      form.set("mealType", mealType);
      form.set("description", description);
      if (hunger !== null) form.set("hunger", String(hunger));
      if (satiety !== null) form.set("satiety", String(satiety));
      if (mood) form.set("mood", mood);
      if (followedPlan) form.set("followedPlan", followedPlan);
      if (photo) {
        const blob = await prepareImage(photo);
        const name = blob.type === "image/jpeg" ? "foto.jpg" : photo.name;
        form.set("photo", blob, name);
      }
      await api(`/api/patients/${patientId}/meal-logs`, { formData: form });
      setDescription("");
      choosePhoto(null);
      setHunger(null);
      setSatiety(null);
      setMood("");
      setFollowedPlan("");
      setDate(nowLocal());
      setMealType(guessMealType());
      if (fileRef.current) fileRef.current.value = "";
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={<Camera className="h-5 w-5" />}
        title="Registrar refeição"
        description="A foto é opcional: você pode só descrever o que comeu."
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Refeição" htmlFor="ml-type">
              <Select id="ml-type" value={mealType} onChange={(e) => setMealType(e.target.value)} required>
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data e hora" htmlFor="ml-date">
              <Input id="ml-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Foto do prato (opcional)</p>
            {preview ? (
              <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Pré-visualização da foto" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    choosePhoto(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
                  aria-label="Remover foto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full max-w-xs flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
              >
                <ImagePlus className="h-6 w-6" /> Tirar ou escolher foto
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1.5 max-w-xs text-xs text-slate-500">
              A foto fica guardada até {PHOTO_DAYS_AFTER_FEEDBACK} dias depois do feedback da sua nutricionista, ou{" "}
              {PHOTO_DAYS_WITHOUT_FEEDBACK} dias se ela ainda não comentou. O registro e o feedback continuam no diário.
            </p>
          </div>

          <Field label="O que você comeu?" htmlFor="ml-desc">
            <Textarea
              id="ml-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={3000}
              placeholder="Ex.: 4 colheres de arroz, 1 concha de feijão, 1 filé de frango grelhado e salada"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Scale label="Fome antes (0 = nenhuma, 10 = muita)" value={hunger} onChange={setHunger} />
            <Scale label="Saciedade depois (0 = nenhuma, 10 = muito cheio)" value={satiety} onChange={setSatiety} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Como você estava se sentindo?" htmlFor="ml-mood">
              <Select id="ml-mood" value={mood} onChange={(e) => setMood(e.target.value)}>
                <option value="">Não informar</option>
                {MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Em relação ao plano</p>
              <div className="flex flex-wrap gap-2">
                {FOLLOWED_PLAN.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFollowedPlan(followedPlan === f.value ? "" : f.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm",
                      followedPlan === f.value ? "bg-emerald-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <Alert tone="red">{error}</Alert> : null}
          {success ? <Alert tone="green">Refeição registrada! Sua nutricionista vai ver no painel.</Alert> : null}
          <Button type="submit" disabled={loading || !date} className="w-full sm:w-auto">
            <Send className="h-4 w-4" /> {loading ? "Enviando..." : "Registrar"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
