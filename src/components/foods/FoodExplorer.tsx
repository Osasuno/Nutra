"use client";

import { useState } from "react";
import { Plus, Salad, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { NUTRIENT_LABELS, type FoodResult } from "@/lib/food-types";
import { fmtNutrient } from "@/lib/format";
import { CustomFoodForm } from "./CustomFoodForm";
import { FoodSearch } from "./FoodSearch";
import { PortionPanel } from "./PortionPanel";

export function FoodExplorer() {
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col">
        <CardHeader
          title="Buscar alimentos"
          description="Valores por 100 g da parte comestível."
          action={
            <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Novo alimento
            </Button>
          }
        />
        <CardBody className="flex min-h-0 flex-1 flex-col">
          <FoodSearch
            autoFocus
            refreshKey={refreshKey}
            selectedKey={selected?.key}
            onSelect={(f) => {
              setSelected(f);
              setCreating(false);
            }}
          />
        </CardBody>
      </Card>

      <div className="space-y-6">
        {creating ? (
          <Card>
            <CardHeader
              title="Novo alimento personalizado"
              description="Receitas, produtos e alimentos que não estão na TACO. Visível só para você."
              action={
                <button type="button" onClick={() => setCreating(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>
              }
            />
            <CardBody>
              <CustomFoodForm
                onCreated={(food) => {
                  setCreating(false);
                  setSelected(food);
                  setRefreshKey((k) => k + 1);
                }}
              />
            </CardBody>
          </Card>
        ) : null}

        {selected ? (
          <>
            <Card>
              <CardHeader title="Calcular porção" />
              <CardBody>
                <PortionPanel key={selected.key} food={selected} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Composição por 100 g" />
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  {[
                    ["Energia", fmtNutrient(selected.per100.kcal, 0), "kcal"],
                    ["Proteínas", fmtNutrient(selected.per100.protein), "g"],
                    ["Carboidratos", fmtNutrient(selected.per100.carbs), "g"],
                    ["Gorduras", fmtNutrient(selected.per100.fat), "g"],
                    ["Fibras", fmtNutrient(selected.per100.fiber), "g"],
                    ["Sódio", fmtNutrient(selected.per100.sodium, 0), "mg"],
                    ...Object.entries(selected.extra)
                      .filter(([key, value]) => NUTRIENT_LABELS[key] && value !== null)
                      .map(([key, value]) => [NUTRIENT_LABELS[key].label, fmtNutrient(value, 2), NUTRIENT_LABELS[key].unit]),
                  ].map(([label, value, unit]) => (
                    <div key={label} className="flex justify-between border-b border-slate-100 py-1">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-medium text-slate-900">
                        {value} {value !== "—" ? unit : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-400">
                  {selected.source === "TACO"
                    ? "Fonte: TACO 4ª ed. (NEPA/UNICAMP). Tr = traços."
                    : selected.source === "OFF"
                      ? "Fonte: Open Food Facts (ODbL)."
                      : "Alimento cadastrado por você."}
                </p>
              </CardBody>
            </Card>
          </>
        ) : !creating ? (
          <EmptyState
            icon={<Salad className="h-8 w-8" />}
            title="Selecione um alimento"
            description="Veja proteínas, carboidratos, gorduras e micronutrientes, calcule porções em gramas e consulte medidas caseiras."
          />
        ) : null}
      </div>
    </div>
  );
}
