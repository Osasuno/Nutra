import type { Metadata } from "next";
import { FoodExplorer } from "@/components/foods/FoodExplorer";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Alimentos" };

export default function FoodsPage() {
  return (
    <>
      <PageHeader
        title="Alimentos"
        description="Tabela TACO (597 alimentos), medidas caseiras do IBGE, produtos industrializados do Open Food Facts e seus alimentos personalizados."
      />
      <FoodExplorer />
    </>
  );
}
