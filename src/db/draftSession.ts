import type { Prisma } from "../generated/prisma/browser";
import { type DraftType, Status } from "../generated/prisma/client";
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

export async function addPlayersToExistingSession(
  sessionId: string,
  playersData: Prisma.DraftPlayerCreateManySessionInput[],
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.playerDraftSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("No session found with the provided ID.");
    if (session.status !== Status.Pending) throw new Error("Session is not in pending state.");

    await tx.draftPlayer.createMany({
      data: playersData.map((p) => ({ ...p, sessionId })),
    });
  });
}

export async function startDraftSession(
  sessionId: string,
  draftChannelId: string,
  draftMessageId: string,
  numTeams: number,
  numPlayersPerTeam: number,
  draftType: DraftType,
  teamsData: Prisma.DraftTeamCreateManyInput[],
) {
  return prisma.$transaction(async (tx) => {
    await Promise.all(
      teamsData.map((team) =>
        tx.draftTeam.create({
          data: {
            name: team.name,
            captainDiscordId: team.captainDiscordId,
            pickOrder: team.pickOrder,
            textChannelId: team.textChannelId,
            voiceChannelId: team.voiceChannelId,
            session: { connect: { id: sessionId } },
            players: {
              connect: { sessionId_discordUserId: { sessionId, discordUserId: team.captainDiscordId } },
            },
          },
        }),
      ),
    );

    return tx.playerDraftSession.update({
      where: { id: sessionId },
      data: { draftChannelId, draftMessageId, status: Status.Active, numTeams, numPlayersPerTeam, draftType },
      include: { teams: { orderBy: { pickOrder: "asc" } }, players: true },
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

export async function cancelDraftSession(sessionId: string) {
  return prisma.playerDraftSession.update({
    where: { id: sessionId, status: { not: { in: [Status.Cancelled, Status.Complete] } } },
    data: { status: Status.Cancelled },
  });
}
