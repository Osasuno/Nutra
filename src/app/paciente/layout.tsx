import { AppShell } from "@/components/shell/AppShell";
import { PATIENT_NAV } from "@/components/shell/nav-config";

export default function PatientLayout({ children }: LayoutProps<"/paciente">) {
  return (
    <AppShell items={PATIENT_NAV} homeHref="/paciente" areaLabel="Área do paciente">
      {children}
    </AppShell>
  );
}
