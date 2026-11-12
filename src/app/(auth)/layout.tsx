import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-emerald-50 to-slate-50">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}
