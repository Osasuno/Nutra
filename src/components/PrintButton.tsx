"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "Imprimir / salvar em PDF" }: { label?: string }) {
  return (
    <Button className="no-print" variant="outline" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {label}
    </Button>
  );
}
