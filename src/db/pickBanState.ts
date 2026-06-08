import { type Prisma, Status } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export async function cancelPickBanState(channelId: string) {
  return prisma.pickBanState.updateMany({
    where: { channelId, status: Status.Active },
    data: { status: Status.Cancelled },
  });
}

export async function createPickBanState(data: Prisma.PickBanStateCreateInput) {
  return prisma.pickBanState.create({
    data,
    include: { actions: { orderBy: { id: "asc" } } },
  });
}

export async function deleteOrphanedPickBanState(channelId: string) {
  return prisma.pickBanState.deleteMany({ where: { channelId, status: Status.Active } });
}

export async function getActivePickBanState(channelId: string) {
  return prisma.pickBanState.findFirst({
    where: { channelId, status: Status.Active },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}

export async function updateTurnNotificationMessageId(id: string, turnNotificationMessageId: string | null) {
  return prisma.pickBanState.update({
    where: { id },
    data: { turnNotificationMessageId },
  });
}

export async function updateDraftMessageId(id: string, pickBanMessageId: string) {
  return prisma.pickBanState.update({
    where: { id },
    data: { pickBanMessageId },
  });
}
