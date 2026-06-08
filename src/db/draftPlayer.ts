import type { Prisma } from "../generated/prisma/browser";
import { prisma } from "../lib/prisma";

export async function getDraftPlayerByDiscordId(
  sessionId: string,
  discordUserId: string,
): Promise<Prisma.DraftPlayerGetPayload<{
  include: { team: true; session: true };
}> | null> {
  return prisma.draftPlayer.findFirst({
    where: { sessionId, discordUserId },
    include: { team: true, session: true },
  });
}

export async function upsertDraftPlayer(playerData: Prisma.DraftPlayerUncheckedCreateInput) {
  return prisma.draftPlayer.upsert({
    where: { sessionId_discordUserId: { sessionId: playerData.sessionId, discordUserId: playerData.discordUserId } },
    update: playerData,
    create: playerData,
  });
}

export async function deleteDraftPlayer(sessionId: string, discordUserId: string) {
  return prisma.draftPlayer.deleteMany({ where: { sessionId, discordUserId } });
}
