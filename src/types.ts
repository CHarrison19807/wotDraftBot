import type { ChatInputCommandInteraction, Guild, GuildMember } from "discord.js";
import type { PickBanAction, PickBanState } from "./generated/prisma/client";

export type GuildChatInputCommandInteraction = ChatInputCommandInteraction & { guild: Guild; botMember: GuildMember };
export type StateWithActions = PickBanState & { actions: PickBanAction[] };
