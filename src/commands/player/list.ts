import type { Prisma } from "../../generated/prisma/browser";
import { truncateReply } from "../../lib/truncateReply";
import type { GuildChatInputCommandInteraction } from "../../types";

export const executePlayerList = async (
  interaction: GuildChatInputCommandInteraction,
  session: Prisma.PlayerDraftSessionGetPayload<{
    include: { teams: true; players: true };
  }>,
) => {
  const lines: string[] = [];

  const available = session.players.filter((p) => p.teamId === null);
  lines.push(`**Available Players(${available.length})**`);
  const shown = available.slice(0, 30);
  for (const p of shown) {
    // TODO player stats
    lines.push(`* \`${p.discordUsername}\`${p.isLegionnaire ? " Legionnaire" : ""}`);
  }

  if (available.length > 30) {
    lines.push(`*... and ${available.length - 30} more*`);
  }

  await interaction.editReply(truncateReply(lines.join("\n")));
};
