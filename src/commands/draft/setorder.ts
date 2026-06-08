import { MessageFlags } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../../components/buildSetOrderComponents";
import { getPendingDraftSession } from "../../db/draftSession";
import { getPickOrder } from "../../lib/draft/setOrderState";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeSetOrder(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const session = await getPendingDraftSession(interaction.guild.id);
  if (!session) {
    await interaction.editReply("No pending session found. ");
    return;
  }

  const captains = session.players.filter((player) => player.isCaptain);
  const currentOrder = getPickOrder(session.id);

  await interaction.editReply({
    content: buildSetOrderContent(captains, currentOrder.order),
    components: buildSetOrderComponents(session.id, captains, currentOrder.order),
  });
}
