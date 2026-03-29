import { PickBanStatus, type Prisma, type WorldOfTanksMapName } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export async function recordAction(data: Prisma.PickBanActionUncheckedCreateInput) {
  return prisma.pickBanAction.create({ data });
}

export async function advanceStep(id: string, nextStepIndex: number, availableMaps: WorldOfTanksMapName[]) {
  return prisma.pickBanState.update({
    where: { id },
    data: { currentStepIndex: nextStepIndex, availableMaps },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}

export async function completePickBanState(id: string, deciderMap: WorldOfTanksMapName) {
  return prisma.pickBanState.update({
    where: { id },
    data: { status: PickBanStatus.Complete, availableMaps: [], deciderMap },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}
