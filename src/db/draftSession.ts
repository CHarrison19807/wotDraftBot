import type { Prisma } from "../generated/prisma/browser";
import { Status } from "../generated/prisma/client";
import { totalDraftPicks } from "../lib/draft/getDraftTurn";
import { prisma } from "../lib/prisma";

export async function getAllDraftSessionsByGuildId(guildId: string): Promise<
  Prisma.PlayerDraftSessionGetPayload<{
    include: { teams: true; players: true };
  }>[]
> {
  return prisma.playerDraftSession.findMany({
    where: { guildId },
    include: {
      teams: { orderBy: { pickOrder: "asc" } },
      players: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDraftSessionById(sessionId: string): Promise<Prisma.PlayerDraftSessionGetPayload<{
  include: { teams: true; players: true };
}> | null> {
  return prisma.playerDraftSession.findUnique({
    where: { id: sessionId },
    include: {
      teams: { orderBy: { pickOrder: "asc" } },
      players: true,
    },
  });
}

export async function getActiveDraftSession(guildId: string): Promise<Prisma.PlayerDraftSessionGetPayload<{
  include: { teams: true; players: true };
}> | null> {
  return prisma.playerDraftSession.findFirst({
    where: { guildId, status: Status.Active },
    include: {
      teams: { orderBy: { pickOrder: "asc" } },
      players: true,
    },
  });
}

export async function getPendingDraftSession(guildId: string): Promise<Prisma.PlayerDraftSessionGetPayload<{
  include: { teams: true; players: true };
}> | null> {
  return prisma.playerDraftSession.findFirst({
    where: { guildId, status: Status.Pending },
    include: {
      teams: { orderBy: { pickOrder: "asc" } },
      players: true,
    },
  });
}

export async function createDraftSessionWithPlayers(
  sessionData: Prisma.PlayerDraftSessionCreateInput,
  playersData: Prisma.DraftPlayerCreateManySessionInput[],
) {
  return prisma.$transaction(async (tx) => {
    const existingSessions = await getAllDraftSessionsByGuildId(sessionData.guildId);
    const existing = existingSessions.find(
      (s) => s.status === Status.Active || s.status === Status.Pending || s.status === Status.Paused,
    );
    if (existing) throw new Error("A draft session already exists in this guild.");

    const session = await tx.playerDraftSession.create({ data: sessionData });

    await tx.draftPlayer.createMany({
      data: playersData.map((p) => ({ ...p, sessionId: session.id })),
    });
    });
}

export async function addPlayersToPendingSession(
  sessionId: string,
  playersData: Prisma.DraftPlayerCreateManySessionInput[],
) {
  return prisma.$transaction(async (tx) => {
    const pendingSession = await getPendingDraftSession(sessionId);
    if (!pendingSession) throw new Error("No pending session found with the provided ID.");
    if (pendingSession.status !== Status.Pending) throw new Error("Session is not in pending state.");

    await tx.draftPlayer.createMany({
      data: playersData.map((p) => ({ ...p, sessionId })),
    });
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
      const captain = session.players.find((p) => p.discordUserId === team.captainDiscordId);
      if (captain) {
        await tx.draftPlayer.update({ where: { id: captain.id }, data: { teamId: team.id } });
      }
    }

    return tx.playerDraftSession.update({
      where: { id: sessionId },
      data: { draftChannelId, draftMessageId,status: Status.Active },
    });
  });
}

export async function recordPick(sessionId: string, playerId: number, teamId: number) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.playerDraftSession.findUnique({
      where: { id: sessionId },
      select: { currentPickIndex: true, numTeams: true, numPlayersPerTeam: true },
    });
    if (!session?.numTeams || !session.numPlayersPerTeam) throw new Error("Valid session not found");

    const newPickIndex = session.currentPickIndex + 1;
    const isComplete = newPickIndex >= totalDraftPicks(session.numTeams, session.numPlayersPerTeam);

    await tx.draftPlayer.update({
      where: { id: playerId },
      data: { teamId, pickNumber: session.currentPickIndex + 1 },
    });

    return tx.playerDraftSession.update({
      where: { id: sessionId, currentPickIndex: session.currentPickIndex },
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

export async function updateTeamChannelIds(
  sessionId: string,
  teamChannels: { teamId: number; channelId: string; voiceChannelId: string }[],
) {
  return prisma.$transaction(
    teamChannels.map(({ teamId, channelId, voiceChannelId }) =>
      prisma.draftTeam.update({
        where: { id: teamId, sessionId },
        data: { channelId, voiceChannelId },
      }),
    ),
  );
}

export async function cancelDraftSession(sessionId: string) {
  return prisma.playerDraftSession.update({
    where: { id: sessionId, status: { not: { in: [Status.Cancelled, Status.Complete] } } },
    data: { status: Status.Cancelled },
  });
}
