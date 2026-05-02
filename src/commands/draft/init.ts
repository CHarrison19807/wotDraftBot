import { ChannelType, type GuildMember, MessageFlags, OverwriteType, PermissionFlagsBits } from "discord.js";
import { buildSetOrderComponents, buildSetOrderContent } from "../../components/buildSetOrderComponents";
import { createDraftSessionWithPlayers, getActiveDraftSession } from "../../db/draftSession";
import { parseRoster } from "../../lib/draft/parseRoster";
import { resolveRoster } from "../../lib/draft/resolveRoster";
import { getRandomTankNames } from "../../lib/draft/tankNames";
import { validateRoster } from "../../lib/draft/validateRoster";
import { isDraftType } from "../../lib/guards";
import type { GuildChatInputCommandInteraction } from "../../types";
export async function executeInit(interaction: GuildChatInputCommandInteraction, botMember: GuildMember) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const numTeams = interaction.options.getInteger("num_teams", true);
  const maxPlayersPerTeam = interaction.options.getInteger("max_players_per_team", true);
  const draftType = interaction.options.getString("draft_type", true);
  const captainsRole = interaction.options.getRole("captains_role", true);

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply(
      "The bot is missing the **Manage Channels** permission required to create draft channels.",
    );
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.editReply(
      "The bot is missing the **Manage Roles** permission required to assign the captains role.",
    );
    return;
  }

  const resolvedRole = interaction.guild.roles.cache.get(captainsRole.id);
  if (resolvedRole && botMember.roles.highest.position <= resolvedRole.position) {
    await interaction.editReply(
      `The bot's highest role must be above <@&${resolvedRole.id}> to assign it. Move the bot's role higher and try again.`,
    );
    return;
  }

  const csvAttachment = interaction.options.getAttachment("roster", true);

  const existing = await getActiveDraftSession(interaction.guild.id);

  if (!isDraftType(draftType)) {
    await interaction.editReply("Invalid draft type.");
    return;
  }

  if (existing) {
    await interaction.editReply(
      "An active draft session already exists in this guild. Cancel it before creating a new one.",
    );
    return;
  }

  const csvResponse = await fetch(csvAttachment.url);
  if (!csvResponse.ok) {
    await interaction.editReply("Failed to download the roster CSV.");
    return;
  }
  const csvContent = await csvResponse.text();

  const { players: parsedPlayers, errors: parseErrors } = parseRoster(csvContent);
  if (parseErrors.length > 0) {
    await interaction.editReply(`CSV errors:\n${parseErrors.map((e) => `- ${e}`).join("\n")}`);
    return;
  }

  if (parsedPlayers.length === 0) {
    await interaction.editReply("The roster CSV contains no valid players.");
    return;
  }

  const validationErrors = validateRoster(parsedPlayers, numTeams);
  if (validationErrors.length > 0) {
    await interaction.editReply(`Roster validation errors:\n${validationErrors.map((e) => `- ${e}`).join("\n")}`);
    return;
  }

  const { resolved, errors: resolveErrors } = await resolveRoster(interaction.guild, parsedPlayers);
  if (resolveErrors.length > 0) {
    await interaction.editReply(`Failed to resolve Discord members:\n${resolveErrors.map((e) => `- ${e}`).join("\n")}`);
    return;
  }

  const teamNames = await getRandomTankNames(numTeams);
  const captainRows = resolved.filter((player) => player.isCaptain);

  const teamData = captainRows.map((captain, i) => ({
    name: teamNames[i] ?? `Team ${i + 1}`,
    captainId: captain.discordUserId,
  }));

  // Create Discord channels, collecting IDs for cleanup on failure
  const createdChannelIds: string[] = [];
  let captainsChatChannelId: string | undefined;

  const everyoneId = interaction.guild.roles.everyone.id;
  const botId = botMember.id;

  const sanitize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);

  type TeamWithChannels = (typeof teamData)[number] & { channelId: string; voiceChannelId: string };
  const teamsWithChannels: TeamWithChannels[] = [];

  try {
    const category = await interaction.guild.channels.create({
      name: "Draft Channels",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: botId,
          type: OverwriteType.Member,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect],
        },
      ],
    });
    createdChannelIds.push(category.id);

    const captainsChat = await interaction.guild.channels.create({
      name: "captains",
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: botId,
          type: OverwriteType.Member,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: captainsRole.id,
          type: OverwriteType.Role,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.UseApplicationCommands,
          ],
        },
      ],
    });

    createdChannelIds.push(captainsChat.id);
    captainsChatChannelId = captainsChat.id;

    for (const team of teamData) {
      const textChannel = await interaction.guild.channels.create({
        name: sanitize(team.name),
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: botId,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: team.captainId,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.UseApplicationCommands,
            ],
          },
        ],
      });

      createdChannelIds.push(textChannel.id);

      const voiceChannel = await interaction.guild.channels.create({
        name: `Team ${team.name}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
          {
            id: botId,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.MoveMembers,
            ],
          },
          {
            id: team.captainId,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.Stream,
            ],
          },
        ],
      });
      createdChannelIds.push(voiceChannel.id);

      teamsWithChannels.push({ ...team, channelId: textChannel.id, voiceChannelId: voiceChannel.id });
    }
  } catch (error) {
    await Promise.allSettled(createdChannelIds.map((id) => interaction.guild.channels.delete(id).catch(() => null)));
    console.error("Failed to create draft channels:", error);
    await interaction.editReply("Failed to create draft channels. Check the bot's permissions and try again.");
    return;
  }

  const session = await createDraftSessionWithPlayers(
    {
      guildId: interaction.guild.id,
      channelId: interaction.channelId,
      numTeams,
      maxPlayersPerTeam,
      draftType,
      captainsChatChannelId,
      createdChannelIds,
    },
    resolved,
    teamsWithChannels,
  );

  for (const captain of captainRows) {
    const member = await interaction.guild.members.fetch(captain.discordUserId).catch(() => null);
    if (member && !member.roles.cache.has(captainsRole.id)) {
      await member.roles.add(captainsRole.id).catch((err: unknown) => {
        console.warn(`Failed to grant captain role to ${captain.discordUsername}:`, err);
      });
    }
  }

  const captainsForUi = captainRows.map((p) => ({ userId: p.discordUserId, username: p.discordUsername }));

  await interaction.editReply({
    content: buildSetOrderContent(captainsForUi, []),
    components: buildSetOrderComponents(session.id, captainsForUi, []),
  });
}
