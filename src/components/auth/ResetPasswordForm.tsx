"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/client-api";

/** Formulário da página aberta pelo link de nova senha. */
export function ResetPasswordForm({ token, firstName, email }: { token: string; firstName: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== String(form.get("confirm") ?? "")) return setError("As duas senhas não são iguais.");
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ redirect: string }>("/api/auth/reset-password", { body: { token, password } });
      router.replace(data.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a senha.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Criar nova senha</h1>
      <p className="mt-1 text-sm text-slate-500">Olá, {firstName}! Escolha uma senha nova para a sua conta.</p>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 [overflow-wrap:anywhere]">
        Conta: <strong className="font-medium text-slate-900">{email}</strong>
      </p>
      <form onSubmit={onSubmit} onChange={() => error && setError(null)} method="post" className="mt-6 space-y-4">
        {/* Para o gerenciador de senhas salvar a senha nova na conta certa. */}
        <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
        <Field label="Nova senha" htmlFor="new-password">
          <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Repita a nova senha" htmlFor="confirm-password">
          <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        {error ? <Alert tone="red">{error}</Alert> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          <KeyRound className="h-4 w-4" /> {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        Depois de salvar, você já entra na sua conta, e ela é desconectada dos outros aparelhos.
      </p>
    </Card>
  );
}
