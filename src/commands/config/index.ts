import {
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { GuildChatInputCommandInteraction } from "../../types";
import { executeSet } from "./set";
import { executeView } from "./view";

const Subcommand = {
  Set: "set",
  View: "view",
} as const;

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure bot settings for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Set)
      .setDescription("Update a config setting")
      .addChannelOption((opt) =>
        opt
          .setName("results-channel")
          .setDescription("Channel to post pick/ban results to")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) => sub.setName(Subcommand.View).setDescription("View current config settings"));

function hasGuild(
  interaction: ChatInputCommandInteraction,
): interaction is ChatInputCommandInteraction & { guild: Guild } {
  return interaction.guild !== null;
}

export const execute = async (interaction: ChatInputCommandInteraction) => {
  if (!hasGuild(interaction)) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const botMember = interaction.guild.members.me;
  if (!botMember) {
    await interaction.reply({ content: "Bot member not found in the guild.", flags: MessageFlags.Ephemeral });
    return;
  }

  const enriched = interaction as GuildChatInputCommandInteraction;
  enriched.botMember = botMember;

  const subcommand = enriched.options.getSubcommand();

  if (subcommand === Subcommand.Set) return executeSet(enriched);
  if (subcommand === Subcommand.View) return executeView(enriched);
};
