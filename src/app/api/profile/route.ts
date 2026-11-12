import { prisma } from "@/lib/db";
import { apiUser, readJson, route } from "@/lib/api";
import { dateOnlySchema, nameSchema, phoneSchema, sexSchema, z } from "@/lib/validation";

const nutriSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  crn: z.string().trim().min(3).max(30),
  specialties: z.string().trim().max(300).default(""),
  bio: z.string().trim().max(2000).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(2).default(""),
  acceptingPatients: z.boolean(),
  showInDirectory: z.boolean(),
});

const patientSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  birthDate: dateOnlySchema,
  sex: sexSchema,
});

export const PATCH = route(async (request: Request) => {
  const user = await apiUser();
  if (user.role === "NUTRITIONIST") {
    const data = await readJson(request, nutriSchema);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        phone: data.phone,
        nutritionistProfile: {
          update: {
            crn: data.crn,
            specialties: data.specialties,
            bio: data.bio,
            city: data.city,
            state: data.state.toUpperCase(),
            acceptingPatients: data.acceptingPatients,
            showInDirectory: data.showInDirectory,
          },
        },
      },
    });
  } else {
    const data = await readJson(request, patientSchema);
    await prisma.user.update({
      where: { id: user.id },
      data: { name: data.name, phone: data.phone, birthDate: data.birthDate, sex: data.sex },
    });
  }
  return Response.json({ ok: true });
});
