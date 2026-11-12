import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Avatar, Skeleton } from "@/components/ui";
import { getCurrentUser } from "@/lib/dal";
import { LogoutButton } from "./LogoutButton";
import { MobileNav } from "./MobileNav";
import { NavLinks, StaticNavLinks } from "./NavLinks";
import type { NavItem } from "./nav-config";

export function AppShell({
  items,
  homeHref,
  areaLabel,
  children,
}: {
  items: NavItem[];
  homeHref: string;
  areaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <Logo href={homeHref} className="px-2" />
        <p className="mt-1 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">{areaLabel}</p>
        <div className="mt-6 flex-1">
          <Suspense fallback={<StaticNavLinks items={items} />}>
            <NavLinks items={items} />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <MobileNav items={items} homeHref={homeHref} />
            <Logo href={homeHref} />
          </div>
          <div className="hidden lg:block" />
          <Suspense fallback={<Skeleton className="h-8 w-40" />}>
            <UserBadge />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

async function UserBadge() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 max-w-64 text-right sm:block">
        <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <Avatar name={user.name} size="sm" />
      <LogoutButton />
    </div>
  );
}
