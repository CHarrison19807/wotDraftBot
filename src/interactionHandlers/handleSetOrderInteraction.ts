import { type ButtonInteraction, MessageFlags, type StringSelectMenuInteraction } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../components/buildSetOrderComponents";
import { getActiveDraftSession, setTeamPickOrders } from "../db/draftSession";
import { clearSetOrder, getSetOrder, updateSetOrder } from "../lib/draft/setOrderState";

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
  if (currentOrder.includes(selectedId)) return; // already placed, shouldn't happen

  const newOrder = [...currentOrder, selectedId];
  updateSetOrder(sessionId, newOrder);

  await interaction.update({
    content: buildSetOrderContent(captains, newOrder),
    components: buildSetOrderComponents(sessionId, captains, newOrder),
  });
}

export async function handleSetOrderConfirm(interaction: ButtonInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getActiveDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.update({ content: "This session is no longer active.", components: [] });
    return;
  }

  if (session.teams.some((t) => t.pickOrder !== null)) {
    await interaction.update({ content: "Draft order is already confirmed.", components: [] });
    return;
  }

  const captains = session.players.filter((p) => p.isCaptain);
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
    .map((captainId, i) => {
      const captain = captains.find((c) => c.discordUserId === captainId);
      const team = session.teams.find((t) => t.captainId === captainId);
      return `${i + 1}. ${team ? `**${team.name}** - ` : ""}<@${captainId}>${captain ? ` (${captain.discordUsername})` : ""}`;
    })
    .join("\n");

  await interaction.update({
    content: `**Draft order confirmed!**\n\n${orderLines}\n\nUse \`/draft start\` to begin the draft.`,
    components: [],
  });
}

export async function handleSetOrderReset(interaction: ButtonInteraction) {
  const sessionId = parseSessionId(interaction.customId);
  if (!sessionId || !interaction.guildId) return;

  const session = await getActiveDraftSession(interaction.guildId);
  if (!session || session.id !== sessionId) {
    await interaction.update({ content: "This session is no longer active.", components: [] });
    return;
  }

  const captains = session.players
    .filter((p) => p.isCaptain)
    .map((p) => ({ userId: p.discordUserId, username: p.discordUsername }));

  updateSetOrder(sessionId, []);

  await interaction.update({
    content: buildSetOrderContent(captains, []),
    components: buildSetOrderComponents(sessionId, captains, []),
  });
}
