"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { INSTALL_STEPS, promptInstall, useInstallState } from "@/components/pwa/InstallAppButton";
import { NotificationsBanner } from "@/components/pwa/NotificationsCard";
import { usePush } from "@/components/pwa/usePush";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const DISMISS_KEY = "nutra:primeiros-passos";
const subscribeStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

type Step = { id: string; title: string; done: boolean; optional?: boolean; body: React.ReactNode };

/**
 * Primeiros passos do paciente na tela de início: instalar o app, ativar as notificações,
 * registrar a primeira refeição e enviar exames. Some quando termina ou quando a pessoa fecha;
 * aí volta o aviso de notificações de sempre.
 */
export function FirstSteps({ hasMealLog, hasExam }: { hasMealLog: boolean; hasExam: boolean }) {
  const install = useInstallState();
  const push = usePush();
  const dismissed = useSyncExternalStore(subscribeStorage, () => localStorage.getItem(DISMISS_KEY) === "1", () => true);
  const [closed, setClosed] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const installed = install === "standalone" || install === "installed";
  // Sem suporte a notificações neste aparelho, o passo não trava o resto.
  const pushDone = push.state === "on" || push.state === "unsupported" || push.state === "unavailable";

  const steps: Step[] = [
    {
      id: "instalar",
      title: "Instale o app",
      done: installed,
      body:
        install === "prompt" ? (
          <Button size="sm" onClick={() => void promptInstall()}>
            Instalar
          </Button>
        ) : install === "ios" || install === "android" || install === "desktop" ? (
          <>
            <button type="button" onClick={() => setShowHow((v) => !v)} className="text-sm font-medium text-emerald-700 hover:underline">
              {showHow ? "Esconder o passo a passo" : "Como instalar"}
            </button>
            {showHow ? (
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs text-slate-600">
                {INSTALL_STEPS[install].map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : null}
          </>
        ) : null,
    },
    {
      id: "notificacoes",
      title: "Ative as notificações",
      done: pushDone,
      body:
        push.state === "off" ? (
          <Button size="sm" onClick={() => void push.enable()} disabled={push.busy}>
            {push.busy ? "Ativando..." : "Ativar"}
          </Button>
        ) : push.state === "ios-browser" ? (
          <p className="text-xs text-slate-600">No iPhone, instale o app primeiro e ative pelo ícone na tela de início.</p>
        ) : push.state === "denied" ? (
          <p className="text-xs text-slate-600">Estão bloqueadas neste aparelho: libere nas configurações do navegador.</p>
        ) : null,
    },
    {
      id: "diario",
      title: "Registre sua primeira refeição",
      done: hasMealLog,
      body: (
        <Link href="/paciente/diario" className="text-sm font-medium text-emerald-700 hover:underline">
          Abrir o diário
        </Link>
      ),
    },
    {
      id: "exames",
      title: "Envie seus exames, se tiver",
      done: hasExam,
      optional: true,
      body: (
        <Link href="/paciente/anamnese#exames" className="text-sm font-medium text-emerald-700 hover:underline">
          Enviar exames
        </Link>
      ),
    },
  ];
  const required = steps.filter((s) => !s.optional);
  const complete = required.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;

  // Antes de saber o estado do aparelho, não mostra nada (evita piscar).
  if (install === "server" || push.state === "loading") return null;
  if (dismissed || closed || complete) return <NotificationsBanner role="PATIENT" />;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setClosed(true);
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-white" aria-label="Primeiros passos">
      <div className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-950">Primeiros passos</p>
          <p className="text-sm text-emerald-900/80">
            {doneCount} de {steps.length} feitos. Leva poucos minutos.
          </p>
        </div>
        <button type="button" onClick={close} className="-mr-1 shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Fechar primeiros passos">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="divide-y divide-slate-100">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 px-4 py-3">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Feito" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" aria-label="A fazer" />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className={cn("text-sm font-medium", step.done ? "text-slate-400 line-through" : "text-slate-800")}>{step.title}</p>
              {!step.done ? step.body : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
