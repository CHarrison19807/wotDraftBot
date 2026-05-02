import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

export interface CaptainInfo {
  userId: string;
  username: string;
}

export function buildSetOrderComponents(
  sessionId: string,
  allCaptains: CaptainInfo[],
  currentOrder: string[],
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const placed = new Set(currentOrder);
  const remaining = allCaptains.filter((c) => !placed.has(c.userId));
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  if (remaining.length === 0) {
    // All captains placed - show confirm + reset in one row
    const confirmBtn = new ButtonBuilder()
      .setCustomId(`draft_setorder_confirm:${sessionId}`)
      .setLabel("Confirm Order")
      .setStyle(ButtonStyle.Success);
    const resetBtn = new ButtonBuilder()
      .setCustomId(`draft_setorder_reset:${sessionId}`)
      .setLabel("Reset")
      .setStyle(ButtonStyle.Danger);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmBtn,
        resetBtn,
      ) as ActionRowBuilder<MessageActionRowComponentBuilder>,
    );
    return rows;
  }

  // Show select menu for next captain
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`draft_setorder_menu:${sessionId}`)
    .setPlaceholder(`Select captain for pick slot #${currentOrder.length + 1}`)
    .addOptions(
      remaining.map((c) => ({
        label: c.username,
        value: c.userId,
      })),
    );
  rows.push(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      menu,
    ) as ActionRowBuilder<MessageActionRowComponentBuilder>,
  );

  if (currentOrder.length > 0) {
    const resetBtn = new ButtonBuilder()
      .setCustomId(`draft_setorder_reset:${sessionId}`)
      .setLabel("Reset")
      .setStyle(ButtonStyle.Danger);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        resetBtn,
      ) as ActionRowBuilder<MessageActionRowComponentBuilder>,
    );
  }

  return rows;
}

export function buildSetOrderContent(allCaptains: CaptainInfo[], currentOrder: string[]): string {
  const lines: string[] = ["**Set Captain Pick Order**", ""];

  if (currentOrder.length === 0) {
    lines.push("Select the captain who picks **first**:");
  } else {
    lines.push("**Current order:**");
    for (let i = 0; i < currentOrder.length; i++) {
      const captain = allCaptains.find((c) => c.userId === currentOrder[i]);
      lines.push(`${i + 1}. <@${currentOrder[i]}>${captain ? ` (${captain.username})` : ""}`);
    }

    const placed = new Set(currentOrder);
    const remaining = allCaptains.filter((c) => !placed.has(c.userId));

    lines.push("");
    if (remaining.length > 0) {
      lines.push(`Select the captain for pick slot **#${currentOrder.length + 1}**:`);
    } else {
      lines.push("All captains placed. Confirm or reset the order.");
    }
  }

  return lines.join("\n");
}
