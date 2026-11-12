import { ApiError, apiUser, route } from "@/lib/api";
import { searchLocalFoods, searchOpenFoodFacts } from "@/lib/foods";
import { rateLimit } from "@/lib/rate-limit";

export const GET = route(async (request: Request) => {
  const user = await apiUser("NUTRITIONIST");
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const source = url.searchParams.get("source") === "off" ? "off" : "local";
  if (q.length < 2) return Response.json({ results: [] });

  if (source === "off") {
    // O Open Food Facts limita as buscas; evitamos excesso por usuário.
    const limit = rateLimit(`off:${user.id}`, 20, 60 * 1000);
    if (!limit.ok) throw new ApiError(429, "Muitas buscas seguidas. Aguarde alguns segundos.");
    try {
      return Response.json({ results: await searchOpenFoodFacts(q) });
    } catch (error) {
      console.error("Open Food Facts:", error);
      throw new ApiError(502, "Não foi possível consultar o Open Food Facts agora. Tente novamente.");
    }
  }

  return Response.json({ results: await searchLocalFoods(q, user.id) });
});
