"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client-api";

export function PasswordForm() {
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    if (form.get("next") !== form.get("confirm")) {
      setMessage({ tone: "red", text: "A confirmação não confere." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await api("/api/profile/password", { body: { current: form.get("current"), next: form.get("next") } });
      formEl.reset();
      setMessage({ tone: "green", text: "Senha alterada." });
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Erro ao alterar a senha." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} method="post" className="space-y-3">
      <Field label="Senha atual" htmlFor="pw-current">
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nova senha" htmlFor="pw-next">
          <Input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="pw-confirm">
          <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Button type="submit" variant="outline" disabled={loading}>
        <KeyRound className="h-4 w-4" /> {loading ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
