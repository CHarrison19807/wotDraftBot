import { MessageFlags, PermissionFlagsBits, type TextChannel } from "discord.js";
import { buildDraftEmbed } from "../../components/buildDraftEmbed";
import { getPendingDraftSession, startDraftSession } from "../../db/draftSession";
import type { DraftType } from "../../generated/prisma/enums";
import { createSessionDiscordChannels } from "../../lib/createSessionDiscordChannels";
import { validateRosterCounts } from "../../lib/draft/roster";
import { getPickOrder } from "../../lib/draft/setOrderState";
import { getRandomTankNames } from "../../lib/draft/tankNames";
import type { GuildChatInputCommandInteraction } from "../../types";

export async function executeStart(interaction: GuildChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = interaction.guild;

  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply(
      "The bot is missing the **Manage Channels** permission required to create draft channels.",
    );
    return;
  }

  const session = await getPendingDraftSession(guild.id);

  if (!session) {
    await interaction.editReply("No pending session. Run `/roster create` to start a session.");
    return;
  }

  const currentPickOrder = getPickOrder(session.id);

  if (!currentPickOrder.isFinal) {
    await interaction.editReply("Draft order not set. Use `/draft setorder` to configure it.");
    return;
  }

  const rosterErrors = validateRosterCounts(session.players);

  if (rosterErrors.length > 0) {
    await interaction.editReply(`Roster validation failed:\n- ${rosterErrors.join("\n- ")}`);
    return;
  }
  const createdChannelIds: string[] = [];

  try {
    const numTeams = session.players.filter((player) => player.isCaptain).length;
    const numPlayersPerTeam = session.players.length / numTeams;
    const randomTankNames = await getRandomTankNames(numTeams);

    const plannedTeams = currentPickOrder.order.map((captainDiscordId, index) => ({
      captainDiscordId,
      name: randomTankNames[index] ?? `Team ${index + 1}`,
      pickOrder: index,
    }));

    let draftChannelId: string;
    let categoryId: string;
    let captainsChannelId: string;
    let teamChannelUpdates: { captainDiscordId: string; textChannelId: string; voiceChannelId: string }[];

    try {
      const result = await createSessionDiscordChannels(guild, session.id, plannedTeams);
      draftChannelId = result.draftChannelId;
      categoryId = result.categoryId;
      captainsChannelId = result.captainsChannelId;
      teamChannelUpdates = result.teamChannelUpdates;

      createdChannelIds.push(draftChannelId, categoryId, captainsChannelId);
      teamChannelUpdates.forEach((update) => {
        createdChannelIds.push(update.textChannelId, update.voiceChannelId);
      });
    } catch {
      await interaction.editReply("Failed to create draft channels. Please check the bot's permissions and try again.");
      return;
    }

    const channelMap = new Map(teamChannelUpdates.map((update) => [update.captainDiscordId, update]));

    const draftType = interaction.options.getString("draft_type", true) as DraftType;

    const teamsData = plannedTeams.map((team) => {
      const channels = channelMap.get(team.captainDiscordId);
      if (!channels) throw new Error(`Missing channel IDs for captain ${team.captainDiscordId}`);
      return {
        sessionId: session.id,
        name: team.name,
        captainDiscordId: team.captainDiscordId,
        pickOrder: team.pickOrder,
        textChannelId: channels.textChannelId,
        voiceChannelId: channels.voiceChannelId,
      };
    });

    const draftChannel = (await guild.channels.fetch(draftChannelId)) as TextChannel;
    const draftMessage = await draftChannel.send({ content: "Setting up draft..." });
    const updatedSession = await startDraftSession(
      session.id,
      draftChannelId,
      draftMessage.id,
      numTeams,
      numPlayersPerTeam,
      draftType,
      teamsData,
    );
    await draftMessage.edit({ content: "", embeds: [buildDraftEmbed(updatedSession)] });

    await interaction.editReply(`Draft started! Check <#${draftChannelId}>.`);
  } catch {
    for (const channelId of createdChannelIds) {
      try {
        await guild.channels.delete(channelId);
      } catch {}
    }

    await interaction.editReply("An error occurred while starting the draft. Please try again.");
  }
}
