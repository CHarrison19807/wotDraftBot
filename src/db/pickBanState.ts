import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export async function createPickBanState(data: Prisma.PickBanStateUncheckedCreateInput) {
  return prisma.pickBanState.create({ data });
}

export async function getPickBanState(id: string) {
  return prisma.pickBanState.findUnique({
    where: { id },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}
