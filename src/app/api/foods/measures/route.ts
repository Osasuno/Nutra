import { apiUser, route } from "@/lib/api";
import { measureGroupsFor } from "@/lib/household";

/**
 * Medidas caseiras. `food`: nome do alimento escolhido (devolve o equivalente na tabela do
 * IBGE primeiro); `q`: busca livre digitada pela nutricionista.
 */
export const GET = route(async (request: Request) => {
  await apiUser("NUTRITIONIST");
  const params = new URL(request.url).searchParams;
  const food = (params.get("food") ?? "").trim().slice(0, 200);
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const term = food || q;
  if (term.length < 2) return Response.json({ groups: [] });
  return Response.json({ groups: await measureGroupsFor(term, food ? 8 : 12) });
});
