import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { prisma } from "./db";
import { badgeTotal, notificationCounts } from "./notifications";
import { isRole } from "./roles";

// Notificações push (Web Push com chaves VAPID). Chegam com o app em segundo plano ou fechado.
// O texto não leva conteúdo de saúde nem das mensagens: aparece na tela de bloqueio.

export type PushNotice = {
  title: string;
  body: string;
  /** Página aberta ao tocar na notificação (caminho do próprio site). */
  url: string;
  /** Notificações com a mesma tag se substituem (ex.: várias mensagens do mesmo chat). */
  tag?: string;
};

/** Serviços de push dos navegadores. Outros endereços são recusados (o servidor faria POST neles). */
const PUSH_HOSTS = [".googleapis.com", ".push.apple.com", ".push.services.mozilla.com", ".notify.windows.com"];

export function isPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((h) => url.hostname.endsWith(h) || url.hostname === h.slice(1));
  } catch {
    return false;
  }
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

let configured: boolean | null = null;
function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@nutra.app";
  configured = Boolean(publicKey && privateKey);
  if (configured) webpush.setVapidDetails(subject, publicKey!, privateKey!);
  return configured;
}

/** Envia para todos os aparelhos da pessoa. Endereços vencidos (404/410) são apagados. */
export async function sendPush(userId: string, notice: PushNotice): Promise<number> {
  if (!configure()) return 0;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) return 0;
  // Bolinha no ícone do app: o que está pendente, e pelo menos 1 enquanto houver aviso novo.
  // Ao abrir o app, o menu acerta o número (ver NavLinks).
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const badge = user && isRole(user.role) ? Math.max(1, badgeTotal(await notificationCounts(userId, user.role))) : 1;
  const payload = JSON.stringify({ ...notice, url: notice.url.startsWith("/") ? notice.url : "/", badge });
  let sent = 0;
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 24 * 60 * 60,
          urgency: "normal",
          topic: notice.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
        });
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
        } else {
          console.error(`Falha ao enviar notificação (status ${status ?? "?"}).`);
        }
      }
    }),
  );
  return sent;
}

/**
 * Agenda o envio para depois da resposta (não atrasa quem fez a ação). `check` confirma, já
 * depois da resposta, que o evento valeu (ex.: a transação não foi desfeita).
 */
export function pushAfter(userId: string | null | undefined, notice: PushNotice, check?: () => Promise<boolean>) {
  if (!userId) return;
  after(async () => {
    try {
      if (check && !(await check())) return;
      await sendPush(userId, notice);
    } catch (error) {
      console.error("Notificação não enviada:", error);
    }
  });
}

/** Primeiro nome, para o texto curto da notificação. */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
