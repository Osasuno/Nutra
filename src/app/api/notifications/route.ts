import { prisma } from "@/lib/db";
import { apiUser, route } from "@/lib/api";

export const GET = route(async () => {
  const user = await apiUser();

  if (user.role === "NUTRITIONIST") {
    const [unreadMessages, pendingRequests, pendingFeedback, pendingAppointments] = await Promise.all([
      prisma.message.count({
        where: {
          readAt: null,
          senderId: { not: user.id },
          patient: { nutritionistId: user.id, status: "ACTIVE" },
        },
      }),
      prisma.patient.count({ where: { nutritionistId: user.id, status: "PENDING" } }),
      prisma.mealLog.count({
        where: { feedback: null, patient: { nutritionistId: user.id, status: "ACTIVE" } },
      }),
      prisma.appointment.count({ where: { nutritionistId: user.id, status: "REQUESTED", startsAt: { gte: new Date() } } }),
    ]);
    return Response.json({ unreadMessages, pendingRequests, pendingFeedback, pendingAppointments });
  }

  const unreadMessages = await prisma.message.count({
    where: { readAt: null, senderId: { not: user.id }, patient: { userId: user.id, status: "ACTIVE" } },
  });
  return Response.json({ unreadMessages });
});
