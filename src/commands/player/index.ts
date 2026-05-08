import { type ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getActiveDraftSession } from "../../db/draftSession";
import { verifyInteraction } from "../../lib/verifyInteraction";
import { executePlayerInfo } from "./info";
import { executePlayerList } from "./list";

const Subcommand = {
  Info: "info",
  List: "list",
} as const;

export const data = new SlashCommandBuilder()
  .setName("player")
  .setDescription("Player lookup commands")
  .addSubcommand((sub) =>
    sub
      .setName(Subcommand.Info)
      .setDescription("View info about a player in the active draft")
      .addUserOption((opt) => opt.setName("player").setDescription("The player to look up").setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName(Subcommand.List).setDescription("List all players and their draft status"));

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = verifyInteraction(interaction);

  if (!result) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const { interaction: verifiedInteraction } = result;
  const session = await getActiveDraftSession(verifiedInteraction.guild.id);

  if (!session) {
    await interaction.editReply("No active draft session.");
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === Subcommand.Info) return executePlayerInfo(verifiedInteraction, session);
  if (subcommand === Subcommand.List) return executePlayerList(verifiedInteraction, session);
};
