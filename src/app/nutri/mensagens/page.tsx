import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar, Card, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { fmtRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Mensagens" };

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Mensagens" description="Conversas com seus pacientes ativos, das mais recentes para as mais antigas." />
      <Suspense fallback={<PageSkeleton />}>
        <Inbox />
      </Suspense>
    </>
  );
}

async function Inbox() {
  const user = await requireUser("NUTRITIONIST");
  const patients = await prisma.patient.findMany({
    where: { nutritionistId: user.id, status: "ACTIVE", userId: { not: null } },
    select: {
      id: true,
      name: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true },
      },
      _count: { select: { messages: { where: { readAt: null, senderId: { not: user.id } } } } },
    },
  });

  const sorted = patients.sort((a, b) => {
    const ta = a.messages[0]?.createdAt.getTime() ?? 0;
    const tb = b.messages[0]?.createdAt.getTime() ?? 0;
    return tb - ta;
  });

  if (!sorted.length) {
    return (
      <EmptyState
        icon={<MessageCircle className="h-8 w-8" />}
        title="Nenhuma conversa"
        description="Quando seus pacientes criarem a conta, você poderá conversar com eles por aqui."
      />
    );
  }

  return (
    <Card className="divide-y divide-slate-100">
      {sorted.map((p) => {
        const last = p.messages[0];
        const unread = p._count.messages;
        return (
          <Link key={p.id} href={`/nutri/pacientes/${p.id}/chat`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <Avatar name={p.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={unread ? "font-semibold text-slate-900" : "font-medium text-slate-800"}>{p.name}</p>
                {last ? <span className="shrink-0 text-xs text-slate-400">{fmtRelative(last.createdAt)}</span> : null}
              </div>
              <p className="truncate text-sm text-slate-500">
                {last ? `${last.senderId === user.id ? "Você: " : ""}${last.content}` : "Nenhuma mensagem ainda"}
              </p>
            </div>
            {unread ? (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">{unread}</span>
            ) : null}
          </Link>
        );
      })}
    </Card>
  );
}
