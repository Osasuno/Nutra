"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stethoscope, User, UserPlus } from "lucide-react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

type Role = "NUTRITIONIST" | "PATIENT";

export type RegisterDefaults = {
  role: Role;
  code?: string;
  invite?: string;
  inviteInfo?: { patientName: string; email: string | null; nutritionistName: string } | null;
};

export function RegisterForm({ defaults }: { defaults: RegisterDefaults }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(defaults.role);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const invite = defaults.inviteInfo ? defaults.invite : undefined;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => {
      const v = form.get(key);
      return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    };
    if (form.get("password") !== form.get("confirm")) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    setError(null);
    const body =
      role === "NUTRITIONIST"
        ? {
            role,
            name: value("name"),
            email: value("email"),
            password: form.get("password"),
            phone: value("phone"),
            crn: value("crn"),
          }
        : {
            role,
            name: value("name"),
            email: value("email"),
            password: form.get("password"),
            phone: value("phone"),
            birthDate: value("birthDate"),
            sex: value("sex"),
            code: invite ? null : value("code"),
            invite: invite ?? null,
            consent: form.get("consent") === "on",
          };
    try {
      const data = await api<{ redirect: string; warning: string | null }>("/api/auth/register", { body });
      const target = data.warning ? `${data.redirect}?aviso=${encodeURIComponent(data.warning)}` : data.redirect;
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-500">Escolha o tipo de conta.</p>

      {!invite ? (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="tablist">
          {(
            [
              { id: "NUTRITIONIST", label: "Nutricionista", icon: Stethoscope },
              { id: "PATIENT", label: "Paciente", icon: User },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={role === opt.id}
              onClick={() => setRole(opt.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                role === opt.id ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {/* No celular a aba é estreita: sem o "Sou", o rótulo não quebra em duas linhas. */}
              <opt.icon className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">{opt.label}</span>
              <span className="hidden sm:inline">Sou {opt.label.toLowerCase()}</span>
            </button>
          ))}
        </div>
      ) : (
        <Alert tone="green" className="mt-5" title={`Convite de ${defaults.inviteInfo?.nutritionistName}`}>
          Ao criar sua conta, você será vinculado(a) automaticamente ao acompanhamento.
        </Alert>
      )}

      <form onSubmit={onSubmit} method="post" className="mt-6 space-y-4" key={role}>
        <Field label="Nome completo" htmlFor="name">
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={defaults.inviteInfo?.patientName ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={defaults.inviteInfo?.email ?? ""}
            />
          </Field>
          <Field label="Telefone / WhatsApp" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
          </Field>
        </div>

        {role === "NUTRITIONIST" ? (
          <Field label="CRN" htmlFor="crn" hint="Número de registro no Conselho Regional de Nutricionistas (ex.: CRN-3 12345).">
            <Input id="crn" name="crn" required placeholder="CRN-3 12345" />
          </Field>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data de nascimento" htmlFor="birthDate">
                <Input id="birthDate" name="birthDate" type="date" />
              </Field>
              <Field label="Sexo" htmlFor="sex" hint="Usado nas fórmulas nutricionais.">
                <Select id="sex" name="sex" defaultValue="">
                  <option value="">Selecione</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </Select>
              </Field>
            </div>
            {!invite ? (
              <Field
                label="Código da nutricionista (opcional)"
                htmlFor="code"
                hint="Se a sua nutricionista te passou um código, informe aqui. Você também pode se conectar depois."
              >
                <Input
                  id="code"
                  name="code"
                  defaultValue={defaults.code ?? ""}
                  className="uppercase"
                  maxLength={20}
                  placeholder="EX.: K7N4QP"
                />
              </Field>
            ) : null}
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </div>

        {role === "PATIENT" ? (
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-emerald-600" />
            <span>
              Autorizo o tratamento dos meus dados pessoais e de saúde pela nutricionista que me acompanha, para
              fins de atendimento nutricional, conforme a LGPD (Lei 13.709/2018).
            </span>
          </label>
        ) : null}

        {error ? <Alert tone="red">{error}</Alert> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          <UserPlus className="h-4 w-4" /> {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link
          href={invite ? `/login?next=${encodeURIComponent(`/convite/${invite}`)}` : "/login"}
          className="font-medium text-emerald-700 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </Card>
  );
}
