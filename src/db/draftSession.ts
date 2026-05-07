import { type DraftType, Status } from "../generated/prisma/client";
import { totalDraftPicks } from "../lib/draft/getDraftTurn";
import { prisma } from "../lib/prisma";

export async function getActiveDraftSession(guildId: string) {
  return prisma.playerDraftSession.findFirst({
    where: { guildId, status: Status.Active },
    include: {
      teams: { orderBy: { pickOrder: "asc" } },
      players: true,
    },
  });
}

export async function createDraftSessionWithPlayers(
  sessionData: {
    guildId: string;
    numTeams: number;
    numPlayersPerTeam: number;
    draftType: DraftType;
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
      where: { guildId: sessionData.guildId, status: Status.Active },
    });
    if (existing) throw new Error("A draft session already exists in this guild.");

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

export async function startDraftSession(sessionId: string, draftChannelId: string, draftMessageId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.playerDraftSession.findUnique({
      where: { id: sessionId },
      include: { teams: true, players: { where: { isCaptain: true } } },
    });
    if (!session) throw new Error("Session not found");

    for (const team of session.teams) {
      const captain = session.players.find((p) => p.discordUserId === team.captainId);
      if (captain) {
        await tx.draftPlayer.update({ where: { id: captain.id }, data: { teamId: team.id } });
      }
    }

    return tx.playerDraftSession.update({
      where: { id: sessionId },
      data: { draftChannelId, draftMessageId },
    });
  });
}

export async function recordPick(sessionId: string, playerId: number, teamId: number) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.playerDraftSession.findUnique({
      where: { id: sessionId },
      select: { currentPickIndex: true, numTeams: true, numPlayersPerTeam: true },
    });
    if (!session) throw new Error("Session not found");

    const newPickIndex = session.currentPickIndex + 1;
    const isComplete = newPickIndex >= totalDraftPicks(session.numTeams, session.numPlayersPerTeam);

    await tx.draftPlayer.update({
      where: { id: playerId },
      data: { teamId, pickNumber: session.currentPickIndex + 1 },
    });

    return tx.playerDraftSession.update({
      where: { id: sessionId },
      data: {
        currentPickIndex: newPickIndex,
        ...(isComplete && { status: Status.Complete }),
      },
      include: {
        teams: { orderBy: { pickOrder: "asc" } },
        players: true,
      },
    });
  });
}

export async function cancelDraftSession(sessionId: string) {
  return prisma.playerDraftSession.update({
    where: { id: sessionId, status: { not: { in: [Status.Cancelled, Status.Complete] } } },
    data: { status: Status.Cancelled },
  });
}
