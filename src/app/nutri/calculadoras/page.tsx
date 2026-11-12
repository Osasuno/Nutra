import type { Metadata } from "next";
import { ClinicalCalculators } from "@/components/calculators/ClinicalCalculators";
import { EnergyCalculator } from "@/components/calculators/EnergyCalculator";
import { PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Calculadoras" };

export default function CalculatorsPage() {
  return (
    <>
      <PageHeader
        title="Calculadoras nutricionais"
        description="Use sem vincular a um paciente. Para salvar metas no prontuário, use a aba “Energia e metas” do paciente."
      />
      <SectionTitle>Gasto energético e macronutrientes</SectionTitle>
      <EnergyCalculator />
      <SectionTitle className="mt-10">Avaliação nutricional</SectionTitle>
      <ClinicalCalculators />
      <p className="mt-8 text-xs text-slate-400">
        As fórmulas apoiam a decisão clínica e não substituem a avaliação individualizada da nutricionista.
      </p>
    </>
  );
}
