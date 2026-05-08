import { type ButtonInteraction, MessageFlags, TextChannel } from "discord.js";
import { buildPickBanButtons } from "../../components/buildPickBanButtons";
import { buildPickBanEmbed } from "../../components/buildPickBanEmbed";
import { PICK_BAN_CONFIGS } from "../../constants";
import { getActivePickBanState, updateTurnNotificationMessageId } from "../../db/pickBanState";
import { ActingTeam } from "../../generated/prisma/client";
import { getTurnNotificationContent } from "../../lib/pickban/getTurnNotificationContent";
import { handleAction } from "../../pickBanFlow/handleAction";
import { handleFinish } from "../../pickBanFlow/handleFinish";
import { postPickBanResult } from "../../pickBanFlow/postPickBanResult";

export async function handlePickBanButton(interaction: ButtonInteraction) {
  const state = await getActivePickBanState(interaction.channelId);

  if (!state) {
    await interaction.reply({ content: "No active pick/ban session in this channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { teamACaptainId, teamBCaptainId, format, currentStepIndex } = state;
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

  const isLastStep = currentStepIndex + 1 >= steps.length;
  const updatedState = await handleAction(interaction, state);
  const finalState = isLastStep ? await handleFinish(updatedState) : updatedState;

  await interaction.editReply({
    embeds: [buildPickBanEmbed(finalState)],
    components: buildPickBanButtons(finalState),
  });

  if (interaction.channel instanceof TextChannel) {
    if (state.turnNotificationMessageId) {
      await interaction.channel.messages
        .delete(state.turnNotificationMessageId)
        .catch((error) =>
          console.warn(`Failed to delete turn notification message ${state.turnNotificationMessageId}:`, error),
        );
    }

    if (!isLastStep) {
      const nextStep = steps[finalState.currentStepIndex];
      if (nextStep) {
        const notificationMessage = await interaction.channel.send(
          getTurnNotificationContent(nextStep, teamACaptainId, teamBCaptainId),
        );
        await updateTurnNotificationMessageId(finalState.id, notificationMessage.id);
      }
    } else {
      await updateTurnNotificationMessageId(finalState.id, null);

      if (interaction.guildId) {
        const result = await postPickBanResult(finalState, interaction.client, interaction.guildId);
        if (!result.ok) {
          await interaction.followUp({ content: `Pick/ban complete, but failed to post results: ${result.reason}` });
        }
      }
    }
  }
}
