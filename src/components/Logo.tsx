import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ href = "/", className, onClick }: { href?: string; className?: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn("flex items-center gap-2 font-semibold text-slate-900", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <Leaf className="h-4 w-4" />
      </span>
      <span className="text-lg tracking-tight">Nutra</span>
    </Link>
  );
}
