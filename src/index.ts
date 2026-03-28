import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleSlashCommand } from "./interactionHandlers/handleSlashCommand";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, (interaction) => {
  if (interaction.isChatInputCommand()) handleSlashCommand(interaction);
});

client.login(process.env.DISCORD_TOKEN);
