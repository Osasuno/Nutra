import type { Metadata } from "next";
import { RecipeEditor } from "@/components/recipes/RecipeEditor";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nova receita" };

export default function NewRecipePage() {
  return (
    <>
      <PageHeader title="Nova receita" description="Ingredientes, quanto rende e o modo de preparo. Os valores por porção são calculados sozinhos." />
      <RecipeEditor />
    </>
  );
}
