import { ChannelType, type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { PickBanFormat } from "../../generated/prisma/client";
import { executeCancel } from "./cancel";
import { executeCleanup } from "./cleanup";
import { executeResend } from "./resend";
import { executeStart } from "./start";

const Subcommand = {
  Start: "start",
  Cleanup: "cleanup",
  Resend: "resend",
  Cancel: "cancel",
} as const;

export const data = new SlashCommandBuilder()
  .setName("pickban")
  .setDescription("Map pick/ban commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Start)
      .setDescription("Start a new pick/ban session")
      .addStringOption((opt) =>
        opt
          .setName("format")
          .setDescription("Series format")
          .setRequired(true)
          .addChoices(
            { name: "Bo5", value: PickBanFormat.Bo5 },
            { name: "Bo7", value: PickBanFormat.Bo7 },
            { name: "Bo9", value: PickBanFormat.Bo9 },
            { name: "Bo11", value: PickBanFormat.Bo11 },
          ),
      )
      .addUserOption((opt) => opt.setName("captain_a").setDescription("Team A captain").setRequired(true))
      .addUserOption((opt) => opt.setName("captain_b").setDescription("Team B captain").setRequired(true))
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Category to create the pick/ban channel in")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Cleanup)
      .setDescription("Delete all pick/ban channels in the category")
      .addStringOption((opt) =>
        opt
          .setName("filter")
          .setDescription("Only delete channels whose name contains this substring")
          .setRequired(true),
      )
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Category to clean up (defaults to Pick-Ban-Sessions)")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName(Subcommand.Resend).setDescription("Resend the pick/ban embed for the active session in this channel"),
  )
  .addSubcommand((sub) =>
    sub.setName(Subcommand.Cancel).setDescription("Cancel the active pick/ban session in this channel"),
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === Subcommand.Start) return executeStart(interaction);
  if (subcommand === Subcommand.Cleanup) return executeCleanup(interaction);
  if (subcommand === Subcommand.Resend) return executeResend(interaction);
  if (subcommand === Subcommand.Cancel) return executeCancel(interaction);
};
