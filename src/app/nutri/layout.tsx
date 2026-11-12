import { AppShell } from "@/components/shell/AppShell";
import { NUTRI_NAV } from "@/components/shell/nav-config";

export default function NutriLayout({ children }: LayoutProps<"/nutri">) {
  return (
    <AppShell items={NUTRI_NAV} homeHref="/nutri" areaLabel="Área da nutricionista">
      {children}
    </AppShell>
  );
}
