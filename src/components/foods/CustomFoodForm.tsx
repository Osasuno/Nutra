"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client-api";
import type { FoodResult } from "@/lib/food-types";
import { fmt } from "@/lib/format";

type Values = {
  name: string;
  brand: string;
  category: string;
  portion: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
};

const EMPTY: Values = {
  name: "",
  brand: "",
  category: "",
  portion: 100,
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
  fiber: null,
  sodium: null,
};

/** Cadastro de alimento/receita própria. Aceita valores por porção e converte para 100 g. */
export function CustomFoodForm({
  onCreated,
  initial,
}: {
  onCreated: (food: FoodResult) => void;
  initial?: Partial<Values>;
}) {
  const [v, setV] = useState<Values>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const factor = v.portion && v.portion > 0 ? 100 / v.portion : 1;
  const per100 = (x: number | null) => (x === null ? 0 : x * factor);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (v.kcal === null || v.protein === null || v.carbs === null || v.fat === null) {
      setError("Preencha energia, proteínas, carboidratos e gorduras.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ food: FoodResult }>("/api/foods", {
        body: {
          name: v.name,
          brand: v.brand || null,
          category: v.category || null,
          energyKcal: per100(v.kcal),
          protein: per100(v.protein),
          carbs: per100(v.carbs),
          fat: per100(v.fat),
          fiber: per100(v.fiber),
          sodium: per100(v.sodium),
        },
      });
      setV(EMPTY);
      onCreated(data.food);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nome" htmlFor="cf-name">
        <Input id="cf-name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={200} placeholder="Ex.: Panqueca de banana (receita)" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca (opcional)" htmlFor="cf-brand">
          <Input id="cf-brand" value={v.brand} onChange={(e) => set("brand", e.target.value)} maxLength={100} />
        </Field>
        <Field label="Categoria (opcional)" htmlFor="cf-cat">
          <Input id="cf-cat" value={v.category} onChange={(e) => set("category", e.target.value)} maxLength={100} placeholder="Ex.: Receitas" />
        </Field>
      </div>
      <Field label="Os valores abaixo referem-se a (g)" htmlFor="cf-portion" hint="Use 100 g ou a porção do rótulo; convertemos para 100 g.">
        <NumberInput id="cf-portion" value={v.portion} onValueChange={(x) => set("portion", x)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Energia (kcal)" htmlFor="cf-kcal">
          <NumberInput id="cf-kcal" value={v.kcal} onValueChange={(x) => set("kcal", x)} />
        </Field>
        <Field label="Proteínas (g)" htmlFor="cf-p">
          <NumberInput id="cf-p" value={v.protein} onValueChange={(x) => set("protein", x)} />
        </Field>
        <Field label="Carboidratos (g)" htmlFor="cf-c">
          <NumberInput id="cf-c" value={v.carbs} onValueChange={(x) => set("carbs", x)} />
        </Field>
        <Field label="Gorduras (g)" htmlFor="cf-f">
          <NumberInput id="cf-f" value={v.fat} onValueChange={(x) => set("fat", x)} />
        </Field>
        <Field label="Fibras (g)" htmlFor="cf-fib">
          <NumberInput id="cf-fib" value={v.fiber} onValueChange={(x) => set("fiber", x)} />
        </Field>
        <Field label="Sódio (mg)" htmlFor="cf-na">
          <NumberInput id="cf-na" value={v.sodium} onValueChange={(x) => set("sodium", x)} />
        </Field>
      </div>
      {v.portion && v.portion !== 100 && v.kcal !== null ? (
        <p className="text-xs text-slate-500">Equivale a {fmt(per100(v.kcal), 0)} kcal por 100 g.</p>
      ) : null}
      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button type="submit" disabled={loading}>
        <Plus className="h-4 w-4" /> {loading ? "Salvando..." : "Salvar alimento"}
      </Button>
    </form>
  );
}
