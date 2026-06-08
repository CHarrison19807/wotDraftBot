import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export async function createDraftTeams(
  sessionId: string,
  teamsData: Omit<Prisma.DraftTeamCreateInput, "session" | "players">[],
) {
  return prisma.$transaction(
    teamsData.map((team) =>
      prisma.draftTeam.create({
        data: {
          ...team,
          session: { connect: { id: sessionId } },
          players: {
            connect: { sessionId_discordUserId: { sessionId, discordUserId: team.captainDiscordId } },
          },
        },
      }),
    ),
  );
}
