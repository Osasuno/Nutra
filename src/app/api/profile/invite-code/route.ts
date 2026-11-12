import { prisma } from "@/lib/db";
import { apiUser, route } from "@/lib/api";
import { uniqueInviteCode } from "@/lib/links";

/** Gera um novo código de convite (o anterior deixa de funcionar). */
export const POST = route(async () => {
  const user = await apiUser("NUTRITIONIST");
  const inviteCode = await uniqueInviteCode();
  await prisma.nutritionistProfile.update({ where: { userId: user.id }, data: { inviteCode } });
  return Response.json({ inviteCode });
});
