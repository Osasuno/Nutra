"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { NumberInput } from "@/components/NumberInput";
import { FoodPickerModal, type PickedFood } from "@/components/plans/FoodPickerModal";
import { Alert, Button, Card, Field, Input, Textarea, buttonClass } from "@/components/ui";
import { api } from "@/lib/client-api";
import { fmt } from "@/lib/format";
import { newKey } from "@/lib/keys";
import { recipeNutrition, type RecipeIngredient } from "@/lib/recipes";

type Row = RecipeIngredient & { key: string };

export type RecipeEditorInitial = {
  id: string;
  name: string;
  servings: number;
  yieldG: number | null;
  steps: string;
  ingredients: RecipeIngredient[];
};

const numbersOnly = (extra: Record<string, number | null>) =>
  Object.fromEntries(Object.entries(extra).filter((e): e is [string, number] => typeof e[1] === "number"));

/** Cria ou edita uma receita: ingredientes da TACO ou da nutricionista, rendimento e preparo. */
export function RecipeEditor({ initial }: { initial?: RecipeEditorInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [servings, setServings] = useState<number | null>(initial?.servings ?? 1);
  const [yieldG, setYieldG] = useState<number | null>(initial?.yieldG ?? null);
  const [steps, setSteps] = useState(initial?.steps ?? "");
  const [rows, setRows] = useState<Row[]>(() => (initial?.ingredients ?? []).map((i) => ({ ...i, key: newKey() })));
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = useMemo(() => recipeNutrition(rows, yieldG, servings ?? 1), [rows, yieldG, servings]);
  const portion = (v: number) => (v * n.portionG) / 100;

  function addPicked(p: PickedFood) {
    setRows((list) => [
      ...list,
      {
        key: newKey(),
        foodId: p.food.id,
        foodSource: p.food.source,
        foodName: p.food.name,
        category: p.food.category,
        quantityG: p.grams,
        householdMeasure: p.householdMeasure || null,
        per100: p.food.per100,
        extra: numbersOnly(p.food.extra),
      },
    ]);
  }

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError("Dê um nome à receita.");
    if (!rows.length) return setError("Adicione pelo menos um ingrediente.");
    if (!servings || servings < 1) return setError("Informe quantas porções a receita rende.");
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        servings: Math.round(servings),
        yieldG: yieldG && yieldG > 0 ? yieldG : null,
        steps,
        ingredients: rows.map((r) => ({
          foodId: r.foodId,
          foodSource: r.foodSource,
          foodName: r.foodName,
          category: r.category,
          quantityG: r.quantityG,
          householdMeasure: r.householdMeasure,
          per100: r.per100,
          extra: r.extra,
        })),
      };
      await api(initial ? `/api/recipes/${initial.id}` : "/api/recipes", { method: initial ? "PUT" : "POST", body });
      router.push("/nutri/modelos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <Card className="space-y-4 p-4 sm:p-5">
          <Field label="Nome da receita" htmlFor="recipe-name">
            <Input id="recipe-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Ex.: Panqueca de banana" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rende (porções)" htmlFor="recipe-servings">
              <NumberInput id="recipe-servings" value={servings} onValueChange={setServings} />
            </Field>
            <Field label="Peso pronto (g, opcional)" htmlFor="recipe-yield">
              <NumberInput id="recipe-yield" value={yieldG} onValueChange={setYieldG} placeholder={fmt(n.totalG, 0)} />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Sem o peso pronto, vale a soma dos ingredientes ({fmt(n.totalG, 0)} g). Pese a receita pronta quando o preparo perde ou ganha água.
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-medium text-slate-800">Ingredientes</p>
            <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum ingrediente. Use “Adicionar” para buscar na TACO ou nos seus alimentos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => (
                <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800" title={row.foodName}>
                      {row.foodName}
                    </p>
                    <Input
                      value={row.householdMeasure ?? ""}
                      onChange={(e) =>
                        setRows((list) => list.map((r) => (r.key === row.key ? { ...r, householdMeasure: e.target.value || null } : r)))
                      }
                      placeholder="Medida (ex.: 1 xícara)"
                      maxLength={200}
                      className="mt-1 h-9 text-xs sm:h-8"
                      aria-label={`Medida de ${row.foodName}`}
                    />
                  </div>
                  <label className="text-xs text-slate-500">
                    Gramas
                    <NumberInput
                      value={row.quantityG}
                      onValueChange={(v) => setRows((list) => list.map((r) => (r.key === row.key ? { ...r, quantityG: v ?? 0 } : r)))}
                      className="mt-0.5 h-9 sm:h-8"
                      aria-label={`Gramas de ${row.foodName}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                    className="self-end rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remover ${row.foodName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <Field label="Modo de preparo" htmlFor="recipe-steps">
            <Textarea
              id="recipe-steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder={"1. Amasse a banana.\n2. Misture com os ovos.\n3. ..."}
            />
          </Field>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ChefHat className="h-4 w-4 text-emerald-600" /> Por porção ({fmt(n.portionG, 0)} g)
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {(
              [
                ["Energia", `${fmt(portion(n.per100.kcal), 0)} kcal`],
                ["Proteínas", `${fmt(portion(n.per100.protein), 1)} g`],
                ["Carboidratos", `${fmt(portion(n.per100.carbs), 1)} g`],
                ["Gorduras", `${fmt(portion(n.per100.fat), 1)} g`],
                ["Fibras", `${fmt(portion(n.per100.fiber), 1)} g`],
                ["Sódio", `${fmt(portion(n.per100.sodium), 0)} mg`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-2">
                <dt className="text-slate-400">{label}</dt>
                <dd className="font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Por 100 g: {fmt(n.per100.kcal, 0)} kcal. No plano, a receita aparece na busca com a medida “Porção”. Planos que já usam a
            receita mantêm os valores de quando ela foi adicionada.
          </p>
        </Card>
        {error ? <Alert tone="red">{error}</Alert> : null}
        <div className="flex gap-2">
          <Button onClick={() => void save()} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar receita
          </Button>
          <Link href="/nutri/modelos" className={buttonClass("outline")}>
            Cancelar
          </Link>
        </div>
      </div>

      {picking ? (
        <FoodPickerModal meals={[{ key: "receita", name: "a receita" }]} initialMealKey="receita" onAdd={addPicked} onClose={() => setPicking(false)} />
      ) : null}
    </div>
  );
}
