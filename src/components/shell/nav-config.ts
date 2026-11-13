export type NavIcon =
  | "users"
  | "messages"
  | "foods"
  | "calculator"
  | "settings"
  | "home"
  | "plan"
  | "diary"
  | "chart"
  | "anamnesis"
  | "user"
  | "calendar";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Prefixos que também ativam o item. */
  match?: string[];
  exact?: boolean;
  badge?: "unreadMessages" | "pendingRequests" | "pendingAppointments";
};

export const NUTRI_NAV: NavItem[] = [
  { href: "/nutri", label: "Pacientes", icon: "users", exact: true, match: ["/nutri/pacientes"], badge: "pendingRequests" },
  { href: "/nutri/agenda", label: "Agenda", icon: "calendar", badge: "pendingAppointments" },
  { href: "/nutri/mensagens", label: "Mensagens", icon: "messages", badge: "unreadMessages" },
  { href: "/nutri/alimentos", label: "Alimentos", icon: "foods" },
  { href: "/nutri/calculadoras", label: "Calculadoras", icon: "calculator" },
  { href: "/nutri/perfil", label: "Meu perfil", icon: "settings" },
];

export const PATIENT_NAV: NavItem[] = [
  { href: "/paciente", label: "Início", icon: "home", exact: true },
  { href: "/paciente/consultas", label: "Consultas", icon: "calendar" },
  { href: "/paciente/plano", label: "Plano alimentar", icon: "plan" },
  { href: "/paciente/diario", label: "Diário alimentar", icon: "diary" },
  { href: "/paciente/chat", label: "Chat", icon: "messages", badge: "unreadMessages" },
  { href: "/paciente/evolucao", label: "Minha evolução", icon: "chart" },
  { href: "/paciente/anamnese", label: "Anamnese e exames", icon: "anamnesis" },
  { href: "/paciente/perfil", label: "Meu perfil", icon: "user", match: ["/paciente/nutricionistas"] },
];
