import "server-only";
import { prisma } from "./db";
import { buildMeasureIndex, matchMeasureGroups, type MeasureIndex, type ScoredGroup } from "./measure-match";

// Medidas caseiras (POF 2008–2009 / IBGE). A tabela é fixa (vem do seed), então fica em
// memória depois da primeira consulta: ~7.800 linhas, montagem do índice em ~20 ms.

let indexPromise: Promise<MeasureIndex> | null = null;

function measureIndex(): Promise<MeasureIndex> {
  indexPromise ??= prisma.householdMeasure
    .findMany({ select: { id: true, foodName: true, preparation: true, measure: true, description: true, grams: true } })
    .then(buildMeasureIndex)
    .catch((error) => {
      indexPromise = null;
      throw error;
    });
  return indexPromise;
}

export type MeasureGroupResult = Omit<ScoredGroup, "score" | "headMatched"> & { approximate: boolean };

const toResult = (g: ScoredGroup): MeasureGroupResult => ({
  key: g.key,
  foodName: g.foodName,
  preparation: g.preparation,
  measures: g.measures,
  approximate: !g.headMatched,
});

/** Alimentos da tabela de medidas que correspondem ao alimento escolhido (o primeiro é o melhor). */
export async function measureGroupsFor(name: string, limit = 8): Promise<MeasureGroupResult[]> {
  return matchMeasureGroups(name, await measureIndex(), limit).map(toResult);
}
