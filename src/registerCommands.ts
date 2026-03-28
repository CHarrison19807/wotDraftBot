import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  throw new Error("DISCORD_TOKEN and CLIENT_ID must be set in .env");
}

const rest = new REST().setToken(token);
const body = commands.map((command) => command.data.toJSON());

(async () => {
  try {
    console.log(`Registering ${body.length} slash commands...`);

    const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);

    await rest.put(route, { body });

    const scope = guildId ? `guild ${guildId}` : "global";

    console.log(`Successfully registered ${body.length} command(s) to ${scope}.`);
  } catch (error) {
    console.error(error);
  }
})();
