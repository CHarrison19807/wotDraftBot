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
    const reply = { content: "There was an error executing this command.", MessageFlags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
