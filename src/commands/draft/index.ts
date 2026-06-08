import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { DraftType } from "../../generated/prisma/enums";
import { verifyInteraction } from "../../lib/verifyInteraction";
import { executeCancel } from "./cancel";
import { executePick } from "./pick";
import { executeSetOrder } from "./setorder";
import { executeStart } from "./start";

const Subcommand = {
  SetOrder: "setorder",
  Cancel: "cancel",
  Start: "start",
  Pick: "pick",
} as const;

const ADMIN_SUBCOMMANDS = new Set<string>([Subcommand.SetOrder, Subcommand.Cancel, Subcommand.Start]);

export const data = new SlashCommandBuilder()
  .setName("draft")
  .setDescription("Player draft commands")
  .addSubcommand((sub) =>
    sub.setName(Subcommand.SetOrder).setDescription("Set the captain pick order for the active draft session"),
  )
  .addSubcommand((sub) => sub.setName(Subcommand.Cancel).setDescription("Cancel the active draft session"))
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Start)
      .setDescription("Start the pending session and create team channels")
      .addStringOption((opt) =>
        opt
          .setName("draft_type")
          .setDescription("Draft order type")
          .setRequired(true)
          .addChoices({ name: "Snake", value: DraftType.Snake }, { name: "Normal", value: DraftType.Regular }),
      ),
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

  if (ADMIN_SUBCOMMANDS.has(subcommand)) {
    if (!verifiedInteraction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await verifiedInteraction.reply({
        content: "You need Administrator permissions to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  if (subcommand === Subcommand.SetOrder) return executeSetOrder(verifiedInteraction);
  if (subcommand === Subcommand.Cancel) return executeCancel(verifiedInteraction);
  if (subcommand === Subcommand.Start) return executeStart(verifiedInteraction);
  if (subcommand === Subcommand.Pick) return executePick(verifiedInteraction);
};
