import { apiUser, route } from "@/lib/api";
import { acceptInvite } from "@/lib/links";

/** Paciente logado aceita o convite individual enviado pela nutricionista. */
export const POST = route(async (_request: Request, ctx: RouteContext<"/api/invites/[token]">) => {
  const user = await apiUser("PATIENT");
  const { token } = await ctx.params;
  await acceptInvite(user.id, token);
  return Response.json({ redirect: "/paciente" });
});
