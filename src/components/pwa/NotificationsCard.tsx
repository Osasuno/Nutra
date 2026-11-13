"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing, X } from "lucide-react";
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { usePush, type PushState } from "./usePush";

const WHAT: Record<"PATIENT" | "NUTRITIONIST", string> = {
  PATIENT: "mensagens da nutricionista, consultas confirmadas ou remarcadas, feedback no diário e plano novo",
  NUTRITIONIST: "mensagens dos pacientes, pedidos de consulta e de acompanhamento, e exames enviados",
};

function StateText({ state }: { state: PushState }) {
  switch (state) {
    case "ios-browser":
      return (
        <>
          No iPhone, as notificações só funcionam no app instalado. Use <strong>Instalar app</strong> no menu, abra o Nutra
          pelo ícone na tela de início e ative aqui.
        </>
      );
    case "denied":
      return <>As notificações do Nutra estão bloqueadas neste aparelho. Libere nas configurações do navegador (ou do iPhone) e volte aqui.</>;
    case "unsupported":
      return <>Este navegador não recebe notificações. No celular, use o Chrome (Android) ou o app instalado (iPhone).</>;
    case "unavailable":
      return <>As notificações ainda não estão disponíveis aqui.</>;
    case "on":
      return <>Ativadas neste aparelho. Elas chegam mesmo com o app fechado ou em segundo plano.</>;
    default:
      return null;
  }
}

/** Cartão do perfil: ativar ou desativar as notificações neste aparelho. */
export function NotificationsCard({ role }: { role: "PATIENT" | "NUTRITIONIST" }) {
  const { state, busy, error, enable, disable } = usePush();
  return (
    <Card>
      <CardHeader
        icon={<Bell className="h-5 w-5" />}
        title="Notificações"
        description={`Avisos de ${WHAT[role]}. Sem o conteúdo das mensagens, que é privado.`}
      />
      <CardBody className="space-y-3">
        {state === "loading" ? <p className="text-sm text-slate-500">Verificando este aparelho...</p> : null}
        {state !== "loading" && state !== "off" ? (
          <p className="text-sm text-slate-600">
            <StateText state={state} />
          </p>
        ) : null}
        {state === "off" ? (
          <Button onClick={() => void enable()} disabled={busy}>
            <BellRing className="h-4 w-4" /> {busy ? "Ativando..." : "Ativar notificações"}
          </Button>
        ) : null}
        {state === "on" ? (
          <Button variant="outline" onClick={() => void disable()} disabled={busy}>
            <BellOff className="h-4 w-4" /> {busy ? "Desativando..." : "Desativar neste aparelho"}
          </Button>
        ) : null}
        {error ? <Alert tone="red">{error}</Alert> : null}
      </CardBody>
    </Card>
  );
}

const DISMISS_KEY = "nutra:aviso-notificacoes";
const subscribeStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** Faixa na tela inicial convidando a ativar (some quando ativa ou quando a pessoa fecha). */
export function NotificationsBanner({ role }: { role: "PATIENT" | "NUTRITIONIST" }) {
  const { state, busy, error, enable } = usePush();
  const dismissed = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem(DISMISS_KEY) === "1",
    () => true,
  );
  const [closed, setClosed] = useState(false);
  if (dismissed || closed || (state !== "off" && state !== "ios-browser")) return null;
  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setClosed(true);
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1 space-y-2">
        <p>
          {state === "ios-browser"
            ? "Para receber avisos no iPhone, instale o Nutra: menu → Instalar app. Depois ative as notificações no perfil."
            : role === "PATIENT"
              ? "Ative as notificações para saber na hora quando sua nutricionista responder ou confirmar uma consulta."
              : "Ative as notificações para saber na hora quando um paciente mandar mensagem, pedir consulta ou enviar exame."}
        </p>
        {state === "off" ? (
          <Button size="sm" onClick={() => void enable()} disabled={busy}>
            {busy ? "Ativando..." : "Ativar notificações"}
          </Button>
        ) : null}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
      <button type="button" onClick={close} className="-mr-1 shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Fechar aviso">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
