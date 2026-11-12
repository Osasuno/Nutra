import { Suspense } from "react";
import { Chat } from "@/components/chat/Chat";
import { PageSkeleton } from "@/components/ui";
import { toChatMessage } from "@/lib/chat";
import { prisma } from "@/lib/db";
import { requireNutriPatient } from "@/lib/dal";

export default function NutriChatPage(props: PageProps<"/nutri/pacientes/[id]/chat">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/nutri/pacientes/[id]/chat">["params"] }) {
  const { id } = await params;
  const { user, patient } = await requireNutriPatient(id);
  const rows = await prisma.message.findMany({
    where: { patientId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sender: { select: { name: true } } },
  });
  const disabledReason = !patient.userId
    ? "O paciente ainda não criou a conta. Envie o link de convite (aba “Dados e convite”) para liberar o chat."
    : patient.status !== "ACTIVE"
      ? "O acompanhamento está arquivado. Reative o paciente para conversar."
      : null;

  return (
    <Chat
      patientId={id}
      currentUserId={user.id}
      otherName={patient.name}
      initialMessages={rows.reverse().map(toChatMessage)}
      disabledReason={disabledReason}
    />
  );
}
