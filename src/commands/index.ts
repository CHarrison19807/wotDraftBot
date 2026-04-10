import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import * as config from "./config";
import * as pickban from "./pickban";
import * as ping from "./ping";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = [ping, pickban, config];
