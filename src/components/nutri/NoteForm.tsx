"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { Alert, Button, Textarea } from "@/components/ui";
import { api } from "@/lib/client-api";

export function NoteForm({ patientId, compact = false }: { patientId: string; compact?: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/patients/${patientId}/notes`, { body: { content } });
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={compact ? 2 : 5}
        maxLength={10000}
        placeholder="Registre a evolução da consulta, condutas, combinados... (visível só para você)"
      />
      {error ? <Alert tone="red">{error}</Alert> : null}
      <Button type="submit" size="sm" disabled={loading || !content.trim()}>
        <NotebookPen className="h-4 w-4" /> {loading ? "Salvando..." : "Adicionar anotação"}
      </Button>
    </form>
  );
}
