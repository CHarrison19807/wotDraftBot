import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { deleteOrphanedPickBanState } from "./db/pickBanState";
import { handleButtonInteraction } from "./interactionHandlers/handleButtonInteraction";
import { handleSlashCommand } from "./interactionHandlers/handleSlashCommand";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.ChannelDelete, (channel) => {
  deleteOrphanedPickBanState(channel.id).catch((error) => {
    console.error(`Failed to delete pick/ban state for channel ${channel.id}:`, error);
  });
});

client.on(Events.InteractionCreate, (interaction) => {
  if (interaction.isChatInputCommand()) handleSlashCommand(interaction);
  if (interaction.isButton()) handleButtonInteraction(interaction);
});

client.login(process.env.DISCORD_TOKEN);
