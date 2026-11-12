"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Calculator,
  Camera,
  ChartLine,
  ClipboardList,
  House,
  MessageCircle,
  Salad,
  Settings,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavIcon, NavItem } from "./nav-config";

const ICONS: Record<NavIcon, typeof Users> = {
  users: Users,
  messages: MessageCircle,
  foods: Salad,
  calculator: Calculator,
  settings: Settings,
  home: House,
  plan: UtensilsCrossed,
  diary: Camera,
  chart: ChartLine,
  anamnesis: ClipboardList,
  user: User,
  calendar: CalendarDays,
};

type Counts = { unreadMessages?: number; pendingRequests?: number; pendingAppointments?: number };

function isActive(item: NavItem, pathname: string | null) {
  if (!pathname) return false;
  if (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.match ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function LinkList({
  items,
  pathname,
  counts,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string | null;
  counts: Counts;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item, pathname);
        const count = item.badge ? counts[item.badge] ?? 0 : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              // No menu do celular os itens ficam um pouco mais altos (toque); a barra lateral é só lg+.
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
              active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-emerald-600" : "text-slate-400")} />
            <span className="flex-1">{item.label}</span>
            {count > 0 ? (
              <span className="min-w-5 rounded-full bg-emerald-600 px-1.5 text-center text-xs font-semibold text-white">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Versão sem destaque de rota ativa, usada enquanto a rota é resolvida. */
export function StaticNavLinks({ items }: { items: NavItem[] }) {
  return <LinkList items={items} pathname={null} counts={{}} />;
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok && !cancelled) setCounts(await res.json());
      } catch {
        // sem conexão: tenta de novo no próximo ciclo
      }
    }
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return <LinkList items={items} pathname={pathname} counts={counts} onNavigate={onNavigate} />;
}
