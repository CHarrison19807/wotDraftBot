import { PickBanStatus, type Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export async function cancelPickBanState(channelId: string) {
  return prisma.pickBanState.updateMany({
    where: { channelId, status: PickBanStatus.Active },
    data: { status: PickBanStatus.Cancelled },
  });
}

export async function createPickBanState(data: Prisma.PickBanStateUncheckedCreateInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.pickBanState.findFirst({
      where: { channelId: data.channelId, status: PickBanStatus.Active },
    });
    if (existing) throw new Error("Active session already exists in this channel.");
    return tx.pickBanState.create({ data });
  });
}

export async function deleteOrphanedPickBanState(channelId: string) {
  return prisma.pickBanState.deleteMany({ where: { channelId, status: PickBanStatus.Active } });
}

export async function getPickBanState(channelId: string) {
  return prisma.pickBanState.findFirst({
    where: { channelId, status: PickBanStatus.Active },
    include: { actions: { orderBy: { id: "asc" } } },
  });
}

export async function updateTurnNotificationMessageId(id: string, turnNotificationMessageId: string | null) {
  return prisma.pickBanState.update({
    where: { id },
    data: { turnNotificationMessageId },
  });
}

export async function updateDraftMessageId(id: string, draftMessageId: string) {
  return prisma.pickBanState.update({
    where: { id },
    data: { draftMessageId },
  });
}
