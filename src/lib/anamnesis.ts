// Definição da anamnese nutricional. O formulário é gerado a partir deste
// esquema e as respostas são guardadas como JSON (campo -> valor).

export type ShowIf = { field: string; in: string[] } | { sex: "F" | "M" };

type Base = {
  id: string;
  label: string;
  help?: string;
  placeholder?: string;
  unit?: string;
  showIf?: ShowIf;
  /** Visível e editável apenas pela nutricionista. */
  nutriOnly?: boolean;
  /** Ocupa a linha inteira no grid. */
  wide?: boolean;
};

export type TextField = Base & { type: "text" | "textarea" | "date" | "time" };
export type NumberField = Base & { type: "number"; min?: number; max?: number; step?: number };
export type OptionsField = Base & {
  type: "select" | "radio" | "checkboxes";
  options: string[];
  descriptions?: Record<string, string>;
};
export type ScaleField = Base & { type: "scale"; min: number; max: number; minLabel?: string; maxLabel?: string };
export type RepeaterColumn = {
  id: string;
  label: string;
  type?: "text" | "number" | "time" | "date" | "textarea";
  suggestions?: string[];
  grow?: boolean;
};
export type RepeaterField = Base & { type: "repeater"; columns: RepeaterColumn[]; addLabel: string; maxRows?: number };
export type FrequencyField = Base & { type: "frequency"; items: string[]; options: string[] };

export type AnamnesisField = TextField | NumberField | OptionsField | ScaleField | RepeaterField | FrequencyField;

export type AnamnesisSection = {
  id: string;
  title: string;
  description?: string;
  nutriOnly?: boolean;
  showIf?: ShowIf;
  fields: AnamnesisField[];
};

export type AnamnesisValue = string | number | string[] | Record<string, string>[] | Record<string, string>;
export type AnamnesisData = Record<string, AnamnesisValue>;

const YES_NO = ["Sim", "Não"];
const FREQ_SIMPLE = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"];

export const COMMON_EXAMS = [
  "Glicemia de jejum",
  "Hemoglobina glicada (HbA1c)",
  "Insulina de jejum",
  "HOMA-IR",
  "Colesterol total",
  "HDL",
  "LDL",
  "Colesterol não-HDL",
  "Triglicerídeos",
  "TSH",
  "T4 livre",
  "Vitamina D (25-OH)",
  "Vitamina B12",
  "Ácido fólico",
  "Ferritina",
  "Ferro sérico",
  "Hemoglobina",
  "Hematócrito",
  "Ácido úrico",
  "Creatinina",
  "Ureia",
  "TGO (AST)",
  "TGP (ALT)",
  "GGT",
  "PCR ultrassensível",
  "Zinco",
  "Magnésio",
  "Sódio",
  "Potássio",
  "Cálcio",
  "Albumina",
  "Testosterona",
  "Estradiol",
  "Cortisol",
];

export const MEAL_NAMES = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
  "Pré-treino",
  "Pós-treino",
];

export const ANAMNESIS_SECTIONS: AnamnesisSection[] = [
  {
    id: "identificacao",
    title: "Identificação e rotina",
    description: "Contexto social e rotina do paciente.",
    fields: [
      {
        id: "estadoCivil",
        label: "Estado civil",
        type: "select",
        options: ["Solteiro(a)", "Casado(a) / união estável", "Divorciado(a)", "Viúvo(a)"],
      },
      { id: "profissao", label: "Profissão / ocupação", type: "text" },
      {
        id: "escolaridade",
        label: "Escolaridade",
        type: "select",
        options: [
          "Fundamental incompleto",
          "Fundamental completo",
          "Médio incompleto",
          "Médio completo",
          "Superior incompleto",
          "Superior completo",
          "Pós-graduação",
        ],
      },
      {
        id: "trabalhoModelo",
        label: "Modelo de trabalho",
        type: "radio",
        options: ["Presencial", "Home office", "Híbrido", "Turnos / plantões", "Não trabalha"],
      },
      { id: "horarioTrabalho", label: "Horário de trabalho/estudo", type: "text", placeholder: "Ex.: 8h às 18h, seg. a sex." },
      { id: "moraCom", label: "Mora com quem?", type: "text", placeholder: "Ex.: cônjuge e 2 filhos" },
      {
        id: "quemPrepara",
        label: "Quem prepara as refeições?",
        type: "checkboxes",
        options: ["Eu mesmo(a)", "Familiar", "Funcionário(a)", "Compro pronto / delivery", "Restaurante / refeitório"],
      },
      {
        id: "ondeRefeicoes",
        label: "Onde costuma fazer as refeições?",
        type: "checkboxes",
        options: ["Em casa", "No trabalho", "Restaurante", "Marmita", "Delivery", "No carro / em trânsito"],
      },
    ],
  },
  {
    id: "objetivos",
    title: "Motivo da consulta e objetivos",
    fields: [
      { id: "motivo", label: "Qual o principal motivo da consulta?", type: "textarea", wide: true },
      {
        id: "objetivos",
        label: "Objetivos",
        type: "checkboxes",
        wide: true,
        options: [
          "Emagrecimento",
          "Ganho de massa muscular",
          "Melhorar exames / saúde",
          "Performance esportiva",
          "Reeducação alimentar",
          "Gestação / amamentação",
          "Controle de doença",
          "Mais energia e disposição",
          "Melhorar o intestino",
          "Melhorar a relação com a comida",
        ],
      },
      { id: "expectativas", label: "O que espera do acompanhamento?", type: "textarea", wide: true },
      { id: "prazo", label: "Existe algum prazo ou evento importante?", type: "text", placeholder: "Ex.: casamento em março" },
      { id: "motivacao", label: "Nível de motivação para mudanças", type: "scale", min: 0, max: 10, minLabel: "Nenhuma", maxLabel: "Total" },
      { id: "acompanhamentoAnterior", label: "Já fez acompanhamento nutricional?", type: "radio", options: YES_NO },
      {
        id: "acompanhamentoAnteriorDetalhe",
        label: "Como foi? Por que parou?",
        type: "textarea",
        wide: true,
        showIf: { field: "acompanhamentoAnterior", in: ["Sim"] },
      },
      {
        id: "dietasAnteriores",
        label: "Dietas ou estratégias que já tentou (e resultados)",
        type: "textarea",
        wide: true,
        placeholder: "Ex.: low carb, jejum intermitente, contagem de calorias, medicamentos para emagrecer...",
      },
    ],
  },
  {
    id: "peso",
    title: "Histórico de peso",
    fields: [
      { id: "pesoReferido", label: "Peso atual referido", type: "number", unit: "kg", step: 0.1 },
      { id: "pesoUsual", label: "Peso usual (habitual)", type: "number", unit: "kg", step: 0.1 },
      { id: "pesoMaximo", label: "Maior peso na vida adulta", type: "number", unit: "kg", step: 0.1 },
      { id: "pesoMinimo", label: "Menor peso na vida adulta", type: "number", unit: "kg", step: 0.1 },
      { id: "pesoDesejado", label: "Peso desejado", type: "number", unit: "kg", step: 0.1 },
      {
        id: "variacaoRecente",
        label: "Variação de peso nos últimos 6 meses",
        type: "radio",
        options: ["Estável", "Ganhou peso", "Perdeu peso", "Oscilou muito"],
      },
      {
        id: "variacaoDetalhe",
        label: "Quanto e em quanto tempo? Foi intencional?",
        type: "text",
        showIf: { field: "variacaoRecente", in: ["Ganhou peso", "Perdeu peso", "Oscilou muito"] },
      },
      { id: "efeitoSanfona", label: "Histórico de efeito sanfona?", type: "radio", options: YES_NO },
    ],
  },
  {
    id: "clinica",
    title: "História clínica",
    description: "Doenças, cirurgias, medicamentos, alergias e intolerâncias.",
    fields: [
      {
        id: "doencas",
        label: "Doenças diagnosticadas",
        type: "checkboxes",
        wide: true,
        options: [
          "Diabetes tipo 1",
          "Diabetes tipo 2",
          "Pré-diabetes / resistência à insulina",
          "Hipertensão arterial",
          "Colesterol / triglicerídeos altos",
          "Hipotireoidismo",
          "Hipertireoidismo",
          "SOP (ovários policísticos)",
          "Esteatose hepática (gordura no fígado)",
          "Doença renal",
          "Doença cardiovascular",
          "Gastrite / úlcera",
          "Refluxo (DRGE)",
          "Síndrome do intestino irritável",
          "Doença celíaca",
          "Doença de Crohn / retocolite",
          "Anemia",
          "Osteoporose / osteopenia",
          "Gota / ácido úrico alto",
          "Câncer",
          "Ansiedade",
          "Depressão",
          "Transtorno alimentar",
          "Enxaqueca",
          "Nenhuma",
        ],
      },
      { id: "doencasOutras", label: "Outras doenças", type: "text" },
      {
        id: "doencasDetalhes",
        label: "Detalhes (tempo de diagnóstico, controle, acompanhamento médico)",
        type: "textarea",
        wide: true,
      },
      {
        id: "bariatrica",
        label: "Cirurgia bariátrica",
        type: "radio",
        options: ["Não", "Sim — bypass gástrico", "Sim — sleeve (gastrectomia vertical)", "Sim — outra técnica"],
      },
      {
        id: "bariatricaData",
        label: "Quando foi a cirurgia bariátrica?",
        type: "text",
        showIf: { field: "bariatrica", in: ["Sim — bypass gástrico", "Sim — sleeve (gastrectomia vertical)", "Sim — outra técnica"] },
      },
      {
        id: "cirurgias",
        label: "Outras cirurgias e internações",
        type: "repeater",
        wide: true,
        addLabel: "Adicionar cirurgia/internação",
        columns: [
          { id: "descricao", label: "Cirurgia / motivo", grow: true },
          { id: "ano", label: "Ano" },
          { id: "obs", label: "Observações", grow: true },
        ],
      },
      {
        id: "medicamentos",
        label: "Medicamentos em uso",
        type: "repeater",
        wide: true,
        addLabel: "Adicionar medicamento",
        columns: [
          { id: "nome", label: "Medicamento", grow: true },
          { id: "dose", label: "Dose" },
          { id: "horario", label: "Horário / frequência" },
          { id: "motivo", label: "Para quê?" },
        ],
      },
      {
        id: "suplementos",
        label: "Suplementos e fitoterápicos",
        type: "repeater",
        wide: true,
        addLabel: "Adicionar suplemento",
        columns: [
          { id: "nome", label: "Suplemento", grow: true },
          { id: "dose", label: "Dose" },
          { id: "frequencia", label: "Frequência / horário" },
        ],
      },
      { id: "alergiasAlimentares", label: "Alergias alimentares", type: "text", placeholder: "Ex.: camarão, amendoim" },
      { id: "alergiasMedicamentosas", label: "Alergias a medicamentos", type: "text" },
      {
        id: "intolerancias",
        label: "Intolerâncias / sensibilidades",
        type: "checkboxes",
        options: ["Lactose", "Glúten (não celíaca)", "Frutose", "FODMAPs", "Cafeína", "Nenhuma"],
      },
      { id: "intoleranciasDetalhe", label: "Outras intolerâncias / sintomas associados", type: "text" },
      { id: "pressaoHabitual", label: "Pressão arterial habitual", type: "text", placeholder: "Ex.: 12x8" },
    ],
  },
  {
    id: "familiar",
    title: "Histórico familiar",
    fields: [
      {
        id: "historicoFamiliar",
        label: "Doenças na família (pais, irmãos, avós)",
        type: "checkboxes",
        wide: true,
        options: [
          "Diabetes",
          "Hipertensão",
          "Obesidade",
          "Infarto / AVC / doença cardíaca",
          "Colesterol alto",
          "Câncer",
          "Doenças da tireoide",
          "Doença renal",
          "Osteoporose",
          "Transtornos psiquiátricos",
          "Nenhuma conhecida",
        ],
      },
      { id: "historicoFamiliarDetalhe", label: "Quem e qual doença?", type: "textarea", wide: true },
    ],
  },
  {
    id: "sintomas",
    title: "Sinais, sintomas e digestão",
    description: "Apetite, sistema digestório, hábito intestinal e urinário, sinais clínicos.",
    fields: [
      { id: "apetite", label: "Apetite", type: "radio", options: ["Diminuído", "Normal", "Aumentado", "Oscila muito"] },
      { id: "mastigacao", label: "Mastigação", type: "radio", options: ["Rápida", "Normal", "Lenta"] },
      {
        id: "problemasMastigacao",
        label: "Mastigação e deglutição",
        type: "checkboxes",
        options: ["Dificuldade para mastigar", "Dificuldade para engolir", "Prótese dentária", "Problemas dentários", "Sem queixas"],
      },
      {
        id: "sintomasGI",
        label: "Sintomas digestivos",
        type: "checkboxes",
        wide: true,
        options: [
          "Azia / queimação",
          "Refluxo",
          "Náuseas",
          "Vômitos",
          "Distensão / estufamento",
          "Gases em excesso",
          "Dor abdominal",
          "Arrotos frequentes",
          "Digestão lenta",
          "Sem queixas",
        ],
      },
      {
        id: "frequenciaEvacuacao",
        label: "Frequência de evacuação",
        type: "select",
        options: [
          "Mais de 3 vezes ao dia",
          "2 a 3 vezes ao dia",
          "1 vez ao dia",
          "A cada 2 dias",
          "2 a 3 vezes por semana",
          "Menos de 2 vezes por semana",
        ],
      },
      {
        id: "bristol",
        label: "Formato das fezes (Escala de Bristol)",
        type: "radio",
        wide: true,
        options: ["Tipo 1", "Tipo 2", "Tipo 3", "Tipo 4", "Tipo 5", "Tipo 6", "Tipo 7"],
        descriptions: {
          "Tipo 1": "Caroços duros e separados (difícil de evacuar)",
          "Tipo 2": "Formato de salsicha, mas com caroços",
          "Tipo 3": "Salsicha com rachaduras na superfície",
          "Tipo 4": "Salsicha ou cobra, lisa e macia (ideal)",
          "Tipo 5": "Pedaços macios com bordas definidas",
          "Tipo 6": "Pedaços aerados, bordas irregulares, pastosa",
          "Tipo 7": "Totalmente líquida",
        },
      },
      { id: "esforcoEvacuar", label: "Faz esforço para evacuar?", type: "radio", options: YES_NO },
      { id: "sangueMuco", label: "Sangue ou muco nas fezes?", type: "radio", options: YES_NO },
      { id: "laxantes", label: "Usa laxantes?", type: "radio", options: YES_NO },
      {
        id: "diurese",
        label: "Diurese",
        type: "radio",
        options: ["Normal", "Pouca", "Muita", "Acorda à noite para urinar"],
      },
      {
        id: "corUrina",
        label: "Cor habitual da urina",
        type: "radio",
        options: ["Transparente", "Amarelo-claro", "Amarelo", "Amarelo-escuro", "Âmbar / castanho"],
      },
      {
        id: "sinaisClinicos",
        label: "Sinais e sintomas gerais",
        type: "checkboxes",
        wide: true,
        options: [
          "Queda de cabelo",
          "Unhas fracas / quebradiças",
          "Pele seca",
          "Acne",
          "Manchas na pele",
          "Cicatrização lenta",
          "Cãibras",
          "Formigamentos",
          "Inchaço (edema)",
          "Cansaço / fadiga",
          "Tontura",
          "Palidez",
          "Sangramento gengival",
          "Aftas frequentes",
          "Infecções frequentes",
          "Dificuldade de concentração",
          "Sem queixas",
        ],
      },
      { id: "sinaisClinicosOutros", label: "Outros sinais / sintomas", type: "text" },
    ],
  },
  {
    id: "estiloVida",
    title: "Estilo de vida",
    description: "Sono, estresse, tabagismo, álcool e atividade física.",
    fields: [
      { id: "sonoHoras", label: "Horas de sono por noite", type: "number", unit: "h", step: 0.5, min: 0, max: 24 },
      { id: "horarioDormir", label: "Horário que dorme", type: "time" },
      { id: "horarioAcordar", label: "Horário que acorda", type: "time" },
      { id: "qualidadeSono", label: "Qualidade do sono", type: "radio", options: ["Ruim", "Regular", "Boa", "Ótima"] },
      { id: "acordaNoite", label: "Acorda durante a noite?", type: "radio", options: YES_NO },
      { id: "estresse", label: "Nível de estresse", type: "scale", min: 0, max: 10, minLabel: "Nenhum", maxLabel: "Extremo" },
      { id: "ansiedade", label: "Nível de ansiedade", type: "scale", min: 0, max: 10, minLabel: "Nenhum", maxLabel: "Extremo" },
      { id: "tabagismo", label: "Tabagismo", type: "radio", options: ["Não fuma", "Fuma", "Ex-fumante"] },
      {
        id: "tabagismoDetalhe",
        label: "Quantidade por dia e há quanto tempo",
        type: "text",
        showIf: { field: "tabagismo", in: ["Fuma", "Ex-fumante"] },
      },
      {
        id: "etilismo",
        label: "Consumo de bebidas alcoólicas",
        type: "radio",
        options: ["Não bebe", "Socialmente (até 1x/semana)", "2 a 3 vezes por semana", "4 ou mais vezes por semana"],
      },
      {
        id: "etilismoDetalhe",
        label: "Tipo de bebida e quantidade por ocasião",
        type: "text",
        showIf: { field: "etilismo", in: ["Socialmente (até 1x/semana)", "2 a 3 vezes por semana", "4 ou mais vezes por semana"] },
      },
      { id: "atividadeFisica", label: "Pratica atividade física?", type: "radio", options: YES_NO },
      {
        id: "atividades",
        label: "Atividades físicas",
        type: "repeater",
        wide: true,
        addLabel: "Adicionar atividade",
        showIf: { field: "atividadeFisica", in: ["Sim"] },
        columns: [
          { id: "modalidade", label: "Modalidade", grow: true },
          { id: "frequencia", label: "Vezes/semana" },
          { id: "duracao", label: "Duração (min)" },
          { id: "horario", label: "Horário" },
          { id: "intensidade", label: "Intensidade", suggestions: ["Leve", "Moderada", "Intensa"] },
        ],
      },
      { id: "tempoSentado", label: "Tempo sentado por dia", type: "number", unit: "h", step: 0.5, min: 0, max: 24 },
    ],
  },
  {
    id: "habitos",
    title: "Hábitos alimentares",
    description: "Comportamento alimentar, líquidos, preferências e restrições.",
    fields: [
      { id: "numeroRefeicoes", label: "Número de refeições por dia", type: "number", min: 0, max: 15 },
      { id: "pulaRefeicoes", label: "Costuma pular refeições?", type: "radio", options: YES_NO },
      { id: "pulaRefeicoesQuais", label: "Quais refeições pula?", type: "text", showIf: { field: "pulaRefeicoes", in: ["Sim"] } },
      { id: "comeTela", label: "Come assistindo TV / celular?", type: "radio", options: FREQ_SIMPLE },
      {
        id: "velocidade",
        label: "Velocidade para comer",
        type: "radio",
        options: ["Rápido (< 10 min)", "Moderado (10–20 min)", "Devagar (> 20 min)"],
      },
      { id: "beliscos", label: "Belisca entre as refeições?", type: "radio", options: FREQ_SIMPLE },
      { id: "compulsao", label: "Episódios de compulsão alimentar", type: "radio", options: FREQ_SIMPLE },
      { id: "fomeEmocional", label: "Come por ansiedade, tédio ou emoções?", type: "radio", options: FREQ_SIMPLE },
      {
        id: "horarioMaisFome",
        label: "Período de maior fome",
        type: "select",
        options: ["Manhã", "Tarde", "Noite", "Madrugada", "Não percebo diferença"],
      },
      { id: "vontadeDoces", label: "Vontade de doces", type: "scale", min: 0, max: 10, minLabel: "Nenhuma", maxLabel: "Muita" },
      { id: "agua", label: "Água por dia", type: "number", unit: "L", step: 0.1, min: 0, max: 15 },
      {
        id: "outrosLiquidos",
        label: "Outras bebidas consumidas",
        type: "checkboxes",
        wide: true,
        options: [
          "Café",
          "Chá",
          "Suco natural",
          "Suco industrializado / em pó",
          "Refrigerante comum",
          "Refrigerante zero",
          "Energético",
          "Leite",
          "Bebida alcoólica",
        ],
      },
      { id: "cafe", label: "Café: quantidade e como toma", type: "text", placeholder: "Ex.: 3 xícaras/dia com açúcar" },
      { id: "acucar", label: "Para adoçar usa", type: "radio", options: ["Açúcar", "Adoçante", "Mel", "Não adoça", "Varia"] },
      { id: "adocanteTipo", label: "Qual adoçante?", type: "text", showIf: { field: "acucar", in: ["Adoçante", "Varia"] } },
      { id: "salAdicional", label: "Adiciona sal à comida pronta?", type: "radio", options: YES_NO },
      {
        id: "gordurasPreparo",
        label: "Gorduras usadas no preparo",
        type: "checkboxes",
        options: ["Óleo de soja / girassol / canola", "Azeite", "Manteiga", "Banha", "Óleo de coco", "Margarina"],
      },
      {
        id: "oleoMensal",
        label: "Consumo mensal de óleo da casa",
        type: "text",
        placeholder: "Ex.: 2 latas/mês para 3 pessoas",
      },
      {
        id: "frituras",
        label: "Frequência de frituras",
        type: "select",
        options: ["Nunca", "Menos de 1x/semana", "1–2x/semana", "3–4x/semana", "Quase todos os dias"],
      },
      { id: "foraDeCasa", label: "Refeições fora de casa / delivery por semana", type: "number", min: 0, max: 50 },
      { id: "preferencias", label: "Alimentos que mais gosta", type: "textarea", wide: true },
      { id: "aversoes", label: "Alimentos que não gosta ou não come", type: "textarea", wide: true },
      {
        id: "restricoes",
        label: "Restrições alimentares",
        type: "checkboxes",
        options: ["Vegetariano(a)", "Vegano(a)", "Sem lactose", "Sem glúten", "Religiosa", "Nenhuma"],
      },
      { id: "restricoesDetalhe", label: "Detalhes das restrições", type: "text" },
    ],
  },
  {
    id: "recordatorio",
    title: "Recordatório 24 h / dia habitual",
    description: "Descreva tudo o que comeu e bebeu ontem (ou em um dia típico), com horários e quantidades.",
    fields: [
      {
        id: "recordatorio",
        label: "Refeições",
        type: "repeater",
        wide: true,
        addLabel: "Adicionar refeição",
        maxRows: 15,
        columns: [
          { id: "horario", label: "Horário", type: "time" },
          { id: "refeicao", label: "Refeição", suggestions: MEAL_NAMES },
          { id: "local", label: "Local" },
          { id: "alimentos", label: "Alimentos e quantidades", type: "textarea", grow: true },
        ],
      },
      { id: "fimDeSemana", label: "O que muda nos fins de semana?", type: "textarea", wide: true },
    ],
  },
  {
    id: "frequencia",
    title: "Frequência alimentar",
    description: "Com que frequência consome cada grupo de alimentos.",
    fields: [
      {
        id: "qfa",
        label: "Questionário de frequência alimentar",
        type: "frequency",
        wide: true,
        options: ["Nunca/raro", "1–3x/mês", "1x/sem", "2–4x/sem", "5–6x/sem", "1x/dia", "2x+/dia"],
        items: [
          "Frutas",
          "Verduras (folhas)",
          "Legumes",
          "Feijão, lentilha, grão-de-bico",
          "Arroz, massas e pães brancos",
          "Cereais integrais",
          "Batata, mandioca, inhame",
          "Carne vermelha",
          "Frango",
          "Peixes e frutos do mar",
          "Ovos",
          "Leite e iogurte",
          "Queijos",
          "Embutidos (presunto, salsicha, bacon)",
          "Castanhas e sementes",
          "Doces e sobremesas",
          "Biscoitos recheados e salgadinhos",
          "Refrigerantes e sucos industrializados",
          "Fast food / lanches",
          "Frituras",
          "Bebidas alcoólicas",
        ],
      },
    ],
  },
  {
    id: "mulher",
    title: "Saúde da mulher",
    showIf: { sex: "F" },
    fields: [
      {
        id: "ciclo",
        label: "Ciclo menstrual",
        type: "radio",
        options: ["Regular", "Irregular", "Ausente", "Menopausa", "Não se aplica"],
      },
      { id: "dum", label: "Data da última menstruação (DUM)", type: "date" },
      { id: "tpm", label: "TPM", type: "radio", options: ["Não tem", "Leve", "Moderada", "Intensa"] },
      { id: "tpmSintomas", label: "Sintomas na TPM", type: "text", showIf: { field: "tpm", in: ["Leve", "Moderada", "Intensa"] } },
      { id: "contraceptivo", label: "Método contraceptivo / uso de hormônios", type: "text" },
      { id: "gestante", label: "Está gestante?", type: "radio", options: YES_NO },
      {
        id: "semanasGestacao",
        label: "Semanas de gestação",
        type: "number",
        min: 0,
        max: 45,
        showIf: { field: "gestante", in: ["Sim"] },
      },
      { id: "gestacoes", label: "Número de gestações anteriores", type: "number", min: 0, max: 20 },
      { id: "amamentando", label: "Está amamentando?", type: "radio", options: YES_NO },
      {
        id: "condicoesGinecologicas",
        label: "Condições ginecológicas",
        type: "checkboxes",
        options: ["Endometriose", "Miomas", "Cistos ovarianos", "Nenhuma"],
      },
      { id: "reposicaoHormonal", label: "Faz reposição hormonal?", type: "radio", options: YES_NO },
    ],
  },
  {
    id: "exames",
    title: "Exames bioquímicos",
    description: "Resultados de exames laboratoriais recentes.",
    fields: [
      {
        id: "exames",
        label: "Exames",
        type: "repeater",
        wide: true,
        addLabel: "Adicionar exame",
        maxRows: 60,
        columns: [
          { id: "exame", label: "Exame", suggestions: COMMON_EXAMS, grow: true },
          { id: "resultado", label: "Resultado" },
          { id: "unidade", label: "Unidade" },
          { id: "referencia", label: "Referência" },
          { id: "data", label: "Data", type: "date" },
        ],
      },
      { id: "examesObs", label: "Observações sobre os exames", type: "textarea", wide: true },
    ],
  },
  {
    id: "exameFisico",
    title: "Exame físico",
    description: "Preenchido pela nutricionista durante a consulta.",
    nutriOnly: true,
    fields: [
      {
        id: "sinaisFisicos",
        label: "Achados do exame físico",
        type: "checkboxes",
        wide: true,
        options: [
          "Edema de membros inferiores",
          "Ascite",
          "Perda de massa muscular (temporal, interósseos)",
          "Perda de gordura subcutânea",
          "Palidez de mucosas",
          "Icterícia",
          "Lesões de pele",
          "Coiloníquia (unhas em colher)",
          "Glossite / queilite",
          "Cabelo quebradiço / despigmentado",
          "Acantose nigricans",
          "Hirsutismo",
          "Estrias",
          "Sem alterações",
        ],
      },
      { id: "pressaoAferida", label: "Pressão arterial aferida", type: "text", unit: "mmHg", placeholder: "Ex.: 120x80" },
      { id: "frequenciaCardiaca", label: "Frequência cardíaca", type: "number", unit: "bpm", min: 20, max: 250 },
      { id: "exameFisicoObs", label: "Observações", type: "textarea", wide: true },
    ],
  },
  {
    id: "conduta",
    title: "Diagnóstico e conduta",
    description: "Conclusões da nutricionista.",
    nutriOnly: true,
    fields: [
      { id: "diagnosticoNutricional", label: "Diagnóstico nutricional", type: "textarea", wide: true },
      { id: "metas", label: "Metas acordadas com o paciente", type: "textarea", wide: true },
      { id: "conduta", label: "Conduta nutricional", type: "textarea", wide: true },
      { id: "encaminhamentos", label: "Encaminhamentos / pedidos de exames", type: "textarea", wide: true },
      { id: "observacoesGerais", label: "Observações gerais", type: "textarea", wide: true },
    ],
  },
];

export type AnamnesisContext = { sex: string | null | undefined; role: "NUTRITIONIST" | "PATIENT" };

export function isVisible(rule: ShowIf | undefined, data: AnamnesisData, ctx: AnamnesisContext): boolean {
  if (!rule) return true;
  if ("sex" in rule) return !ctx.sex || ctx.sex === rule.sex;
  const value = data[rule.field];
  if (Array.isArray(value)) return value.some((v) => typeof v === "string" && rule.in.includes(v));
  return typeof value === "string" && rule.in.includes(value);
}

export function visibleSections(data: AnamnesisData, ctx: AnamnesisContext) {
  return ANAMNESIS_SECTIONS.filter(
    (s) => (!s.nutriOnly || ctx.role === "NUTRITIONIST") && isVisible(s.showIf, data, ctx),
  );
}

export function visibleFields(section: AnamnesisSection, data: AnamnesisData, ctx: AnamnesisContext) {
  return section.fields.filter(
    (f) => (!f.nutriOnly || ctx.role === "NUTRITIONIST") && isVisible(f.showIf, data, ctx),
  );
}

export function isFilled(value: AnamnesisValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) {
    return value.some((v) =>
      typeof v === "string" ? v.trim() !== "" : Object.values(v).some((x) => String(x ?? "").trim() !== ""),
    );
  }
  return Object.values(value).some((x) => String(x ?? "").trim() !== "");
}

export function sectionProgress(section: AnamnesisSection, data: AnamnesisData, ctx: AnamnesisContext) {
  const fields = visibleFields(section, data, ctx);
  const filled = fields.filter((f) => isFilled(data[f.id])).length;
  return { filled, total: fields.length };
}

export function anamnesisProgress(data: AnamnesisData, ctx: AnamnesisContext) {
  let filled = 0;
  let total = 0;
  for (const section of visibleSections(data, ctx)) {
    const p = sectionProgress(section, data, ctx);
    filled += p.filled;
    total += p.total;
  }
  return { filled, total, percent: total ? Math.round((filled / total) * 100) : 0 };
}

const FIELD_INDEX = new Map<string, AnamnesisField>(
  ANAMNESIS_SECTIONS.flatMap((s) => s.fields.map((f) => [f.id, { ...f, nutriOnly: f.nutriOnly || s.nutriOnly }] as const)),
);

const clip = (v: unknown, max = 5000) => String(v ?? "").slice(0, max);

/**
 * Mantém apenas campos conhecidos, com tipos e tamanhos válidos.
 * Quando quem salva é o paciente, campos exclusivos da nutricionista são ignorados.
 */
export function sanitizeAnamnesis(input: unknown, role: "NUTRITIONIST" | "PATIENT"): AnamnesisData {
  const out: AnamnesisData = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = FIELD_INDEX.get(key);
    if (!field) continue;
    if (field.nutriOnly && role !== "NUTRITIONIST") continue;
    switch (field.type) {
      case "number": {
        if (raw === "" || raw === null || raw === undefined) break;
        const n = Number(raw);
        if (Number.isFinite(n)) out[key] = n;
        break;
      }
      case "scale": {
        const n = Number(raw);
        if (raw !== "" && raw !== null && Number.isFinite(n)) out[key] = Math.min(field.max, Math.max(field.min, Math.round(n)));
        break;
      }
      case "checkboxes":
        if (Array.isArray(raw)) {
          out[key] = raw.filter((v): v is string => typeof v === "string" && field.options.includes(v));
        }
        break;
      case "select":
      case "radio":
        if (typeof raw === "string" && (raw === "" || field.options.includes(raw))) out[key] = raw;
        break;
      case "repeater":
        if (Array.isArray(raw)) {
          out[key] = raw.slice(0, field.maxRows ?? 30).map((row) => {
            const clean: Record<string, string> = {};
            for (const col of field.columns) {
              clean[col.id] = clip((row as Record<string, unknown>)?.[col.id], 2000);
            }
            return clean;
          });
        }
        break;
      case "frequency":
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          const clean: Record<string, string> = {};
          for (const item of field.items) {
            const v = (raw as Record<string, unknown>)[item];
            if (typeof v === "string" && field.options.includes(v)) clean[item] = v;
          }
          out[key] = clean;
        }
        break;
      default:
        if (raw !== null && raw !== undefined) out[key] = clip(raw);
    }
  }
  return out;
}

/** Remove os campos exclusivos da nutricionista (antes de enviar dados ao paciente). */
export function omitNutriOnly(data: AnamnesisData): AnamnesisData {
  const out: AnamnesisData = {};
  for (const [key, value] of Object.entries(data)) {
    if (!FIELD_INDEX.get(key)?.nutriOnly) out[key] = value;
  }
  return out;
}

export function parseAnamnesis(json: string | null | undefined): AnamnesisData {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as AnamnesisData) : {};
  } catch {
    return {};
  }
}
