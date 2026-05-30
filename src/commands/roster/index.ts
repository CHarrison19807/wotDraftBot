import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { WotRegion } from "../../generated/prisma/client";
import { verifyInteraction } from "../../lib/verifyInteraction";
import { executeAdd } from "./add";
import { executeClear } from "./clear";
import { executeCreate } from "./create";
import { executeRemove } from "./remove";

const Subcommand = {
  Create: "create",
  Add: "add",
  Remove: "remove",
  Clear: "clear",
} as const;

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("Roster management commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Create)
      .setDescription("Create a new session from a roster CSV")
      .addAttachmentOption((opt) => opt.setName("roster_csv").setDescription("Roster CSV file").setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Add)
      .setDescription("Add a player to a pending session")
      .addUserOption((opt) => opt.setName("player").setDescription("Discord user to add").setRequired(true))
      .addStringOption((opt) => opt.setName("wot_id").setDescription("World of Tanks account ID").setRequired(true))
      .addStringOption((opt) =>
        opt
          .setName("region")
          .setDescription("WoT account region")
          .setRequired(true)
          .addChoices(
            { name: "NA", value: WotRegion.Na },
            { name: "EU", value: WotRegion.Eu },
            { name: "Asia", value: WotRegion.Asia },
          ),
      )
      .addBooleanOption((opt) => opt.setName("is_captain").setDescription("Whether this player is a captain"))
      .addBooleanOption((opt) => opt.setName("is_legionnaire").setDescription("Whether this player is a legionnaire")),
  )
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Remove)
      .setDescription("Remove a player from a pending session")
      .addUserOption((opt) => opt.setName("player").setDescription("Discord user to remove").setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName(Subcommand.Clear).setDescription("Cancel the session and clear all roster data"));

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const result = verifyInteraction(interaction);
  if (!result) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { interaction: verifiedInteraction } = result;
  const subcommand = verifiedInteraction.options.getSubcommand();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (subcommand === Subcommand.Create) return executeCreate(verifiedInteraction);
  if (subcommand === Subcommand.Add) return executeAdd(verifiedInteraction);
  if (subcommand === Subcommand.Remove) return executeRemove(verifiedInteraction);
  if (subcommand === Subcommand.Clear) return executeClear(verifiedInteraction);
};
