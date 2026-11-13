// Reduz fotos no navegador antes do envio: economiza dados no celular e espaço no banco.

const MAX_SIDE = 1280;
const QUALITY = 0.82;

/** Fotos de prato: 1280 px bastam. Exames: maior, para o texto continuar legível. */
export async function prepareImage(file: File, { maxSide = MAX_SIDE, quality = QUALITY } = {}): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 400_000 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    // Formato que o navegador não decodifica (ex.: HEIC fora do Safari): envia o original.
    return file;
  }
}
