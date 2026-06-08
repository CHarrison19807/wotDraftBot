import { type ButtonInteraction, GuildChannel, MessageFlags, TextChannel } from "discord.js";
import { buildDraftEmbed } from "../../components/buildDraftEmbed";
import { getActiveDraftSession, recordPick } from "../../db/draftSession";
import { getCurrentTeamIndex, isDraftComplete, isDraftPickable } from "../../lib/draft/getDraftTurn";

export async function handleDraftPickConfirm(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(":");
  const sessionId = parts[1];
  const playerIdStr = parts[2];

  if (!sessionId || !playerIdStr || !interaction.guildId) {
    await interaction.reply({ content: "Invalid interaction.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferUpdate();
  try {
    const playerId = Number.parseInt(playerIdStr);
    const session = await getActiveDraftSession(interaction.guildId);

    if (
      !session ||
      session.id !== sessionId ||
      !isDraftPickable(session) ||
      !session.numTeams ||
      !session.numPlayersPerTeam ||
      !session.draftType
    ) {
      await interaction.editReply({ content: "This draft is no longer active.", embeds: [], components: [] });
      return;
    }

    const teamIndex = getCurrentTeamIndex(session.currentPickIndex, session.numTeams, session.draftType);
    const currentTeam = session.teams[teamIndex];

    if (!currentTeam || interaction.user.id !== currentTeam.captainDiscordId) {
      await interaction.editReply({ content: "It's not your turn to pick.", embeds: [], components: [] });
      return;
    }

    const player = session.players.find((p) => p.id === playerId && p.teamId === null);
    if (!player) {
      await interaction.editReply({
        content: "That player has already been drafted. Use `/draft pick` to choose again.",
        embeds: [],
        components: [],
      });
      return;
    }

    const updatedSession = await recordPick(session.id, playerId, currentTeam.id);
    if (!updatedSession.numTeams || !updatedSession.numPlayersPerTeam || !updatedSession.draftType) {
      await interaction.editReply({ content: "Draft session data is invalid.", embeds: [], components: [] });
      return;
    }

    // Grant picked player access to their team's channels
    if (interaction.guild) {
      const team = updatedSession.teams.find((t) => t.id === currentTeam.id);
      const channelIds = [team?.textChannelId, team?.voiceChannelId].filter((id): id is string => !!id);
      for (const channelId of channelIds) {
        try {
          const channel = await interaction.guild.channels.fetch(channelId);
          if (channel instanceof GuildChannel)
            await channel.permissionOverwrites.edit(player.discordUserId, { ViewChannel: true });
        } catch (e) {
          console.error(`Failed to grant channel access for ${channelId}:`, e);
        }
      }
    }

    await interaction.editReply({
      content: `Picked **${player.discordUsername}** for **${currentTeam.name}**!`,
      embeds: [],
      components: [],
    });

    // Update the public draft embed and ping the next captain
    if (session.draftChannelId && session.draftMessageId) {
      const fetchedChannel = await interaction.client.channels.fetch(session.draftChannelId).catch(() => null);
      if (!(fetchedChannel instanceof TextChannel)) {
        console.error(`Draft channel ${session.draftChannelId} not found or not a text channel`);
        return;
      }
      const draftChannel = fetchedChannel;
      try {
        const msg = await draftChannel.messages.fetch(session.draftMessageId);
        await msg.edit({ embeds: [buildDraftEmbed(updatedSession)] });

        const isComplete = isDraftComplete(
          updatedSession.currentPickIndex,
          updatedSession.numTeams,
          updatedSession.numPlayersPerTeam,
        );

        if (isComplete) {
          await draftChannel.send("The draft is complete! All players have been picked.");
        } else {
          const nextTeamIndex = getCurrentTeamIndex(
            updatedSession.currentPickIndex,
            updatedSession.numTeams,
            updatedSession.draftType,
          );
          const nextTeam = updatedSession.teams[nextTeamIndex];
          if (nextTeam) {
            await draftChannel.send(
              `<@${nextTeam.captainDiscordId}>, it's your pick for **${nextTeam.name}**. Use \`/draft pick @player\`.`,
            );
          }
        }
      } catch (e) {
        console.error("Failed to update draft embed:", e);
      }
    }
  } catch (e) {
    console.error("Error processing draft pick:", e);
    await interaction.editReply({ content: "An unexpected error occurred.", embeds: [], components: [] });
  }
}
