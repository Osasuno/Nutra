import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError } from "./api";
import { prisma } from "./db";

// Fotos do diário alimentar. Ficam no banco (tabela Photo), funcionam em hospedagens
// sem disco persistente e só são servidas por /api/uploads/[nome] depois de checar
// a permissão de acesso. O navegador reduz as fotos antes do envio (src/lib/image.ts).

const MAX_BYTES = 5 * 1024 * 1024;

const ascii = (b: Buffer, start: number, end: number) => b.subarray(start, end).toString("latin1");

const SIGNATURES = [
  { ext: "jpg", mime: "image/jpeg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    mime: "image/png",
    test: (b: Buffer) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  { ext: "webp", mime: "image/webp", test: (b: Buffer) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP" },
  { ext: "gif", mime: "image/gif", test: (b: Buffer) => ascii(b, 0, 4) === "GIF8" },
] as const;

export const UPLOAD_NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new ApiError(400, "O arquivo está vazio.");
  if (file.size > MAX_BYTES) throw new ApiError(413, "A foto deve ter no máximo 5 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = SIGNATURES.find((s) => s.test(buffer));
  if (!signature) throw new ApiError(415, "Formato não suportado. Envie uma foto JPG, PNG, WEBP ou GIF.");
  const name = `${randomUUID()}.${signature.ext}`;
  await prisma.photo.create({
    data: { id: name, mime: signature.mime, size: buffer.length, data: new Uint8Array(buffer) },
  });
  return name;
}

export async function readUpload(name: string) {
  if (!UPLOAD_NAME_RE.test(name)) return null;
  const photo = await prisma.photo.findUnique({ where: { id: name }, select: { data: true, mime: true } });
  return photo ? { data: photo.data, mime: photo.mime } : null;
}

export async function deleteUpload(name: string | null | undefined) {
  if (!name || !UPLOAD_NAME_RE.test(name)) return;
  await prisma.photo.deleteMany({ where: { id: name } });
}

export async function deleteUploads(names: (string | null | undefined)[]) {
  const ids = names.filter((n): n is string => Boolean(n && UPLOAD_NAME_RE.test(n)));
  if (ids.length) await prisma.photo.deleteMany({ where: { id: { in: ids } } });
}
