// Dicas para o paciente que usa (ou usou) caneta, em linguagem simples. Aparecem na tela do
// plano do paciente só quando a nutricionista libera (Patient.glp1TipsShared). Vêm das mesmas
// fontes de glp1.ts, mas sem números de proteína (a meta que vale é a do plano) e sem ajuste de
// remédio (para o paciente, só "fale com seu médico").

import { GLP1_USE, type AnamnesisData } from "./anamnesis";
import type { Glp1RefKey } from "./glp1";

export type PatientTip = { id: string; title: string; text: string; tone?: "danger" };
export type PatientTipGroup = { id: string; title: string; tips: PatientTip[] };
export type PatientTips = {
  status: "current" | "past";
  /** Sinal de alerta, sempre visível no topo (só para quem usa agora). */
  alert: PatientTip | null;
  groups: PatientTipGroup[];
  refs: Glp1RefKey[];
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Dicas para o paciente (null quando a anamnese não indica uso de caneta). */
export function glp1PatientTips(data: AnamnesisData): PatientTips | null {
  const use = data.glp1Uso;
  if (use !== GLP1_USE[1] && use !== GLP1_USE[2]) return null;
  const current = use === GLP1_USE[1];
  const diseases = list(data.doencas);
  const symptoms = current ? list(data.glp1Sintomas) : [];
  const kidney = diseases.includes("Doença renal");
  const hypertension = diseases.includes("Hipertensão arterial");
  const diabetes = diseases.includes("Diabetes tipo 1") || diseases.includes("Diabetes tipo 2");
  // Na doença renal a quantidade de líquidos pode ser limitada: vale a da equipe.
  const fluids = kidney ? "com a quantidade de líquidos que sua equipe indicou" : "sempre com bastante líquido";

  const food: PatientTip[] = [];
  if (current) {
    food.push(
      {
        id: "pouco",
        title: "Coma pouco de cada vez",
        text: "Com menos fome, faça refeições pequenas a cada 3 a 4 horas, começando por um café da manhã leve. Nos primeiros dias de tratamento, comidas gordurosas e com muita fibra podem piorar o enjoo.",
      },
      {
        id: "liquidos",
        title: "Beba líquidos",
        text: kidney
          ? "Enjoo, vômito ou diarreia desidratam e podem prejudicar os rins. Siga a quantidade de líquidos que sua equipe indicou e avise se tiver vômito ou diarreia."
          : "Enjoo, vômito ou diarreia podem desidratar. Beba água ao longo do dia.",
      },
    );
  }
  food.push(
    {
      id: "proteina",
      title: "Proteína em todas as refeições",
      text: "Ela ajuda a não perder músculo enquanto você emagrece. As quantidades certas para você estão no seu plano alimentar.",
    },
    {
      id: "comida",
      title: "Comida de verdade",
      text: "Prefira alimentos in natura e minimamente processados, como os do seu plano. O enjoo pode dar vontade de doces e farinha branca: evite.",
    },
  );
  if (symptoms.includes("Constipação (intestino preso)")) {
    food.push({
      id: "intestino",
      title: "Intestino preso",
      text: `Aumente aos poucos as frutas (ameixa ajuda), as verduras e os outros alimentos com fibra, ${fluids}.`,
    });
  }
  if (current) {
    food.push({ id: "alcool", title: "Álcool", text: "O álcool pode piorar o enjoo e o refluxo. Quanto menos, melhor." });
  }

  const body: PatientTip[] = [
    {
      id: "forca",
      title: "Treino de força",
      text: "Emagrecer também leva músculo e osso. O recomendado é treino de força pelo menos 3 vezes por semana e 150 minutos de atividade aeróbica moderada por semana. Combine com um profissional de educação física.",
    },
  ];
  if (!current) {
    body.push({
      id: "depois",
      title: "Depois de parar a caneta",
      text: "É comum o peso voltar depois que o remédio é suspenso. Manter a proteína, o treino de força e o acompanhamento ajuda a segurar o resultado.",
    });
  }

  const care: PatientTip[] = [];
  if (current) {
    care.push(
      { id: "anestesia", title: "Cirurgia, exame com sedação ou anestesia", text: "Avise a equipe que você usa a caneta." },
      {
        id: "receita",
        title: "Só com receita",
        text: "Use a caneta só com receita e acompanhamento médico. Desconfie de produtos manipulados, importados ou vendidos sem receita.",
      },
    );
    if (hypertension) {
      care.push({
        id: "pressao",
        title: "Pressão alta",
        text: "Se você toma remédio para pressão, meça a pressão e avise seu médico se sentir tontura ou fraqueza, principalmente ao levantar. Não mude a dose por conta própria.",
      });
    }
    if (diabetes) {
      care.push({
        id: "glicose",
        title: "Diabetes",
        text: "A caneta junto com insulina ou alguns remédios para diabetes pode baixar demais a glicose. Combine com seu médico como medir e o que fazer.",
      });
    }
    if (kidney) {
      care.push({ id: "rins", title: "Rins", text: "Evite ficar desidratado(a) e faça os exames dos rins que seu médico pedir." });
    }
    if (data.gestante === "Sim") {
      care.push({ id: "gravidez", title: "Gravidez", text: "Se você está grávida ou planeja engravidar, fale com seu médico sobre a caneta." });
    }
  }

  const groups: PatientTipGroup[] = [
    { id: "dia", title: "No dia a dia", tips: food },
    { id: "corpo", title: "Corpo", tips: body },
  ];
  if (care.length) groups.push({ id: "cuidados", title: "Cuidados", tips: care });

  const refs: Glp1RefKey[] = ["advisory", "guia"];
  if (current) refs.push("anvisa", "anvisaIrregular");
  if (current && hypertension) refs.push("hypotension");
  if (current && data.gestante === "Sim") refs.push("who");

  return {
    status: current ? "current" : "past",
    alert: current
      ? {
          id: "alerta",
          tone: "danger",
          title: "Sinal de alerta",
          text: "Dor forte na barriga que não passa, que pode ir para as costas, com enjoo e vômito: procure atendimento médico na hora.",
        }
      : null,
    groups,
    refs,
  };
}
