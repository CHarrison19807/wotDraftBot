import { MessageFlags } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../../components/buildSetOrderComponents";
import { getActiveDraftSession } from "../../db/draftSession";
import { getSetOrder } from "../../lib/draft/setOrderState";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeSetOrder(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const session = await getActiveDraftSession(interaction.guild.id);
  if (!session) {
    await interaction.editReply("No draft session in setup. Run `/draft init` first.");
    return;
  }

  const captains = session.players
    .filter((player) => player.isCaptain)
    .map((player) => ({ userId: player.discordUserId, username: player.discordUsername }));

  const currentOrder = getSetOrder(session.id);

  await interaction.editReply({
    content: buildSetOrderContent(captains, currentOrder),
    components: buildSetOrderComponents(session.id, captains, currentOrder),
  });
}
