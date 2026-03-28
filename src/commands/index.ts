import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import * as pickban from "./pickban";
import * as ping from "./ping";
import * as pickban from "./pickban";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = [ping, pickban];
