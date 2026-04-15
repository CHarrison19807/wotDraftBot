import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { verifyInteraction } from "../../lib/verifyInteraction";
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

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const result = verifyInteraction(interaction);

  if (!result) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { interaction: verifiedInteraction, botMember } = result;
  const subcommand = verifiedInteraction.options.getSubcommand();

  if (subcommand === Subcommand.Set) return executeSet(verifiedInteraction, botMember);
  if (subcommand === Subcommand.View) return executeView(verifiedInteraction);
};
