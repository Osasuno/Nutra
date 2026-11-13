"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";

// Estado das notificações neste aparelho e as ações de ativar e desativar.

export type PushState =
  | "loading"
  | "unsupported" // navegador sem Web Push
  | "ios-browser" // iPhone fora do app instalado (lá não existe push)
  | "unavailable" // sem service worker (desenvolvimento) ou servidor sem chaves
  | "denied" // a pessoa bloqueou as notificações
  | "off"
  | "on";

function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a || a.byteLength !== b.byteLength) return false;
  const view = new Uint8Array(a);
  return view.every((v, i) => v === b[i]);
};

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

let publicKeyCache: Promise<string | null> | null = null;
const publicKey = () =>
  (publicKeyCache ??= api<{ publicKey: string | null }>("/api/push")
    .then((r) => r.publicKey)
    .catch(() => {
      publicKeyCache = null;
      return null;
    }));

export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      return setState(isIos() && !isStandalone() ? "ios-browser" : "unsupported");
    }
    if (isIos() && !isStandalone()) return setState("ios-browser");
    const [reg, key] = await Promise.all([registration(), publicKey()]);
    if (!reg || !key) return setState("unavailable");
    if (Notification.permission === "denied") return setState("denied");
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") {
      // Confirma no servidor que este aparelho é de quem está logado agora.
      await api("/api/push", { method: "POST", body: sub.toJSON() }).catch(() => undefined);
      return setState("on");
    }
    setState("off");
  }, []);

  useEffect(() => {
    // Lê o estado do navegador depois de montar (no servidor não existe).
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // Precisa vir do toque/clique da pessoa (exigência do iPhone e do Chrome).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const [reg, key] = await Promise.all([navigator.serviceWorker.ready, publicKey()]);
      if (!key) throw new Error("As notificações ainda não estão disponíveis.");
      const applicationServerKey = keyBytes(key);
      let sub = await reg.pushManager.getSubscription();
      // Inscrição antiga feita com outra chave do servidor: troca.
      if (sub && !sameKey(sub.options.applicationServerKey, applicationServerKey)) {
        await sub.unsubscribe();
        sub = null;
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      await api("/api/push", { method: "POST", body: sub.toJSON() });
      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await unsubscribeThisDevice();
      setState("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível desativar.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, enable, disable };
}

/** Tira este aparelho das notificações de quem está logado (também ao sair da conta). */
export async function unsubscribeThisDevice() {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/api/push", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => undefined);
  await sub.unsubscribe();
}
