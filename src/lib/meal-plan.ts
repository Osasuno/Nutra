import { measureText } from "./measures";
import { MAX_SUBSTITUTES, SUBSTITUTE_BY } from "./substitutes";
import { optionalText, z } from "./validation";

// Formato do plano alimentar trocado entre o editor e a API.

export const DEFAULT_MEALS = [
  { name: "Café da manhã", time: "07:00" },
  { name: "Lanche da manhã", time: "10:00" },
  { name: "Almoço", time: "12:30" },
  { name: "Lanche da tarde", time: "16:00" },
  { name: "Jantar", time: "19:30" },
];

const num = (max: number) => z.number().min(0).max(max);

const per100Schema = z.object({
  kcal: num(1000),
  protein: num(100),
  carbs: num(100),
  fat: num(100),
  fiber: num(100),
  sodium: num(100000),
});

const substituteSchema = z.object({
  foodId: z
    .string()
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  foodSource: z.enum(["TACO", "CUSTOM", "OFF"]),
  foodName: z.string().trim().min(1).max(300),
  quantityG: z.number().positive().max(5000),
  measure: z
    .object({ unit: z.string().trim().min(1).max(80), unitG: z.number().positive().max(5000), qty: z.number().positive().max(100) })
    .nullish()
    .transform((v) => v ?? null),
  per100: per100Schema,
  auto: z.boolean(),
});

/** Gravadas em JSON no item; sem opções vira null. */
const substitutesSchema = z
  .object({ by: z.enum(SUBSTITUTE_BY), options: z.array(substituteSchema).max(MAX_SUBSTITUTES) })
  .nullish()
  .transform((v) => (v && v.options.length ? JSON.stringify(v) : null));

export const mealItemSchema = z
  .object({
    foodId: z.string().max(100).nullish(),
    foodSource: z.enum(["TACO", "CUSTOM", "OFF"]),
    foodName: z.string().trim().min(1).max(300),
    quantityG: num(5000),
    householdMeasure: optionalText(200),
    measureUnit: optionalText(80),
    measureUnitG: z.number().positive().max(5000).nullish(),
    measureQty: z.number().positive().max(100).nullish(),
    energyKcal100: num(1000),
    protein100: num(100),
    carbs100: num(100),
    fat100: num(100),
    fiber100: num(100),
    sodium100: num(100000),
    substitutes: substitutesSchema,
    notes: optionalText(500),
  })
  // A medida estruturada vem completa (unidade, peso e quantidade) ou não vem. Com ela, o
  // texto que o paciente lê ("2 conchas") é gerado aqui, igual ao que o editor mostra.
  .transform(({ measureUnit, measureUnitG, measureQty, ...item }) =>
    measureUnit && measureUnitG && measureQty
      ? { ...item, householdMeasure: measureText({ unit: measureUnit, qty: measureQty }), measureUnit, measureUnitG, measureQty }
      : { ...item, measureUnit: null, measureUnitG: null, measureQty: null },
  );

export const mealSchema = z.object({
  name: z.string().trim().min(1).max(100),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullish()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  notes: optionalText(3000),
  items: z.array(mealItemSchema).max(100),
});

const target = z.number().min(0).max(20000).nullable();

export const mealPlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  notes: optionalText(5000),
  targetKcal: target,
  targetProtein: target,
  targetCarbs: target,
  targetFat: target,
  meals: z.array(mealSchema).max(20),
});

export type MealPlanInput = z.input<typeof mealPlanSchema>;
