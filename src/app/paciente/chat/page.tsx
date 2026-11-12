import { Suspense } from "react";
import type { Metadata } from "next";
import { Chat } from "@/components/chat/Chat";
import { NoLink } from "@/components/patient/NoLink";
import { PageSkeleton } from "@/components/ui";
import { toChatMessage } from "@/lib/chat";
import { prisma } from "@/lib/db";
import { getPatientLinks } from "@/lib/dal";

export const metadata: Metadata = { title: "Chat" };

export default function PatientChatPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { user, active } = await getPatientLinks();
  if (!active) return <NoLink feature="O chat" />;
  const rows = await prisma.message.findMany({
    where: { patientId: active.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sender: { select: { name: true } } },
  });
  return (
    <div className="mx-auto max-w-3xl">
      {/* Ocupa a tela abaixo do cabeçalho (56px) e do respiro do conteúdo (py-6; py-8 no desktop). */}
      <Chat
        patientId={active.id}
        currentUserId={user.id}
        otherName={active.nutritionist.name}
        initialMessages={rows.reverse().map(toChatMessage)}
        className="h-[calc(100dvh-6.5rem)] min-h-[360px] lg:h-[calc(100dvh-7.5rem)]"
      />
    </div>
  );
}
