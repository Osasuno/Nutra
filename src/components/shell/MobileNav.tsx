"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavLinks } from "./NavLinks";
import type { NavItem } from "./nav-config";

export function MobileNav({ items, homeHref }: { items: NavItem[]; homeHref: string }) {
  // Caminho em que o menu foi aberto (null = fechado). Se a rota muda por qualquer meio
  // (link, botão voltar do navegador), o menu some sozinho.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const close = useCallback(() => setOpenedAt(null), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpenedAt(window.location.pathname)}
        className="-ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menu"
        aria-expanded={openedAt !== null}
      >
        <Menu className="h-5 w-5" />
      </button>
      {openedAt !== null ? <Drawer openedAt={openedAt} items={items} homeHref={homeHref} onClose={close} /> : null}
    </>
  );
}

function Drawer({
  openedAt,
  items,
  homeHref,
  onClose,
}: {
  openedAt: string;
  items: NavItem[];
  homeHref: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  if (pathname !== openedAt) return null;
  // Portal para o <body>: o cabeçalho usa backdrop-blur, e um ancestral com backdrop-filter
  // passa a ser a referência do position: fixed. Dentro dele o menu ficava preso nos 56px
  // do cabeçalho, com os links por cima da página.
  return createPortal(<DrawerPanel items={items} homeHref={homeHref} onClose={onClose} />, document.body);
}

function DrawerPanel({ items, homeHref, onClose }: { items: NavItem[]; homeHref: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <Logo href={homeHref} className="px-2" onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavLinks items={items} onNavigate={onClose} />
      </div>
    </div>
  );
}
