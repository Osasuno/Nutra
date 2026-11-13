import { apiUser, route } from "@/lib/api";
import { notificationCounts } from "@/lib/notifications";

export const GET = route(async () => {
  const user = await apiUser();
  return Response.json(await notificationCounts(user.id, user.role));
});
