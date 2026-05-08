import { buildPlayerCard } from "../../components/buildPlayerCard";
import type { Prisma } from "../../generated/prisma/browser";
import type { GuildChatInputCommandInteraction } from "../../types";

export const executePlayerInfo = async (
  interaction: GuildChatInputCommandInteraction,
  session: Prisma.PlayerDraftSessionGetPayload<{
    include: { teams: true; players: true };
  }>,
) => {
  const targetUser = interaction.options.getUser("player", true);
  const player = session.players.find((p) => p.discordUserId === targetUser.id);

  if (!player) {
    await interaction.editReply(`**${targetUser.username}** is not in the draft pool.`);
    return;
  }

  const team = player.teamId ? (session.teams.find((t) => t.id === player.teamId) ?? null) : null;
  await interaction.editReply({ embeds: [buildPlayerCard(player, team)] });
};
