import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buildPickBanButtons } from "../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../components/buildPickBanEmbed";
import { PICK_BAN_CONFIGS } from "../constants";
import { getPickBanState } from "../db/pickBanState";
import { ActingTeam, PickBanStatus } from "../generated/prisma/client";
import { handleAction } from "../pickBanFlow/handleAction";
import { handleFinish } from "../pickBanFlow/handleFinish";

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const channelId = interaction.channelId;

  const state = await getPickBanState(channelId);

  if (!state) {
    await interaction.reply({ content: "No active pick/ban session in this channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { teamACaptainId, teamBCaptainId, format, currentStepIndex, status } = state;

  if (status === PickBanStatus.Complete) {
    await interaction.reply({ content: "This pick/ban session is already complete.", flags: MessageFlags.Ephemeral });
    return;
  }

  const steps = PICK_BAN_CONFIGS[format];
  const currentStep = steps[currentStepIndex];

  if (!currentStep) {
    await interaction.reply({ content: "Invalid pick/ban step.", flags: MessageFlags.Ephemeral });
    return;
  }

  const expectedCaptainId = currentStep.actingTeam === ActingTeam.TeamA ? teamACaptainId : teamBCaptainId;

  if (interaction.user.id !== expectedCaptainId) {
    await interaction.reply({
      content: `Only <@${expectedCaptainId}> can perform this action.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const [buttonAction] = interaction.customId.split(":");
  if (buttonAction !== currentStep.action) {
    await interaction.reply({ content: "This button is no longer valid.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferUpdate();

  try {
    const isLastStep = currentStepIndex + 1 >= steps.length;
    const updatedState = await handleAction(interaction, state);
    const finalState = isLastStep ? await handleFinish(updatedState) : updatedState;

    await interaction.editReply({
      embeds: [buildPickBanEmbed(finalState)],
      components: buildPickBanButtons(finalState),
    });
  } catch (error) {
    console.error("Error during pick/ban interaction:", error);
    await interaction.followUp({ content: "An unexpected error occurred.", flags: MessageFlags.Ephemeral });
  }
}
