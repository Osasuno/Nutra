"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui";

/** Exibe com vírgula decimal (padrão brasileiro). */
const format = (value: number | null) => (value === null ? "" : String(value).replace(".", ","));

const parse = (text: string): number | null => {
  if (text.trim() === "") return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Campo numérico controlado que aceita digitação parcial (ex.: "72,"). */
export function NumberInput({
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(format(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    // Valor alterado de fora (ex.: botão de atalho): sincroniza o texto.
    setSynced(value);
    if (parse(text) !== value) setText(format(value));
  }
  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const next = e.target.value.replace(/[^0-9.,-]/g, "");
        setText(next);
        const parsed = parse(next);
        setSynced(parsed);
        onValueChange(parsed);
      }}
      {...props}
    />
  );
}
