"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, Download, Share } from "lucide-react";
import { cn } from "@/lib/cn";

// Item "Instalar app" do menu. No Chrome, Edge e Android abre o convite de instalação do
// navegador (guardado por public/pwa.js); no iPhone e nos demais, mostra o passo a passo.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __nutraInstall?: InstallEvent | null;
    __nutraInstalled?: boolean;
  }
}

type State = "server" | "standalone" | "installed" | "prompt" | "ios" | "android" | "desktop";

function subscribe(onChange: () => void) {
  const standalone = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("nutra:installable", onChange);
  standalone.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("nutra:installable", onChange);
    standalone.removeEventListener("change", onChange);
  };
}

function snapshot(): State {
  const nav = navigator as Navigator & { standalone?: boolean };
  // Já aberto como app instalado: o item some.
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return "standalone";
  if (window.__nutraInstalled) return "installed";
  if (window.__nutraInstall) return "prompt";
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac; a tela de toque denuncia.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

const STEPS: Record<"ios" | "android" | "desktop", React.ReactNode[]> = {
  ios: [
    <>
      Toque em <strong>Compartilhar</strong> <Share className="inline h-3.5 w-3.5 align-[-2px]" aria-label="ícone de compartilhar" /> na barra do navegador.
    </>,
    <>
      Escolha <strong>Adicionar à Tela de Início</strong> (role a lista, se precisar).
    </>,
    <>
      Toque em <strong>Adicionar</strong>. O Nutra aparece na tela como um app.
    </>,
  ],
  android: [
    <>
      Abra o menu do navegador (<strong>⋮</strong>).
    </>,
    <>
      Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
    </>,
  ],
  desktop: [
    <>
      No Chrome ou no Edge, clique no ícone de instalar na barra de endereço, ou no menu <strong>⋮</strong> → <strong>Instalar Nutra</strong>.
    </>,
    <>
      No Safari do Mac, use <strong>Arquivo</strong> → <strong>Adicionar ao Dock</strong>.
    </>,
  ],
};

export function InstallAppButton({ className }: { className?: string }) {
  const state = useSyncExternalStore(subscribe, snapshot, (): State => "server");
  const [open, setOpen] = useState(false);
  if (state === "server" || state === "standalone") return null;

  if (state === "installed") {
    return (
      <p className={cn("flex items-center gap-2 px-3 py-2 text-sm text-emerald-700", className)}>
        <CheckCircle2 className="h-4 w-4" /> App instalado
      </p>
    );
  }

  async function install() {
    const event = window.__nutraInstall;
    if (!event) return setOpen((v) => !v);
    await event.prompt();
    const { outcome } = await event.userChoice;
    // O convite só pode ser usado uma vez.
    window.__nutraInstall = null;
    if (outcome === "accepted") window.__nutraInstalled = true;
    window.dispatchEvent(new Event("nutra:installable"));
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void install()}
        aria-expanded={state === "prompt" ? undefined : open}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:py-2"
      >
        <Download className="h-4 w-4 text-slate-400" />
        <span className="flex-1">Instalar app</span>
      </button>
      {open && state !== "prompt" ? (
        <div className="mx-1 mt-1 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <p className="mb-1.5 font-medium text-slate-700">Para ter o Nutra como app:</p>
          <ol className="list-decimal space-y-1 pl-4">
            {STEPS[state].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
