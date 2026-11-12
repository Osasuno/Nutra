import { z } from "zod";

// Mensagens de validação em português.
z.config(z.locales.pt());

export { z };

export const emailSchema = z
  .email({ error: "Informe um e-mail válido." })
  .max(200)
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .max(200);

export const nameSchema = z
  .string()
  .trim()
  .min(2, { error: "Informe o nome completo." })
  .max(120);

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

/** Data no formato yyyy-mm-dd (ou vazia). Guardada ao meio-dia UTC para não "pular" de dia. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida." })
  .nullish()
  .or(z.literal(""))
  .transform((v) => (v ? new Date(`${v}T12:00:00.000Z`) : null));

export const sexSchema = z
  .enum(["F", "M"])
  .nullish()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

/** Link http(s) opcional (string vazia vira null). */
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), { error: "Informe um link começando com https://" })
  .nullish()
  .transform((v) => (v ? v : null));

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9()+\-\s]*$/, { error: "Telefone inválido." })
  .nullish()
  .transform((v) => (v ? v : null));
