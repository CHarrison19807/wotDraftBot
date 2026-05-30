import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import * as config from "./config";
import * as draft from "./draft";
import * as pickban from "./pickban";
import * as ping from "./ping";
import * as player from "./player";
import * as roster from "./roster";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = [ping, pickban, config, draft, player, roster];
