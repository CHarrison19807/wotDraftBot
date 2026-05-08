import type { ChatInputCommandInteraction, Guild } from "discord.js";
import type { ActingTeam, PickBanAction, PickBanState, PickBanStepAction } from "./generated/prisma/client";

export type GuildChatInputCommandInteraction = ChatInputCommandInteraction & { guild: Guild };
export type StateWithActions = PickBanState & { actions: PickBanAction[] };

export interface PickBanStep {
  action: PickBanStepAction;
  actingTeam: ActingTeam;
}
