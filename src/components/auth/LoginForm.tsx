"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api } from "@/lib/client-api";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ redirect: string }>("/api/auth/login", {
        body: { email: form.get("email"), password: form.get("password"), next },
      });
      router.replace(data.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">Acesse sua conta de nutricionista ou paciente.</p>
      {/* method="post": se enviado antes do JavaScript carregar, a senha não vai para a URL. */}
      <form onSubmit={onSubmit} method="post" className="mt-6 space-y-4">
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {error ? <Alert tone="red">{error}</Alert> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          <LogIn className="h-4 w-4" /> {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-emerald-700 hover:underline">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}
