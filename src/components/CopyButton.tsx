"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function CopyButton({
  value,
  label = "Copiar",
  absolute = false,
  className,
}: {
  value: string;
  label?: string;
  /** Prefixa com a origem atual (para links). */
  absolute?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("outline", "sm", className)}
      onClick={async () => {
        const text = absolute ? `${window.location.origin}${value}` : value;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt("Copie o texto:", text);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}
