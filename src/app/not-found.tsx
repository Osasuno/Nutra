import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <Logo />
      <h1 className="text-2xl font-semibold text-slate-900">Página não encontrada</h1>
      <p className="max-w-md text-sm text-slate-500">
        O endereço não existe ou você não tem acesso a este conteúdo.
      </p>
      <ButtonLink href="/">Voltar ao início</ButtonLink>
    </div>
  );
}
