import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../components/buildSetOrderComponents";
import { getPendingDraftSession } from "../db/draftSession";
import { getPickOrder, updatePickOrder } from "../lib/draft/setOrderState";

function parseSessionId(customId: string): string | null {
  const colonIndex = customId.indexOf(":");
  return colonIndex !== -1 ? customId.slice(colonIndex + 1) : null;
}

export async function handleSetOrderMenu(interaction: StringSelectMenuInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getPendingDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.reply({ content: "There is no pending session found.", flags: MessageFlags.Ephemeral });
    return;
  }

  const captains = session.players.filter((player) => player.isCaptain);

  const [selectedId] = interaction.values;
  if (!selectedId) return;

  const currentOrder = getPickOrder(sessionId);
  if (currentOrder.order.includes(selectedId)) return;

  const newOrder = [...currentOrder.order, selectedId];
  updatePickOrder(sessionId, newOrder);

  await interaction.update({
    content: buildSetOrderContent(captains, newOrder),
    components: buildSetOrderComponents(sessionId, captains, newOrder),
  });
}
