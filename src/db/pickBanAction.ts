import { Status, type Prisma, type WorldOfTanksMapName } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { StateWithActions } from "../types";

export async function recordActionAndAdvanceStep(
  actionData: Prisma.PickBanActionUncheckedCreateInput,
  stateId: string,
  nextStepIndex: number,
  availableMaps: WorldOfTanksMapName[],
): Promise<StateWithActions> {
  const [, updatedState] = await prisma.$transaction([
    prisma.pickBanAction.create({ data: actionData }),
    prisma.pickBanState.update({
      where: { id: stateId, status: Status.Active },
      data: { currentStepIndex: nextStepIndex, availableMaps },
      include: { actions: { orderBy: { id: "asc" } } },
    }),
  ]);
  return updatedState;
}

export async function completePickBanState(id: string, deciderMap: WorldOfTanksMapName): Promise<StateWithActions> {
  return prisma.pickBanState.update({
    where: { id },
    data: { status: Status.Complete, availableMaps: [], deciderMap },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}
