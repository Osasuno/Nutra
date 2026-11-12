import { apiUser, route } from "@/lib/api";
import { searchMeasures } from "@/lib/foods";

export const GET = route(async (request: Request) => {
  await apiUser("NUTRITIONIST");
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ results: [] });
  return Response.json({ results: await searchMeasures(q) });
});
