"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { FEEDBACK_RATINGS } from "@/lib/meal-log";

export function FeedbackForm({
  logId,
  initialFeedback,
  initialRating,
}: {
  logId: string;
  initialFeedback: string | null;
  initialRating: string | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [rating, setRating] = useState<string | null>(initialRating);
  const [editing, setEditing] = useState(!initialFeedback && !initialRating);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-emerald-700 hover:underline">
        Editar feedback
      </button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await api(`/api/meal-logs/${logId}`, { method: "PATCH", body: { feedback: feedback.trim() || null, feedbackRating: rating } });
          setEditing(false);
          router.refresh();
        } catch (err) {
          window.alert(err instanceof Error ? err.message : "Erro ao salvar.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        {FEEDBACK_RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRating(rating === r.value ? null : r.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium ring-1",
              rating === r.value ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-slate-600 ring-slate-200",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
        maxLength={3000}
        placeholder="Escreva um feedback para o paciente..."
      />
      <Button type="submit" size="sm" disabled={saving || (!feedback.trim() && !rating)}>
        <Send className="h-3.5 w-3.5" /> {saving ? "Enviando..." : "Enviar feedback"}
      </Button>
    </form>
  );
}
