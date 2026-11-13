"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { Alert, Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { api } from "@/lib/client-api";
import { fmtDate } from "@/lib/format";
import { prepareImage } from "@/lib/image";

export type ExamItem = {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  description: string | null;
  createdAt: string;
  uploadedById: string | null;
  byPatient: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024;

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Envio e lista de exames (PDF ou foto). */
export function ExamUploads({
  patientId,
  exams,
  viewer,
  currentUserId,
}: {
  patientId: string;
  exams: ExamItem[];
  viewer: "PATIENT" | "NUTRITIONIST";
  currentUserId: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      // Foto de exame: reduz no celular, mas mantém o texto legível.
      const blob = file.type.startsWith("image/") ? await prepareImage(file, { maxSide: 2200, quality: 0.85 }) : file;
      if (blob.size > MAX_BYTES) throw new Error("O arquivo deve ter no máximo 10 MB.");
      const form = new FormData();
      const name = blob === file ? file.name : file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
      form.set("file", blob, name);
      if (description.trim()) form.set("description", description.trim());
      await api(`/api/patients/${patientId}/exams`, { method: "POST", formData: form });
      setFile(null);
      setDescription("");
      if (input.current) input.current.value = "";
      setMessage({
        tone: "green",
        text: viewer === "PATIENT" ? "Exame enviado. Sua nutricionista recebeu o aviso no chat." : "Arquivo anexado ao prontuário.",
      });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Não foi possível enviar." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(exam: ExamItem) {
    if (!window.confirm(`Excluir "${exam.fileName}"?`)) return;
    try {
      await api(`/api/exams/${exam.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "red", text: err instanceof Error ? err.message : "Não foi possível excluir." });
    }
  }

  return (
    <Card id="exames" className="scroll-mt-20">
      <CardHeader
        icon={<Paperclip className="h-5 w-5" />}
        title={viewer === "PATIENT" ? "Meus exames" : "Exames enviados"}
        description={
          viewer === "PATIENT"
            ? "Envie foto ou PDF dos seus exames. Sua nutricionista recebe o aviso no chat."
            : "Arquivos enviados pelo paciente ou anexados por você."
        }
      />
      <CardBody className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              id={`exam-file-${patientId}`}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setMessage(null);
              }}
            />
            <label
              htmlFor={`exam-file-${patientId}`}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/40"
            >
              <Upload className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 truncate">{file ? file.name : "Escolher arquivo (PDF ou foto, até 10 MB)"}</span>
            </label>
            {file ? (
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                placeholder="Descrição (opcional). Ex.: hemograma de outubro"
                aria-label="Descrição do exame"
              />
            ) : null}
          </div>
          <Button onClick={upload} disabled={!file || busy} className="sm:w-auto">
            <Upload className="h-4 w-4" /> {busy ? "Enviando..." : "Enviar"}
          </Button>
        </div>
        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

        {exams.length ? (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {exams.map((exam) => {
              const canDelete = viewer === "NUTRITIONIST" || exam.uploadedById === currentUserId;
              const Icon = exam.mime === "application/pdf" ? FileText : ImageIcon;
              return (
                <li key={exam.id} className="flex items-start gap-3 px-3 py-2.5">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/api/exams/${exam.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline"
                    >
                      {exam.fileName}
                    </a>
                    {exam.description ? <p className="text-sm text-slate-600">{exam.description}</p> : null}
                    <p className="text-xs text-slate-500">
                      {fmtDate(exam.createdAt)} · {fmtSize(exam.size)} ·{" "}
                      {exam.byPatient ? (viewer === "PATIENT" ? "enviado por você" : "enviado pelo paciente") : "anexado pela nutricionista"}
                    </p>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => remove(exam)}
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Excluir ${exam.fileName}`}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhum exame enviado ainda.</p>
        )}
      </CardBody>
    </Card>
  );
}
