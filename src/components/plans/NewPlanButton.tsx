"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client-api";

export function NewPlanButton({ patientId, fromPlanId, label }: { patientId: string; fromPlanId?: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={fromPlanId ? "ghost" : "primary"}
      size={fromPlanId ? "sm" : "md"}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await api<{ id: string }>(`/api/patients/${patientId}/meal-plans`, { body: { fromPlanId } });
          router.push(`/nutri/pacientes/${patientId}/plano/${res.id}`);
        } catch (err) {
          window.alert(err instanceof Error ? err.message : "Erro ao criar plano.");
          setLoading(false);
        }
      }}
    >
      {fromPlanId ? <Copy className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {label ?? (fromPlanId ? "Duplicar" : "Novo plano alimentar")}
    </Button>
  );
}
