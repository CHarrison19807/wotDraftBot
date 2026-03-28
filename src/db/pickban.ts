import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export async function createPickBanState(data: Prisma.PickBanStateUncheckedCreateInput) {
  return prisma.pickBanState.create({ data });
}

export async function getPickBanState(channelId: string) {
  return prisma.pickBanState.findUnique({
    where: { channelId },
    include: { actions: { orderBy: { order: "asc" } } },
  });
}
