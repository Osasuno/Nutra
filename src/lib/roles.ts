export type Role = "NUTRITIONIST" | "PATIENT";

export function homeFor(role: Role): string {
  return role === "NUTRITIONIST" ? "/nutri" : "/paciente";
}

export function isRole(value: unknown): value is Role {
  return value === "NUTRITIONIST" || value === "PATIENT";
}
