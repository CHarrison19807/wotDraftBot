import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../../components/buildSetOrderComponents";
import { getActiveDraftSession, setTeamPickOrders } from "../../db/draftSession";
import { clearSetOrder, getSetOrder, updateSetOrder } from "../../lib/draft/setOrderState";

function parseSessionId(customId: string): string | null {
  const colonIndex = customId.indexOf(":");
  return colonIndex !== -1 ? customId.slice(colonIndex + 1) : null;
}

export async function handleSetOrderConfirm(interaction: ButtonInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getActiveDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.update({ content: "This draft session is no longer active.", components: [] });
    return;
  }

  const captains = session.players.filter((player) => player.isCaptain);
  const currentOrder = getSetOrder(sessionId);

  if (currentOrder.length !== captains.length) {
    await interaction.reply({
      content: "Not all captains have been placed. Please complete the order first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setTeamPickOrders(
    sessionId,
    currentOrder.map((captainId, index) => ({ captainId, pickOrder: index })),
  );
  clearSetOrder(sessionId);

  const orderLines = currentOrder
    .map((captainId, index) => {
      const captain = captains.find((captain) => captain.discordUserId === captainId);
      const team = session.teams.find((team) => team.captainDiscordId === captainId);

      return `${index + 1}. ${team ? `**${team.name}** - ` : ""}<@${captainId}>${captain ? ` (${captain.discordUsername})` : ""}`;
    })
    .join("\n");

  await interaction.update({
    content: `**Draft order confirmed!**\n\n${orderLines}\n\nUse \`/draft config\` to finalize draft details.`,
    components: [],
  });
}

export async function handleSetOrderReset(interaction: ButtonInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getActiveDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.update({ content: "This draft session is no longer active.", components: [] });
    return;
  }

  const captains = session.players
    .filter((player) => player.isCaptain)
    .map((player) => ({ userId: player.discordUserId, username: player.discordUsername }));

  updateSetOrder(sessionId, []);

  await interaction.update({
    content: buildSetOrderContent(captains, []),
    components: buildSetOrderComponents(sessionId, captains, []),
  });
}
