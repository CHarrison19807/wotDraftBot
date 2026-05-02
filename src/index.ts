import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { upsertGuildConfig } from "./db/guildConfig";
import { deleteOrphanedPickBanState } from "./db/pickBanState";
import { handleButtonInteraction } from "./interactionHandlers/handleButtonInteraction";
import {
  handleSetOrderConfirm,
  handleSetOrderMenu,
  handleSetOrderReset,
} from "./interactionHandlers/handleSetOrderInteraction";
import { handleSlashCommand } from "./interactionHandlers/handleSlashCommand";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
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

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("draft_setorder_menu:")) {
    handleSetOrderMenu(interaction).catch(console.error);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("draft_setorder_confirm:")) {
      handleSetOrderConfirm(interaction).catch(console.error);
    } else if (interaction.customId.startsWith("draft_setorder_reset:")) {
      handleSetOrderReset(interaction).catch(console.error);
    } else {
      handleButtonInteraction(interaction).catch(console.error);
    }
  }
});

const { DISCORD_TOKEN } = process.env;
if (!DISCORD_TOKEN) {
  console.error("Missing required environment variable: DISCORD_TOKEN");
  process.exit(1);
}

client.login(DISCORD_TOKEN);
