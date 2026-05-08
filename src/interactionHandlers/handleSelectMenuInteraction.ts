import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../components/buildSetOrderComponents";
import { getActiveDraftSession } from "../db/draftSession";
import { getSetOrder, updateSetOrder } from "../lib/draft/setOrderState";

function parseSessionId(customId: string): string | null {
  const colonIndex = customId.indexOf(":");
  return colonIndex !== -1 ? customId.slice(colonIndex + 1) : null;
}

export async function handleSetOrderMenu(interaction: StringSelectMenuInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getActiveDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.reply({ content: "This session is no longer active.", flags: MessageFlags.Ephemeral });
    return;
  }

  const captains = session.players
    .filter((p) => p.isCaptain)
    .map((p) => ({ userId: p.discordUserId, username: p.discordUsername }));

  const [selectedId] = interaction.values;
  if (!selectedId) return;

  const currentOrder = getSetOrder(sessionId);
  if (currentOrder.includes(selectedId)) return;

  const newOrder = [...currentOrder, selectedId];
  updateSetOrder(sessionId, newOrder);

  await interaction.update({
    content: buildSetOrderContent(captains, newOrder),
    components: buildSetOrderComponents(sessionId, captains, newOrder),
  });
}
