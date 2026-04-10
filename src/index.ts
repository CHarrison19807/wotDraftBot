import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { upsertGuildConfig } from "./db/guildConfig";
import { deleteOrphanedPickBanState } from "./db/pickBanState";
import { handleButtonInteraction } from "./interactionHandlers/handleButtonInteraction";
import { handleSlashCommand } from "./interactionHandlers/handleSlashCommand";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  for (const guild of readyClient.guilds.cache.values()) {
    await upsertGuildConfig(guild.id).catch((error) => {
      console.error(`Failed to upsert guild config for guild ${guild.id}:`, error);
    });
  }
});

client.on(Events.GuildCreate, (guild) => {
  upsertGuildConfig(guild.id).catch((error) => {
    console.error(`Failed to create guild config for guild ${guild.id}:`, error);
  });
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
