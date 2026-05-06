import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { DraftType } from "../../generated/prisma/client";
import { verifyInteraction } from "../../lib/verifyInteraction";
import { executeCancel } from "./cancel";
import { executeInit } from "./init";
import { executePick } from "./pick";
import { executeSetOrder } from "./setorder";
import { executeStart } from "./start";

const Subcommand = {
  Init: "init",
  SetOrder: "setorder",
  Cancel: "cancel",
  Start: "start",
  Pick: "pick",
} as const;

const ADMIN_SUBCOMMANDS = new Set([Subcommand.Init, Subcommand.SetOrder, Subcommand.Cancel, Subcommand.Start]);

export const data = new SlashCommandBuilder()
  .setName("draft")
  .setDescription("Player draft commands")
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Init)
      .setDescription("Initialize a new draft session from a roster CSV")
      .addIntegerOption((opt) =>
        opt.setName("num_teams").setDescription("Number of teams").setRequired(true).setMinValue(2),
      )
      .addIntegerOption((opt) =>
        opt
          .setName("num_players_per_team")
          .setDescription("Number of players per team")
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
          // TODO write readme section
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
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Pick)
      .setDescription("Pick a player for your team")
      .addUserOption((opt) => opt.setName("player").setDescription("The player to pick").setRequired(true)),
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const result = verifyInteraction(interaction);
  if (!result) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { interaction: verifiedInteraction } = result;
  const subcommand = verifiedInteraction.options.getSubcommand();

  if (subcommand in ADMIN_SUBCOMMANDS) {
    if (!verifiedInteraction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await verifiedInteraction.reply({
        content: "You need Administrator permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  if (subcommand === Subcommand.Init) return executeInit(verifiedInteraction);
  if (subcommand === Subcommand.SetOrder) return executeSetOrder(verifiedInteraction);
  if (subcommand === Subcommand.Cancel) return executeCancel(verifiedInteraction);
  if (subcommand === Subcommand.Start) return executeStart(verifiedInteraction);
  if (subcommand === Subcommand.Pick) return executePick(verifiedInteraction);
};
