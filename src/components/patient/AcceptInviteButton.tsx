"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { api } from "@/lib/client-api";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await api<{ redirect: string }>(`/api/invites/${encodeURIComponent(token)}`, { method: "POST" });
            router.replace(res.redirect);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível aceitar o convite.");
            setLoading(false);
          }
        }}
      >
        <Check className="h-4 w-4" /> {loading ? "Aceitando..." : "Aceitar convite"}
      </Button>
      {error ? <Alert tone="red">{error}</Alert> : null}
    </div>
  );
}
