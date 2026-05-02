import { DraftStatus, type DraftType } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export async function getActiveDraftSession(guildId: string) {
  return prisma.playerDraftSession.findFirst({
    where: { guildId, status: { in: [DraftStatus.Lobby, DraftStatus.Active] } },
    include: {
      teams: { orderBy: { pickOrder: "asc" } },
      players: true,
    },
  });
}

export async function createDraftSessionWithPlayers(
  sessionData: {
    guildId: string;
    channelId: string;
    numTeams: number;
    maxPlayersPerTeam: number;
    draftType: DraftType;
    captainsChatChannelId?: string;
    createdChannelIds?: string[];
  },
  players: {
    discordUsername: string;
    discordUserId: string;
    worldOfTanksId: string;
    isCaptain: boolean;
    isLegionnaire: boolean;
    wotAccountRegion: string;
  }[],
  teams: {
    name: string;
    captainId: string;
    channelId?: string;
    voiceChannelId?: string;
  }[],
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.playerDraftSession.findFirst({
      where: {
        guildId: sessionData.guildId,
        status: { in: [DraftStatus.Lobby, DraftStatus.Active] },
      },
    });
    if (existing) throw new Error("An active draft session already exists in this guild.");

    const session = await tx.playerDraftSession.create({ data: sessionData });

    await tx.draftPlayer.createMany({
      data: players.map((p) => ({ ...p, sessionId: session.id })),
    });

    await tx.draftTeam.createMany({
      data: teams.map((t) => ({ ...t, sessionId: session.id })),
    });

    return session;
  });
}

export async function setTeamPickOrders(sessionId: string, orders: { captainId: string; pickOrder: number }[]) {
  return prisma.$transaction(
    orders.map(({ captainId, pickOrder }) =>
      prisma.draftTeam.updateMany({
        where: { sessionId, captainId },
        data: { pickOrder },
      }),
    ),
  );
}

export async function cancelDraftSession(sessionId: string) {
  return prisma.playerDraftSession.update({
    where: { id: sessionId },
    data: { status: DraftStatus.Cancelled },
  });
}
