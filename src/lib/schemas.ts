import {
  dateOnlySchema,
  emailSchema,
  nameSchema,
  optionalText,
  phoneSchema,
  sexSchema,
  z,
} from "./validation";

// Esquemas compartilhados pelas rotas /api.

export const optionalEmail = z
  .union([z.literal(""), emailSchema])
  .nullish()
  .transform((v) => (v ? v : null));

export const patientDataSchema = z.object({
  name: nameSchema,
  email: optionalEmail,
  phone: phoneSchema,
  birthDate: dateOnlySchema,
  sex: sexSchema,
  objective: optionalText(300),
});

export type PatientDataInput = z.input<typeof patientDataSchema>;
