import type { ChatInputCommandInteraction, Guild } from "discord.js";
import type { PickBanAction, PickBanState } from "./generated/prisma/client";

export type GuildChatInputCommandInteraction = ChatInputCommandInteraction & { guild: Guild };
export type StateWithActions = PickBanState & { actions: PickBanAction[] };
