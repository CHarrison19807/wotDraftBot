import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../../components/buildSetOrderComponents";
import { getPendingDraftSession } from "../../db/draftSession";
import { clearPickOrder, finalizePickOrder, getPickOrder } from "../../lib/draft/setOrderState";

function parseSessionId(customId: string): string | null {
  const colonIndex = customId.indexOf(":");
  return colonIndex !== -1 ? customId.slice(colonIndex + 1) : null;
}

export async function handleSetOrderConfirm(interaction: ButtonInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getPendingDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.update({ content: "This draft session is no longer active.", components: [] });
    return;
  }

  const captains = session.players.filter((player) => player.isCaptain);
  const currentOrder = getPickOrder(sessionId);

  if (currentOrder.order.length !== captains.length) {
    await interaction.reply({
      content: "Not all captains have been placed. Please complete the order first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  finalizePickOrder(sessionId);

  const orderLines = currentOrder.order
    .map((captainDiscordId, index) => {
      const captain = captains.find((captain) => captain.discordUserId === captainDiscordId);
      const team = session.teams.find((team) => team.captainDiscordId === captainDiscordId);

      return `${index + 1}. ${team ? `**${team.name}** - ` : ""}<@${captainDiscordId}>${captain ? ` (${captain.discordUsername})` : ""}`;
    })
    .join("\n");

  await interaction.update({
    content: `**Draft order confirmed.**\n\n${orderLines}\n\nUse \`/draft start\` to finalize draft details and start the draft.`,
    components: [],
  });
}

export async function handleSetOrderReset(interaction: ButtonInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getPendingDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.update({ content: "There is no pending session found.", components: [] });
    return;
  }

  const captains = session.players.filter((player) => player.isCaptain);

  clearPickOrder(sessionId);

  await interaction.update({
    content: buildSetOrderContent(captains, []),
    components: buildSetOrderComponents(sessionId, captains, []),
  });
}
