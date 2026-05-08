import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { INTERACTION_CUSTOM_IDS } from "../constants";

interface CaptainInfo {
  userId: string;
  username: string;
}

export function buildSetOrderComponents(
  sessionId: string,
  allCaptains: CaptainInfo[],
  currentOrder: string[],
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const placed = new Set(currentOrder);
  const remaining = allCaptains.filter((captain) => !placed.has(captain.userId));
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  const resetButton = new ButtonBuilder()
    .setCustomId(`${INTERACTION_CUSTOM_IDS.DraftSetOrderReset}:${sessionId}`)
    .setLabel("Reset")
    .setStyle(ButtonStyle.Danger);

  const confirmButton = new ButtonBuilder()
    .setCustomId(`${INTERACTION_CUSTOM_IDS.DraftSetOrderConfirm}:${sessionId}`)
    .setLabel("Confirm Order")
    .setStyle(ButtonStyle.Success);

  // All captains placed - show confirm + reset in one row
  if (remaining.length === 0) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        resetButton,
      ) as ActionRowBuilder<MessageActionRowComponentBuilder>,
    );
    return rows;
  }

  // Show select menu for next captain
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${INTERACTION_CUSTOM_IDS.DraftSetOrderMenu}:${sessionId}`)
    .setPlaceholder(`Select captain for pick slot #${currentOrder.length + 1}`)
    .addOptions(
      remaining.map((captain) => ({
        label: captain.username,
        value: captain.userId,
      })),
    );

  rows.push(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      menu,
    ) as ActionRowBuilder<MessageActionRowComponentBuilder>,
  );

  if (currentOrder.length > 0) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        resetButton,
      ) as ActionRowBuilder<MessageActionRowComponentBuilder>,
    );
  }

  return rows;
}

export function buildSetOrderContent(allCaptains: CaptainInfo[], currentOrder: string[]): string {
  const placed = new Set(currentOrder);
  const remaining = allCaptains.filter((captain) => !placed.has(captain.userId));
  const lines: string[] = ["**Set Captain Pick Order**", ""];

  if (currentOrder.length === 0) {
    lines.push("Select the captain who picks **first**:");
  } else {
    lines.push("**Current order:**");
    for (let i = 0; i < currentOrder.length; i++) {
      const captain = allCaptains.find((captain) => captain.userId === currentOrder[i]);
      lines.push(`${i + 1}. <@${currentOrder[i]}>${captain ? ` (${captain.username})` : ""}`);
    }

    lines.push("");
    if (remaining.length > 0) {
      lines.push(`Select the captain for pick slot **#${currentOrder.length + 1}**:`);
    } else {
      lines.push("All captains placed. Confirm or reset the order.");
    }
  }

  return lines.join("\n");
}
