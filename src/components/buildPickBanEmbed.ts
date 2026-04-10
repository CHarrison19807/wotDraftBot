import { EmbedBuilder } from "discord.js";
import { PICK_BAN_CONFIGS } from "../constants";
import { ActingTeam, PickBanStatus, PickBanStepAction } from "../generated/prisma/client";
import type { StateWithActions } from "../types";

export function buildPickBanEmbed(pickBanState: StateWithActions): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("Pick/Ban Session");

  const steps = PICK_BAN_CONFIGS[pickBanState.format];
  if (!steps) {
    return new EmbedBuilder()
      .setTitle("Pick/Ban")
      .setDescription(`Invalid format configuration for ${pickBanState.format}.`)
      .setColor(0xff0000);
  }

  const currentStep = steps[pickBanState.currentStepIndex];
  const isComplete = pickBanState.status === PickBanStatus.Complete;
  const actions = pickBanState.actions;

  // Build table rows, merging MapPick + SidePick into one row
  type TableRow = { teamA: string; action: string; teamB: string };
  const rows: TableRow[] = [];

  let i = 0;
  while (i < actions.length) {
    const a = actions[i];
    if (!a) break;

    if (a.action === PickBanStepAction.MapBan) {
      rows.push({
        teamA: a.actingTeam === ActingTeam.TeamA ? (a.mapName ?? "-") : "-",
        action: "Ban",
        teamB: a.actingTeam === ActingTeam.TeamB ? (a.mapName ?? "-") : "-",
      });
      i++;
    } else if (a.action === PickBanStepAction.MapPick) {
      const next = actions[i + 1];
      if (next?.action === PickBanStepAction.SidePick) {
        rows.push({
          teamA: a.actingTeam === ActingTeam.TeamA ? (a.mapName ?? "-") : (next.side ?? "-"),
          action: "Pick",
          teamB: a.actingTeam === ActingTeam.TeamB ? (a.mapName ?? "-") : (next.side ?? "-"),
        });
        i += 2;
      } else {
        rows.push({
          teamA: a.actingTeam === ActingTeam.TeamA ? (a.mapName ?? "-") : "-",
          action: "Pick",
          teamB: a.actingTeam === ActingTeam.TeamB ? (a.mapName ?? "-") : "-",
        });
        i++;
      }
    } else {
      i++;
    }
  }

  let description: string;
  if (isComplete) {
    description = "Pick/ban complete.";
  } else if (currentStep) {
    const captainId =
      currentStep.actingTeam === ActingTeam.TeamA ? pickBanState.teamACaptainId : pickBanState.teamBCaptainId;
    const verb =
      currentStep.action === PickBanStepAction.SidePick
        ? "pick a side"
        : currentStep.action === PickBanStepAction.MapPick
          ? "pick a map"
          : "ban a map";
    description = `<@${captainId}> **${verb}**`;
  } else {
    description = "Pick/ban complete.";
  }

  if (isComplete && pickBanState.deciderMap) {
    rows.push({ teamA: pickBanState.deciderMap, action: "Decider", teamB: pickBanState.deciderMap });
  }

  const teamACol = rows.map((r) => r.teamA).join("\n") || "\u200b";
  const actionCol = rows.map((r) => r.action).join("\n") || "\u200b";
  const teamBCol = rows.map((r) => r.teamB).join("\n") || "\u200b";

  embed
    .setColor(isComplete ? 0x57f287 : 0x5865f2)
    .setDescription(description)
    .addFields(
      { name: "Team A", value: `<@${pickBanState.teamACaptainId}>\n${teamACol}`, inline: true },
      { name: "Action", value: `\u200b\n${actionCol}`, inline: true },
      { name: "Team B", value: `<@${pickBanState.teamBCaptainId}>\n${teamBCol}`, inline: true },
    );

  return embed;
}
