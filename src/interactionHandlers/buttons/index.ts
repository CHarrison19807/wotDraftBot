import { type ButtonInteraction, MessageFlags } from "discord.js";
import { CustomId } from "../../constants";
import { handlePickBanButton } from "./handlePickBanButtons";
import { handleSetOrderConfirm, handleSetOrderReset } from "./handleSetOrderButtons";

const processingChannels = new Set<string>();

export async function handleButton(interaction: ButtonInteraction) {
  const { channelId } = interaction;

  if (processingChannels.has(channelId)) {
    await interaction.deferUpdate();
    return;
  }

  processingChannels.add(channelId);
  try {
    if (interaction.customId.startsWith(`${CustomId.DraftSetOrderConfirm}:`)) {
      await handleSetOrderConfirm(interaction);
    } else if (interaction.customId.startsWith(`${CustomId.DraftSetOrderReset}:`)) {
      await handleSetOrderReset(interaction);
    } else {
      await handlePickBanButton(interaction);
    }
  } catch (error) {
    console.error("Error handling button interaction:", error);
    await interaction
      .followUp({ content: "An unexpected error occurred.", flags: MessageFlags.Ephemeral })
      .catch(() => null);
  } finally {
    processingChannels.delete(channelId);
  }
}
