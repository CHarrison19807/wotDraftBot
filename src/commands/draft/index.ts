import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { DraftType } from "../../generated/prisma/client";
import { verifyInteraction } from "../../lib/verifyInteraction";
import { executeCancel } from "./cancel";
import { executeInit } from "./init";
import { executeSetOrder } from "./setorder";
import { executeStart } from "./start";

const Subcommand = {
  Init: "init",
  SetOrder: "setorder",
  Cancel: "cancel",
  Start: "start",
} as const;

export const data = new SlashCommandBuilder()
  .setName("draft")
  .setDescription("Player draft commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Init)
      .setDescription("Initialize a new draft session from a roster CSV")
      .addIntegerOption((opt) =>
        opt.setName("num_teams").setDescription("Number of teams").setRequired(true).setMinValue(2).setMaxValue(10),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("max_players_per_team")
          .setDescription("Maximum players per team")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(18),
      )
      .addStringOption((opt) =>
        opt
          .setName("draft_type")
          .setDescription("Draft order type")
          .setRequired(true)
          .addChoices({ name: "Snake", value: DraftType.Snake }, { name: "Normal", value: DraftType.Regular }),
      )
      .addAttachmentOption((opt) =>
        opt
          .setName("roster")
          .setDescription('Roster CSV, see the "Roster CSV Format" section of the README for details')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName(Subcommand.SetOrder).setDescription("Set the captain pick order for the active draft session"),
  )
  .addSubcommand((sub) => sub.setName(Subcommand.Cancel).setDescription("Cancel the active draft session"))
  .addSubcommand((sub) =>
    sub.setName(Subcommand.Start).setDescription("Start the active draft session and create team channels"),
  )
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const result = verifyInteraction(interaction);
  if (!result) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { interaction: verifiedInteraction } = result;
  const subcommand = verifiedInteraction.options.getSubcommand();

  if (subcommand === Subcommand.Init) return executeInit(verifiedInteraction);
  if (subcommand === Subcommand.SetOrder) return executeSetOrder(verifiedInteraction);
  if (subcommand === Subcommand.Cancel) return executeCancel(verifiedInteraction);
  if (subcommand === Subcommand.Start) return executeStart(verifiedInteraction);
};
