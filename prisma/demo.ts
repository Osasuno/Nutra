// Dados de demonstração (NÃO use em produção: as senhas são públicas).
// Uso: npm run db:demo   (recria as contas *@demo.com a cada execução)
import { hash } from "bcryptjs";
import { databaseInfo, prisma } from "./client";
import { deriveAssessment } from "../src/lib/assessment";
import { runEnergy, DEFAULT_ENERGY_PARAMS } from "../src/lib/energy";
import { DEFAULT_SCHEDULE, addDays, dateKeyOf, zonedDate } from "../src/lib/schedule";
import { normalizeText } from "../src/lib/text";

const PASSWORD = "demo1234";
const DAY = 86_400_000;
const ago = (days: number, hour = 12, minute = 0) => {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const dateOnly = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

async function food(term: string) {
  const tokens = normalizeText(term).split(" ").filter(Boolean);
  const found = await prisma.food.findFirst({
    where: { source: "TACO", AND: tokens.map((t) => ({ searchName: { contains: t } })) },
    orderBy: { name: "asc" },
  });
  if (!found) console.warn(`  (alimento não encontrado na TACO: ${term})`);
  return found;
}

async function item(term: string, grams: number, householdMeasure: string, notes?: string) {
  const f = await food(term);
  if (!f) return null;
  return {
    foodId: f.id,
    foodSource: "TACO",
    foodName: f.name,
    quantityG: grams,
    householdMeasure,
    energyKcal100: f.energyKcal ?? 0,
    protein100: f.protein ?? 0,
    carbs100: f.carbs ?? 0,
    fat100: f.fat ?? 0,
    fiber100: f.fiber ?? 0,
    sodium100: f.sodium ?? 0,
    notes: notes ?? null,
  };
}

async function main() {
  // Proteção: contas com senha pública não podem ir para o banco de produção.
  if (/schema=nutra(&|$)/.test(process.env.DATABASE_URL ?? "") || process.env.NODE_ENV === "production") {
    throw new Error("db:demo bloqueado: este parece ser o banco de produção.");
  }
  const foods = await prisma.food.count({ where: { source: "TACO" } });
  if (!foods) throw new Error("Base de alimentos vazia. Rode `npm run db:seed` antes.");

  await prisma.user.deleteMany({ where: { email: { endsWith: "@demo.com" } } });
  const passwordHash = await hash(PASSWORD, 11);

  const nutri = await prisma.user.create({
    data: {
      name: "Ana Souza",
      email: "nutri@demo.com",
      passwordHash,
      role: "NUTRITIONIST",
      phone: "(11) 98888-7777",
      nutritionistProfile: {
        create: {
          crn: "CRN-3 12345",
          inviteCode: "DEMO24",
          specialties: "Emagrecimento, nutrição esportiva e saúde da mulher",
          bio: "Nutricionista clínica e esportiva. Atendimento humanizado, focado em reeducação alimentar e resultados sustentáveis.",
          city: "São Paulo",
          state: "SP",
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      name: "Bruno Lima",
      email: "bruno@demo.com",
      passwordHash,
      role: "NUTRITIONIST",
      nutritionistProfile: {
        create: {
          crn: "CRN-4 54321",
          inviteCode: "BRUNO9",
          specialties: "Nutrição clínica e doenças crônicas",
          bio: "Atendimento para diabetes, hipertensão e dislipidemias.",
          city: "Rio de Janeiro",
          state: "RJ",
        },
      },
    },
  });

  // Paciente com conta e histórico completo
  const mariaUser = await prisma.user.create({
    data: {
      name: "Maria Oliveira",
      email: "paciente@demo.com",
      passwordHash,
      role: "PATIENT",
      phone: "(11) 97777-6666",
      birthDate: dateOnly("1990-05-12"),
      sex: "F",
    },
  });

  const maria = await prisma.patient.create({
    data: {
      nutritionistId: nutri.id,
      userId: mariaUser.id,
      status: "ACTIVE",
      name: mariaUser.name,
      email: mariaUser.email,
      phone: mariaUser.phone,
      birthDate: mariaUser.birthDate,
      sex: "F",
      objective: "Emagrecimento com preservação de massa magra",
      createdAt: ago(95),
    },
  });

  await prisma.anamnesis.create({
    data: {
      patientId: maria.id,
      updatedById: nutri.id,
      data: JSON.stringify({
        estadoCivil: "Casado(a) / união estável",
        profissao: "Analista de sistemas",
        trabalhoModelo: "Híbrido",
        horarioTrabalho: "9h às 18h",
        quemPrepara: ["Eu mesmo(a)", "Compro pronto / delivery"],
        motivo: "Quero emagrecer e ter mais disposição. Ganhei 10 kg nos últimos dois anos.",
        objetivos: ["Emagrecimento", "Mais energia e disposição"],
        motivacao: 8,
        acompanhamentoAnterior: "Não",
        pesoUsual: 70,
        pesoMaximo: 79,
        pesoDesejado: 65,
        variacaoRecente: "Ganhou peso",
        variacaoDetalhe: "Cerca de 8 kg em 18 meses, sem intenção",
        doencas: ["Pré-diabetes / resistência à insulina", "Ansiedade"],
        medicamentos: [{ nome: "Anticoncepcional oral", dose: "1 comprimido", horario: "22h", motivo: "Contracepção" }],
        intolerancias: ["Lactose"],
        historicoFamiliar: ["Diabetes", "Hipertensão", "Obesidade"],
        historicoFamiliarDetalhe: "Mãe com diabetes tipo 2; pai hipertenso.",
        apetite: "Aumentado",
        mastigacao: "Rápida",
        frequenciaEvacuacao: "A cada 2 dias",
        bristol: "Tipo 2",
        sonoHoras: 6,
        qualidadeSono: "Regular",
        estresse: 7,
        ansiedade: 6,
        tabagismo: "Não fuma",
        etilismo: "Socialmente (até 1x/semana)",
        etilismoDetalhe: "2 taças de vinho no fim de semana",
        atividadeFisica: "Sim",
        atividades: [{ modalidade: "Musculação", frequencia: "3", duracao: "60", horario: "19h", intensidade: "Moderada" }],
        numeroRefeicoes: 4,
        comeTela: "Frequentemente",
        beliscos: "Às vezes",
        fomeEmocional: "Frequentemente",
        horarioMaisFome: "Noite",
        agua: 1.2,
        acucar: "Adoçante",
        restricoes: ["Sem lactose"],
        recordatorio: [
          { horario: "07:30", refeicao: "Café da manhã", local: "Casa", alimentos: "1 pão francês com manteiga, café com adoçante" },
          { horario: "12:30", refeicao: "Almoço", local: "Restaurante", alimentos: "Arroz, feijão, bife acebolado, batata frita, refrigerante zero" },
          { horario: "16:00", refeicao: "Lanche da tarde", local: "Trabalho", alimentos: "Barra de cereal e café" },
          { horario: "21:00", refeicao: "Jantar", local: "Casa", alimentos: "Pizza (3 fatias) ou lanche" },
        ],
        ciclo: "Regular",
        exames: [
          { exame: "Glicemia de jejum", resultado: "104", unidade: "mg/dL", referencia: "< 100", data: "2026-09-10" },
          { exame: "Hemoglobina glicada (HbA1c)", resultado: "5,8", unidade: "%", referencia: "< 5,7", data: "2026-09-10" },
          { exame: "Vitamina D (25-OH)", resultado: "22", unidade: "ng/mL", referencia: "> 30", data: "2026-09-10" },
        ],
        diagnosticoNutricional: "Sobrepeso com acúmulo de gordura abdominal e resistência à insulina.",
        conduta: "Déficit calórico moderado, aumento de fibras e proteínas, regularidade de horários.",
      }),
    },
  });

  // Avaliações com evolução (protocolo Jackson & Pollock 3 dobras)
  const history = [
    { days: 92, weight: 78.2, waist: 89, hip: 108, folds: { triceps: 28, suprailiac: 30, thigh: 38 } },
    { days: 62, weight: 76.6, waist: 86.5, hip: 106.5, folds: { triceps: 26, suprailiac: 27, thigh: 36 } },
    { days: 33, weight: 75.1, waist: 84, hip: 105, folds: { triceps: 24, suprailiac: 25, thigh: 34 } },
    { days: 4, weight: 73.6, waist: 82, hip: 104, folds: { triceps: 22, suprailiac: 22, thigh: 32 } },
  ];
  for (const h of history) {
    const date = ago(h.days);
    const age = date.getUTCFullYear() - 1990 - (date.getUTCMonth() < 4 ? 1 : 0);
    const derived = deriveAssessment(
      { weight: h.weight, height: 165, method: "jp3", skinfolds: h.folds, bioimpedance: {} },
      "F",
      age,
    );
    if (!derived.ok) throw new Error(derived.error);
    await prisma.assessment.create({
      data: {
        patientId: maria.id,
        date,
        weight: h.weight,
        height: 165,
        bmi: derived.bmi,
        bodyFatPercent: derived.bodyFatPercent,
        fatMass: derived.fatMass,
        leanMass: derived.leanMass,
        method: "jp3",
        circumferences: JSON.stringify({ waist: h.waist, hip: h.hip, arm: 31, abdomen: h.waist + 4 }),
        skinfolds: JSON.stringify(h.folds),
      },
    });
  }

  const params = {
    ...DEFAULT_ENERGY_PARAMS,
    sex: "F" as const,
    age: 36,
    weightKg: 73.6,
    heightCm: 165,
    activityFactor: 1.55,
    goalValue: -450,
    proteinGkg: 1.6,
    fatGkg: 0.8,
  };
  const energy = runEnergy(params);
  if (!energy.ok) throw new Error(energy.error);
  await prisma.energyCalculation.create({
    data: {
      patientId: maria.id,
      formula: params.formula,
      inputs: JSON.stringify(params),
      bmr: energy.bmr,
      tdee: energy.tee,
      targetKcal: energy.targetKcal,
      proteinG: energy.macros.proteinG,
      carbsG: energy.macros.carbsG,
      fatG: energy.macros.fatG,
      notes: "Déficit moderado para perda de ~0,5 kg/semana",
      createdAt: ago(4, 15),
    },
  });

  const meals = [
    {
      name: "Café da manhã",
      time: "07:00",
      notes: "Pode trocar o pão por 2 fatias de pão integral ou 1 tapioca média.",
      items: [
        await item("pao trigo frances", 50, "1 unidade"),
        await item("ovo galinha inteiro cozido", 100, "2 unidades"),
        await item("mamao papaia", 150, "1 fatia média"),
      ],
    },
    {
      name: "Lanche da manhã",
      time: "10:00",
      notes: null,
      items: [await item("banana prata crua", 80, "1 unidade média"), await item("castanha brasil crua", 8, "2 unidades")],
    },
    {
      name: "Almoço",
      time: "12:30",
      notes: "Monte o prato com metade de salada. Feijão pode ser trocado por lentilha ou grão-de-bico.",
      items: [
        await item("arroz integral cozido", 100, "4 colheres de sopa"),
        await item("feijao carioca cozido", 86, "1 concha"),
        await item("frango peito sem pele grelhado", 120, "1 filé médio"),
        await item("alface crespa", 30, "1 prato de sobremesa"),
        await item("tomate com semente", 60, "4 rodelas"),
        await item("azeite oliva", 5, "1 colher de chá"),
      ],
    },
    {
      name: "Lanche da tarde",
      time: "16:00",
      notes: "Iogurte sem lactose.",
      items: [await item("iogurte natural", 170, "1 pote"), await item("aveia flocos", 15, "1 colher de sopa")],
    },
    {
      name: "Jantar",
      time: "19:30",
      notes: null,
      items: [
        await item("batata doce cozida", 150, "1 unidade média"),
        await item("carne bovina patinho grelhado", 100, "1 bife médio"),
        await item("brocolis cozido", 60, "3 ramos"),
      ],
    },
  ];

  await prisma.mealPlan.create({
    data: {
      patientId: maria.id,
      title: "Plano de emagrecimento — fase 1",
      notes: "Beba 2,5 L de água por dia. Evite telas durante as refeições e mastigue devagar.",
      isActive: true,
      targetKcal: Math.round(energy.targetKcal),
      targetProtein: Math.round(energy.macros.proteinG),
      targetCarbs: Math.round(energy.macros.carbsG),
      targetFat: Math.round(energy.macros.fatG),
      meals: {
        create: meals.map((meal, position) => ({
          name: meal.name,
          time: meal.time,
          notes: meal.notes,
          position,
          items: {
            create: meal.items
              .filter((i): i is NonNullable<typeof i> => i !== null)
              .map((i, itemPosition) => ({ ...i, position: itemPosition })),
          },
        })),
      },
    },
  });

  await prisma.mealLog.createMany({
    data: [
      {
        patientId: maria.id,
        date: ago(2, 12, 40),
        mealType: "Almoço",
        description: "Arroz integral, feijão, frango grelhado e salada de alface com tomate.",
        hunger: 7,
        satiety: 8,
        mood: "😀 Bem",
        followedPlan: "SIM",
        feedback: "Prato muito bem montado, Maria! Ótima proporção de salada.",
        feedbackRating: "OTIMO",
        feedbackAt: ago(2, 18),
      },
      {
        patientId: maria.id,
        date: ago(1, 21, 15),
        mealType: "Jantar",
        description: "Comi 2 fatias de pizza porque estava muito cansada.",
        hunger: 9,
        satiety: 6,
        mood: "😴 Cansado(a)",
        followedPlan: "NAO",
      },
      {
        patientId: maria.id,
        date: ago(0, 8, 5),
        mealType: "Café da manhã",
        description: "Pão francês com 2 ovos mexidos e mamão.",
        hunger: 6,
        satiety: 8,
        followedPlan: "SIM",
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      { patientId: maria.id, senderId: nutri.id, content: "Oi, Maria! Seu plano novo já está liberado no app. Qualquer dúvida, me chame por aqui. 😊", createdAt: ago(3, 10), readAt: ago(3, 11) },
      { patientId: maria.id, senderId: mariaUser.id, content: "Obrigada, Ana! Posso trocar a batata-doce do jantar por mandioca?", createdAt: ago(1, 20), readAt: ago(1, 21) },
      { patientId: maria.id, senderId: nutri.id, content: "Pode sim! Use 100 g de mandioca cozida no lugar dos 150 g de batata-doce.", createdAt: ago(1, 21) , readAt: ago(1, 22) },
      { patientId: maria.id, senderId: mariaUser.id, content: "Ontem acabei comendo pizza no jantar, estava exausta. Registrei no diário.", createdAt: ago(0, 8, 10) },
      { patientId: maria.id, senderId: mariaUser.id, content: "Hoje o café da manhã foi certinho!", createdAt: ago(0, 8, 12) },
    ],
  });

  await prisma.clinicalNote.createMany({
    data: [
      {
        patientId: maria.id,
        authorId: nutri.id,
        content: "1ª consulta: queixa de ganho de peso e cansaço. Pré-diabetes. Fome emocional à noite. Plano com déficit moderado e foco em proteína no café da manhã.",
        createdAt: ago(92, 15),
      },
      {
        patientId: maria.id,
        authorId: nutri.id,
        content: "Retorno: −4,6 kg desde o início, redução de 7 cm na cintura. Melhorou o sono. Manter conduta e reforçar hidratação.",
        createdAt: ago(4, 15),
      },
    ],
  });

  // Agenda: consultas passadas, uma confirmada e uma solicitação aguardando a nutri.
  const slot = (daysAhead: number, time: string, minutes = 60) => {
    const day = addDays(dateKeyOf(new Date()), daysAhead);
    const startsAt = zonedDate(day, time);
    return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) };
  };
  await prisma.appointment.createMany({
    data: [
      {
        patientId: maria.id,
        nutritionistId: nutri.id,
        ...slot(-92, "15:00"),
        mode: "PRESENCIAL",
        status: "COMPLETED",
        lastActionBy: "NUTRITIONIST",
        location: "Av. Paulista, 1000, sala 52, São Paulo/SP",
        reason: "Primeira consulta",
      },
      {
        patientId: maria.id,
        nutritionistId: nutri.id,
        ...slot(-4, "15:00"),
        mode: "PRESENCIAL",
        status: "COMPLETED",
        lastActionBy: "NUTRITIONIST",
        location: "Av. Paulista, 1000, sala 52, São Paulo/SP",
        reason: "Retorno",
      },
      {
        patientId: maria.id,
        nutritionistId: nutri.id,
        ...slot(5, "14:00"),
        mode: "ONLINE",
        status: "CONFIRMED",
        lastActionBy: "NUTRITIONIST",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        notes: "Tenha em mãos o registro do diário da semana.",
      },
      {
        patientId: maria.id,
        nutritionistId: nutri.id,
        ...slot(19, "10:00"),
        mode: "PRESENCIAL",
        status: "REQUESTED",
        lastActionBy: "PATIENT",
        location: "Av. Paulista, 1000, sala 52, São Paulo/SP",
        reason: "Quero fazer a reavaliação com bioimpedância.",
      },
    ],
  });
  await prisma.nutritionistProfile.update({
    where: { userId: nutri.id },
    data: {
      scheduleSettings: JSON.stringify({
        ...DEFAULT_SCHEDULE,
        address: "Av. Paulista, 1000, sala 52, São Paulo/SP",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        minNoticeHours: 12,
      }),
    },
  });

  // Paciente cadastrado pela nutri, ainda sem conta (convite pendente)
  await prisma.patient.create({
    data: {
      nutritionistId: nutri.id,
      status: "ACTIVE",
      name: "João Pereira",
      email: "joao.pereira@email.com",
      phone: "(11) 96666-5555",
      birthDate: dateOnly("1985-11-03"),
      sex: "M",
      objective: "Ganho de massa muscular",
      inviteToken: "convite-demo-joao",
      createdAt: ago(1),
    },
  });

  // Paciente que pediu acompanhamento pelo diretório
  const carlaUser = await prisma.user.create({
    data: {
      name: "Carla Mendes",
      email: "carla@demo.com",
      passwordHash,
      role: "PATIENT",
      birthDate: dateOnly("1998-02-20"),
      sex: "F",
    },
  });
  await prisma.patient.create({
    data: {
      nutritionistId: nutri.id,
      userId: carlaUser.id,
      status: "PENDING",
      name: carlaUser.name,
      email: carlaUser.email,
      birthDate: carlaUser.birthDate,
      sex: "F",
      requestMessage: "Olá! Quero melhorar minha alimentação para correr minha primeira meia maratona.",
    },
  });

  console.log(`✓ Dados de demonstração criados em ${databaseInfo}. Senha de todas as contas: demo1234`);
  console.log("  Nutricionista: nutri@demo.com   (código de convite DEMO24)");
  console.log("  Paciente:      paciente@demo.com");
  console.log("  Convite pendente: /convite/convite-demo-joao");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
