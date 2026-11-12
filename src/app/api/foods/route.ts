import { prisma } from "@/lib/db";
import { apiUser, readJson, route } from "@/lib/api";
import { foodToResult } from "@/lib/foods";
import { normalizeText } from "@/lib/text";
import { z } from "@/lib/validation";

const nutrient = (max: number) => z.coerce.number().min(0).max(max);

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().max(100).nullish(),
  brand: z.string().trim().max(100).nullish(),
  energyKcal: nutrient(1000),
  protein: nutrient(100),
  carbs: nutrient(100),
  fat: nutrient(100),
  fiber: nutrient(100).default(0),
  sodium: nutrient(100000).default(0),
});

/** Alimentos personalizados da nutricionista (valores por 100 g). */
export const GET = route(async () => {
  const user = await apiUser("NUTRITIONIST");
  const foods = await prisma.food.findMany({
    where: { ownerId: user.id, source: "CUSTOM" },
    orderBy: { name: "asc" },
  });
  return Response.json({ results: foods.map(foodToResult) });
});

export const POST = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const data = await readJson(request, schema);
  const food = await prisma.food.create({
    data: {
      source: "CUSTOM",
      ownerId: user.id,
      name: data.name,
      searchName: normalizeText(`${data.name} ${data.brand ?? ""}`),
      category: data.category || "Personalizado",
      brand: data.brand || null,
      energyKcal: data.energyKcal,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber,
      sodium: data.sodium,
    },
  });
  return Response.json({ food: foodToResult(food) }, { status: 201 });
});
