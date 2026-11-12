"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type EvolutionPoint = {
  date: string;
  weight: number | null;
  bodyFat: number | null;
  leanMass?: number | null;
  waist?: number | null;
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

const num = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : String(v ?? "—");

export function EvolutionChart({ points, height = 260 }: { points: EvolutionPoint[]; height?: number }) {
  const data = points.map((p) => ({ ...p, label: shortDate(p.date) }));
  const hasFat = data.some((d) => d.bodyFat !== null);
  const hasLean = data.some((d) => d.leanMass !== null && d.leanMass !== undefined);
  const hasWaist = data.some((d) => d.waist !== null && d.waist !== undefined);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis yAxisId="kg" tick={{ fontSize: 12, fill: "#64748b" }} domain={["auto", "auto"]} unit=" kg" width={70} />
          {hasFat ? (
            <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} domain={["auto", "auto"]} unit="%" width={50} />
          ) : null}
          {/* Cintura em cm tem escala própria (eixo oculto) para não se misturar com kg. */}
          {hasWaist ? <YAxis yAxisId="cm" hide domain={["auto", "auto"]} /> : null}
          <Tooltip formatter={(value) => num(value)} labelStyle={{ color: "#0f172a" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="kg" type="monotone" dataKey="weight" name="Peso (kg)" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          {hasLean ? (
            <Line yAxisId="kg" type="monotone" dataKey="leanMass" name="Massa magra (kg)" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ) : null}
          {hasFat ? (
            <Line yAxisId="pct" type="monotone" dataKey="bodyFat" name="Gordura (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ) : null}
          {hasWaist ? (
            <Line yAxisId="cm" type="monotone" dataKey="waist" name="Cintura (cm)" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} connectNulls />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
