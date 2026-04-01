import { PickBanStatus, type Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export async function cancelPickBanState(id: string) {
  return prisma.pickBanState.updateMany({
    where: { id, status: PickBanStatus.Active },
    data: { status: PickBanStatus.Cancelled },
  });
}

export async function createPickBanState(data: Prisma.PickBanStateUncheckedCreateInput) {
  return prisma.pickBanState.create({ data });
}

export async function deleteOrphanedPickBanState(id: string) {
  return prisma.pickBanState.deleteMany({ where: { id, status: PickBanStatus.Active } });
}

export async function getPickBanState(id: string) {
  return prisma.pickBanState.findUnique({
    where: { id },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}
