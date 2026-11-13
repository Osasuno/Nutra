import "server-only";
import { ApiError } from "./api";
import { prisma } from "./db";

// Exames enviados pelo paciente (ou anexados pela nutricionista): PDF ou imagem, guardados
// no banco como as fotos do diário e servidos só para o paciente e a nutricionista dele.

export const EXAM_MAX_BYTES = 10 * 1024 * 1024;
/** Teto por paciente para não estourar o espaço do banco (Supabase gratuito: 500 MB). */
export const EXAM_MAX_FILES = 60;

const ascii = (b: Buffer, start: number, end: number) => b.subarray(start, end).toString("latin1");

// Tipo pelo conteúdo do arquivo (não pela extensão nem pelo tipo informado pelo navegador).
const SIGNATURES = [
  { mime: "application/pdf", test: (b: Buffer) => ascii(b, 0, 5) === "%PDF-" },
  { mime: "image/jpeg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b: Buffer) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/webp", test: (b: Buffer) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
] as const;

const EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Nome seguro para exibir e para o download (sem caminho nem caracteres de controle). */
export function cleanFileName(name: string, mime: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .trim()
    .slice(0, 120);
  const ext = EXTENSION[mime];
  const withoutExt = base.replace(/\.[a-z0-9]{2,5}$/i, "");
  return `${withoutExt || "exame"}.${ext}`;
}

export async function saveExam(file: File, input: { patientId: string; uploadedById: string; description: string | null }) {
  if (file.size === 0) throw new ApiError(400, "O arquivo está vazio.");
  if (file.size > EXAM_MAX_BYTES) throw new ApiError(413, "O arquivo deve ter no máximo 10 MB.");
  const count = await prisma.examFile.count({ where: { patientId: input.patientId } });
  if (count >= EXAM_MAX_FILES) {
    throw new ApiError(400, `Limite de ${EXAM_MAX_FILES} arquivos atingido. Exclua exames antigos para enviar novos.`);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = SIGNATURES.find((s) => s.test(buffer));
  if (!signature) throw new ApiError(415, "Formato não suportado. Envie PDF ou foto (JPG, PNG ou WEBP).");
  return prisma.examFile.create({
    data: {
      patientId: input.patientId,
      uploadedById: input.uploadedById,
      fileName: cleanFileName(file.name, signature.mime),
      mime: signature.mime,
      size: buffer.length,
      description: input.description,
      data: new Uint8Array(buffer),
    },
    select: { id: true, fileName: true },
  });
}

export type ExamListItem = {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  description: string | null;
  createdAt: string;
  uploadedById: string | null;
  byPatient: boolean;
};

/** Lista os exames do paciente (sem o conteúdo). */
export async function listExams(patientId: string, patientUserId: string | null): Promise<ExamListItem[]> {
  const rows = await prisma.examFile.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, mime: true, size: true, description: true, createdAt: true, uploadedById: true },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    byPatient: Boolean(patientUserId && r.uploadedById === patientUserId),
  }));
}
