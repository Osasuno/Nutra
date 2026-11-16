import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeEditor } from "@/components/recipes/RecipeEditor";
import { PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { parseRecipe } from "@/lib/recipes";

export const metadata: Metadata = { title: "Receita" };

export default function EditRecipePage(props: PageProps<"/nutri/receitas/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/receitas/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser("NUTRITIONIST");
  const food = await prisma.food.findFirst({ where: { id, ownerId: user.id, source: "CUSTOM", recipe: { not: null } } });
  const recipe = food ? parseRecipe(food.recipe) : null;
  if (!food || !recipe) notFound();
  return (
    <>
      <PageHeader title={food.name} description="Editar a receita. Planos que já usam a receita mantêm os valores de quando ela foi adicionada." />
      <RecipeEditor initial={{ id: food.id, name: food.name, servings: recipe.servings, yieldG: recipe.yieldG, steps: recipe.steps, ingredients: recipe.ingredients }} />
    </>
  );
}
