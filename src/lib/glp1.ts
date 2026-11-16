// Orientações para quem usa caneta (agonistas de GLP-1 e tirzepatida), montadas a partir da
// anamnese. Cada orientação aponta a fonte. Apoio à decisão da nutricionista: não substitui a
// avaliação médica, e ajuste de remédios é com o médico. Usado no servidor e no cliente.
//
// Revisão das fontes: 13/11/2026. Ao sair o protocolo clínico do Ministério da Saúde para o
// SUS (pedido em análise na Conitec desde 24/09/2026), revisar estes textos.

import { GLP1_SOURCES, GLP1_USE, type AnamnesisData } from "./anamnesis";
import { adjustedWeight } from "./formulas";
import { PROTOCOL_REFS, renalKind } from "./protocol";

export const GLP1_REVIEWED = "13/11/2026";

export const GLP1_REFS = {
  advisory: {
    label: "Nutritional priorities to support GLP-1 therapy for obesity (ACLM, ASN, OMA e The Obesity Society, 2025)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12125019/",
  },
  anvisa: {
    label: "Anvisa: alerta de pancreatite e uso só com prescrição (fev./2026)",
    url: "https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-emite-alerta-para-risco-de-pancreatite-aguda-associada-ao-uso-indevido-de-canetas-emagrecedoras",
  },
  anvisaIrregular: {
    label: "Anvisa e conselhos: uso seguro e produtos irregulares (abr./2026)",
    url: "https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-e-conselhos-profissionais-da-saude-firmam-parceria-para-uso-seguro-de-canetas-emagrecedoras",
  },
  who: {
    label: "OMS: diretriz sobre GLP-1 no tratamento da obesidade (dez./2025)",
    url: "https://www.who.int/news/item/01-12-2025-who-issues-global-guideline-on-the-use-of-glp-1-medicines-in-treating-obesity",
  },
  hypertension: {
    label: "Diretriz Brasileira de Hipertensão Arterial 2025 (SBC, SBH e SBN)",
    url: "https://abccardiol.org/article/diretriz-brasileira-de-hipertensao-arterial-2025/",
  },
  hypotension: {
    label: "Northwestern Medicine (ENDO 2026): pressão baixa em quem usa remédios para pressão",
    url: "https://news.northwestern.edu/stories/2026/06/glp-1s-tied-to-elevated-risk-of-low-blood-pressure-episodes-such-as-fainting-and-dizziness",
  },
  guia: {
    label: "Ministério da Saúde: Guia Alimentar para a População Brasileira",
    url: "https://www.gov.br/saude/pt-br/composicao/saps/promocao-da-saude/guias-alimentares",
  },
  ms: {
    label: "Ministério da Saúde: pedido de análise à Conitec para o SUS (set./2026)",
    url: "https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/setembro/ministerio-da-saude-protocola-na-conitec-pedido-de-analise-para-incorporacao-de-canetas-emagrecedoras-no-sus",
  },
  kdigo: PROTOCOL_REFS.kdigo,
  kdoqi: PROTOCOL_REFS.kdoqi,
} as const;

export type Glp1RefKey = keyof typeof GLP1_REFS;

export type Glp1Item = {
  id: string;
  title: string;
  text: string;
  refs: Glp1RefKey[];
  tone?: "info" | "warn" | "danger";
  /** Dado da anamnese que motivou o destaque (ex.: "não pratica atividade física"). */
  note?: string;
};

export type Glp1Group = { id: string; title: string; items: Glp1Item[] };

export type Glp1Guidance = {
  status: "current" | "past";
  medication: string | null;
  dose: string | null;
  /** Semanas desde o início do uso (quando a data foi informada). */
  weeks: number | null;
  symptoms: string[];
  alerts: Glp1Item[];
  groups: Glp1Group[];
  /** Faixa de proteína (g/dia) quando há peso registrado (null quando a doença renal muda a regra). */
  protein: { min: number; max: number; basisKg: number; basis: "atual" | "ajustado" } | null;
  /** Calorias abaixo das quais a ingestão de micronutrientes fica em risco. */
  kcalFloor: number | null;
  hypertension: boolean;
  diabetes: boolean;
  kidney: boolean;
};

export type Glp1Context = {
  sex: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const fmt1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function weeksSince(date: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.now() - new Date(`${date}T12:00:00Z`).getTime();
  return ms >= 0 ? Math.floor(ms / (7 * 86_400_000)) : null;
}

/**
 * Faixa de 1,2 a 1,6 g/kg/dia (perda de peso ativa). Com IMC ≥ 30 usa o peso ajustado
 * (IMC 22, fator 0,25), porque o peso atual superestima a necessidade.
 */
function proteinRange(ctx: Glp1Context): Glp1Guidance["protein"] {
  if (!ctx.weightKg || ctx.weightKg <= 0) return null;
  let basisKg = ctx.weightKg;
  let basis: "atual" | "ajustado" = "atual";
  if (ctx.heightCm && ctx.heightCm > 0) {
    const m = ctx.heightCm / 100;
    if (ctx.weightKg / (m * m) >= 30) {
      basisKg = adjustedWeight(ctx.weightKg, 22 * m * m);
      basis = "ajustado";
    }
  }
  return { min: Math.round(basisKg * 1.2), max: Math.round(basisKg * 1.6), basisKg: Math.round(basisKg * 10) / 10, basis };
}

/** Orientações para a pessoa (null quando não usa nem usou caneta). */
export function glp1Guidance(data: AnamnesisData, ctx: Glp1Context): Glp1Guidance | null {
  const use = data.glp1Uso;
  if (use !== GLP1_USE[1] && use !== GLP1_USE[2]) return null;
  const current = use === GLP1_USE[1];
  const diseases = list(data.doencas);
  const symptoms = current ? list(data.glp1Sintomas).filter((s) => s !== "Sem sintomas") : [];
  const has = (s: string) => symptoms.includes(s);
  const hypertension = diseases.includes("Hipertensão arterial");
  const diabetes = diseases.includes("Diabetes tipo 2") || diseases.includes("Diabetes tipo 1");
  const kidney = diseases.includes("Doença renal");
  const older = ctx.age !== null && ctx.age >= 65;
  const renalStage = kidney ? str(data.renalEstagio) : null;
  const renal = kidney ? renalKind(renalStage) : null;
  const range = proteinRange(ctx);
  // Doença renal: G1–G2 limita a 1,3 g/kg; G3 a G5, diálise, transplante ou estágio desconhecido
  // seguem a regra renal (ou a equipe), não a faixa da caneta.
  const protein =
    range && renal === "early"
      ? { ...range, max: Math.min(range.max, Math.round(range.basisKg * 1.3)) }
      : renal && renal !== "early"
        ? null
        : range;
  const kcalFloor = ctx.sex === "F" ? 1200 : ctx.sex === "M" ? 1800 : null;

  const alerts: Glp1Item[] = [];
  if (has("Dor abdominal forte")) {
    alerts.push({
      id: "dor",
      tone: "danger",
      title: "Dor abdominal forte: encaminhar ao médico agora",
      text: "Dor abdominal intensa e persistente, que pode irradiar para as costas e vir com náusea e vômitos, pode ser pancreatite. A Anvisa orienta procurar atendimento médico imediato.",
      refs: ["anvisa"],
    });
  }
  if (current && data.gestante === "Sim") {
    alerts.push({
      id: "gestacao",
      tone: "danger",
      title: "Gestação: avisar o médico",
      text: "A diretriz da OMS para obesidade exclui gestantes do uso destes medicamentos.",
      refs: ["who"],
    });
  }
  if (current && (data.glp1Origem === GLP1_SOURCES[1] || data.glp1Origem === GLP1_SOURCES[2])) {
    alerts.push({
      id: "origem",
      tone: "warn",
      title: data.glp1Origem === GLP1_SOURCES[1] ? "Medicamento manipulado" : "Uso sem prescrição",
      text: "A Anvisa orienta usar só com prescrição e acompanhamento de profissional habilitado, e alerta para produtos irregulares, manipulados e importados. Oriente procurar o médico.",
      refs: ["anvisa", "anvisaIrregular"],
    });
  }

  const water = typeof data.agua === "number" ? data.agua : null;
  const drinks = typeof data.etilismo === "string" && data.etilismo !== "Não bebe" ? data.etilismo : null;
  const inactive = data.atividadeFisica === "Não";

  const nutrition: Glp1Item[] = [];
  const stage = renalStage ? renalStage.split(" (")[0] : "";
  const renalText =
    renal === "advanced"
      ? ` Com doença renal ${stage}, vale a regra renal, e não a faixa da caneta: 0,8 g/kg por dia (KDIGO 2024)${range ? `, cerca de ${Math.round(range.basisKg * 0.8)} g com o peso ${range.basis}` : ""}.`
      : renal === "dialysis"
        ? ` Em diálise, vale a regra renal: 1,0 a 1,2 g/kg por dia (KDOQI 2020)${range ? `, ${Math.round(range.basisKg * 1)} a ${Math.round(range.basisKg * 1.2)} g com o peso ${range.basis}` : ""}.`
        : renal === "early"
          ? " Com doença renal G1–G2, evite passar de 1,3 g/kg por dia (KDIGO 2024)."
          : renal === "transplant"
            ? " Transplante renal: defina a proteína com a equipe."
            : renal === "unknown"
              ? " Há doença renal sem estágio informado: preencha o estágio na anamnese antes de definir a proteína (nos estágios G3 a G5, a meta é 0,8 g/kg por dia, pela KDIGO 2024)."
              : "";
  nutrition.push({
    id: "proteina",
    title: "Proteína para preservar músculo",
    text:
      "Na perda de peso, a meta proposta é de 1,2 a 1,6 g de proteína por kg por dia, sem ficar abaixo de 0,8 g/kg. Em obesidade não há consenso sobre qual peso usar; o peso atual superestima a necessidade." +
      (protein
        ? ` Com o peso ${protein.basis} (${fmt1(protein.basisKg)} kg): ${protein.min} a ${protein.max} g por dia.`
        : renal && renal !== "early"
          ? ""
          : " Registre uma avaliação com peso e altura para ver a faixa em gramas.") +
      renalText,
    refs: renal === "dialysis" ? ["advisory", "kdoqi"] : renal && renal !== "transplant" ? ["advisory", "kdigo"] : ["advisory"],
    tone: renal && renal !== "early" ? "warn" : undefined,
  });
  if (current) {
    nutrition.push(
      {
        id: "fracionamento",
        title: "Refeições pequenas e frequentes",
        text: "Com o apetite menor, ajudam um café da manhã pequeno e outras pequenas refeições a cada 3 a 4 horas, com líquido suficiente. Nos primeiros dias de tratamento, evitar alimentos gordurosos e ricos em fibra alivia os sintomas.",
        refs: ["advisory"],
        note: symptoms.length ? `Sintomas relatados: ${symptoms.join(", ").toLowerCase()}.` : undefined,
      },
      {
        id: "hidratacao",
        title: "Hidratação",
        text: "Náusea, vômito ou diarreia podem desidratar e causar lesão renal aguda, mesmo sem doença renal, além de palpitações. Reforce a ingestão de líquidos.",
        refs: ["advisory"],
        tone: has("Vômitos") || has("Diarreia") ? "warn" : undefined,
        note: water !== null ? `Água relatada: ${fmt1(water)} L por dia.` : undefined,
      },
    );
  }
  nutrition.push(
    {
      id: "micronutrientes",
      title: "Vitaminas e minerais",
      text: `Com a ingestão muito reduzida, ${kcalFloor ? `principalmente abaixo de ${kcalFloor.toLocaleString("pt-BR")} kcal por dia,` : "principalmente abaixo de 1.200 kcal por dia (mulheres) ou 1.800 kcal (homens),"} pode faltar ferro, cálcio, magnésio, zinco e vitaminas A, D, E, K, B1, B12 e C. Reavalie a ingestão (o diário com fotos ajuda) e os exames durante o tratamento.`,
      refs: ["advisory"],
    },
    {
      id: "qualidade",
      title: "Qualidade da alimentação",
      text: "A base são alimentos in natura e minimamente processados. A náusea pode aumentar a vontade de carboidratos refinados (farinha branca, açúcar); oriente evitá-los.",
      refs: ["guia", "advisory"],
    },
  );
  if (has("Constipação (intestino preso)")) {
    nutrition.push({
      id: "constipacao",
      title: "Intestino preso",
      text: "Aumente aos poucos as fibras dos alimentos (ameixa e outras frutas secas ajudam), sempre com líquido suficiente.",
      refs: ["advisory"],
      tone: "warn",
    });
  }
  if (current) {
    nutrition.push({
      id: "alcool",
      title: "Álcool",
      text: "O álcool pode piorar a náusea e o refluxo; o consumo deve ser o menor possível.",
      refs: ["advisory"],
      tone: drinks ? "warn" : undefined,
      note: drinks ? `Consumo relatado: ${drinks.toLowerCase()}.` : undefined,
    });
  }

  const body: Glp1Item[] = [
    {
      id: "musculo",
      title: "Massa muscular e óssea",
      text: "A perda de peso também leva músculo e osso, mais em idosos e mulheres. A recomendação é associar treino de força pelo menos 3 vezes por semana e 150 minutos de atividade aeróbica moderada por semana.",
      refs: ["advisory"],
      tone: inactive ? "warn" : undefined,
      note: inactive ? "Não pratica atividade física (anamnese)." : undefined,
    },
  ];
  if (!current) {
    body.push({
      id: "reganho",
      title: "Depois de parar a caneta",
      text: "Muitas pessoas param o tratamento (de 33% a 50% seguem usando após 1 ano) e o reganho de peso é frequente depois. Manter proteína, treino de força e acompanhamento ajuda a sustentar o resultado.",
      refs: ["advisory"],
    });
  }

  const safety: Glp1Item[] = current
    ? [
        {
          id: "sinais",
          title: "Sinais de alerta",
          text: "Dor abdominal intensa e persistente, que pode ir para as costas, com náusea e vômitos: procurar atendimento médico imediato (possível pancreatite).",
          refs: ["anvisa"],
        },
        {
          id: "sedacao",
          title: "Cirurgia, exame com sedação ou anestesia",
          text: "A pessoa deve avisar a equipe que usa a caneta: a Anvisa já alertou para risco de aspiração durante a anestesia.",
          refs: ["anvisa"],
        },
      ]
    : [];

  const groups: Glp1Group[] = [
    { id: "alimentacao", title: "Alimentação", items: nutrition },
    { id: "corpo", title: "Corpo e manutenção", items: body },
  ];

  const combos: Glp1Item[] = [];
  if (hypertension) {
    combos.push(
      {
        id: "sodio",
        title: "Hipertensão: sódio até 2 g por dia",
        text: "A diretriz brasileira de 2025 recomenda no máximo 2 g de sódio por dia (5 g de sal, cerca de 1 colher de chá), a dieta DASH e mais potássio vindo dos alimentos, exceto na doença renal crônica.",
        refs: ["hypertension"],
        note: kidney ? "Doença renal na anamnese: potássio só com orientação médica." : undefined,
      },
      {
        id: "pressao-baixa",
        title: "Hipertensão: risco de pressão baixa",
        text: "Em quem já usa dois ou mais remédios para pressão, um estudo de 2026 viu mais tontura, desmaio e pressão baixa depois de começar a caneta, principalmente acima de 65 anos e com diabetes. Oriente medir a pressão e avisar o médico, que pode ajustar a medicação.",
        refs: ["hypotension"],
        tone: has("Tontura ao levantar") || older || diabetes ? "warn" : undefined,
        note: has("Tontura ao levantar") ? "Relata tontura ao levantar." : undefined,
      },
      {
        id: "alcool-pressao",
        title: "Hipertensão: álcool",
        text: "A diretriz limita a 1 dose por dia para mulheres e 2 para homens, sem episódios de excesso. Com a caneta, quanto menos, melhor.",
        refs: ["hypertension", "advisory"],
      },
    );
  }
  if (diabetes && current) {
    combos.push({
      id: "hipoglicemia",
      title: "Diabetes: hipoglicemia",
      text: "Pode haver hipoglicemia no diabetes tipo 2, principalmente com insulina ou sulfonilureia. Combine o monitoramento da glicemia com o médico.",
      refs: ["advisory"],
    });
  }
  if (kidney && current) {
    combos.push({
      id: "rim",
      title: "Doença renal: evitar desidratação",
      text: "Quem tem doença renal, ou risco dela, deve ser orientado a evitar a desidratação e ter a função renal acompanhada pelo médico.",
      refs: ["advisory"],
      tone: "warn",
    });
  }
  if (older) {
    combos.push({
      id: "idoso",
      title: "65 anos ou mais",
      text: "Perde mais músculo e osso com o emagrecimento e tem mais risco de pressão baixa se usa remédios para pressão. Priorize proteína e treino de força.",
      refs: ["advisory", "hypotension"],
    });
  }
  if (combos.length) groups.unshift({ id: "condicoes", title: "Pelas condições da pessoa", items: combos });
  if (safety.length) groups.push({ id: "seguranca", title: "Segurança", items: safety });

  return {
    status: current ? "current" : "past",
    medication: str(data.glp1Medicamento),
    dose: current ? str(data.glp1Dose) : null,
    weeks: weeksSince(str(data.glp1Inicio)),
    symptoms,
    alerts,
    groups,
    protein,
    kcalFloor: current ? kcalFloor : null,
    hypertension,
    diabetes,
    kidney,
  };
}

export type Glp1Check = { id: string; label: string; value: string; ok: boolean | null; hint?: string };

/** Conferência do plano alimentar com as orientações (atualiza enquanto a nutricionista edita). */
export function glp1PlanChecks(g: Glp1Guidance, totals: { kcal: number; protein: number; sodium: number }): Glp1Check[] {
  const checks: Glp1Check[] = [];
  const n0 = (v: number) => Math.round(v).toLocaleString("pt-BR");
  if (g.protein) {
    const ok = totals.protein >= g.protein.min && totals.protein <= g.protein.max;
    checks.push({
      id: "proteina",
      label: "Proteína",
      value: `${n0(totals.protein)} g · meta ${g.protein.min} a ${g.protein.max} g`,
      ok: totals.kcal > 0 ? ok : null,
      hint: totals.kcal > 0 && totals.protein < g.protein.min ? "Abaixo da faixa para preservar músculo." : undefined,
    });
  }
  if (g.kcalFloor) {
    const ok = totals.kcal >= g.kcalFloor;
    checks.push({
      id: "calorias",
      label: "Calorias",
      value: `${n0(totals.kcal)} kcal · referência ${n0(g.kcalFloor)} kcal`,
      ok: totals.kcal > 0 ? ok : null,
      hint: totals.kcal > 0 && !ok ? "Abaixo disso, confira os micronutrientes do plano." : undefined,
    });
  }
  if (g.hypertension) {
    const ok = totals.sodium <= 2000;
    checks.push({
      id: "sodio",
      label: "Sódio dos alimentos",
      value: `${n0(totals.sodium)} mg · limite 2.000 mg`,
      ok: totals.kcal > 0 ? ok : null,
      hint: "Não inclui o sal do preparo.",
    });
  }
  return checks;
}
