import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { commands } from "../commands/index";

const commandMap = new Map(commands.map((command) => [command.data.name, command]));

export async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error executing this command.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error executing this command.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error("Failed to send error reply:", replyError);
    }
  }
}
