"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

/** Botão que pede confirmação, chama DELETE e atualiza a página. */
export function DeleteButton({
  url,
  confirmText = "Excluir este registro?",
  label,
  redirectTo,
  className,
}: {
  url: string;
  confirmText?: string;
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      title={label ?? "Excluir"}
      className={cn(
        // Área de toque maior no celular.
        "inline-flex items-center gap-1 rounded-lg p-2.5 text-sm text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:p-1.5",
        label && "px-3 text-red-600 sm:px-3",
        className,
      )}
      onClick={async () => {
        if (!window.confirm(confirmText)) return;
        setLoading(true);
        try {
          await api(url, { method: "DELETE" });
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        } catch (err) {
          window.alert(err instanceof Error ? err.message : "Não foi possível excluir.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
      {label ? <span>{label}</span> : <span className="sr-only">Excluir</span>}
    </button>
  );
}
