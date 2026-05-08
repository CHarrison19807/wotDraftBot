import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { INTERACTION_CUSTOM_IDS } from "../constants";
import type { DraftPlayer } from "../generated/prisma/client";

export function buildPlayerCardConfirmButton(
  sessionId: string,
  draftPlayer: DraftPlayer,
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`${INTERACTION_CUSTOM_IDS.DraftPickConfirm}:${sessionId}:${draftPlayer.id}`)
    .setLabel("Confirm Pick")
    .setStyle(ButtonStyle.Success);

  row.addComponents(confirmButton);
  return row;
}
