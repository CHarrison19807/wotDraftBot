import { EmbedBuilder } from "discord.js";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../constants";
import { ActingTeam, PickBanStepAction, Status } from "../generated/prisma/client";
import type { StateWithActions } from "../types";

export function buildPickBanEmbed(pickBanState: StateWithActions): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("Pick/Ban Session");
  const { format, status, actions } = pickBanState;
  const steps = PICK_BAN_CONFIGS[format];
  const currentStep = steps[pickBanState.currentStepIndex];
  const isComplete = status === Status.Complete;

  // Build table rows, merging MapPick + SidePick into one row
  type TableRow = { teamA: string; action: string; teamB: string };

  const rows: TableRow[] = actions.reduce<TableRow[]>((acc, a, i) => {
    const { action, mapName, actingTeam } = a;
    const formattedMapName = MAP_POOL[mapName].formattedName;

    switch (action) {
      case PickBanStepAction.MapPick: {
        const sidePick = actions[i + 1]?.action === PickBanStepAction.SidePick ? actions[i + 1] : null;
        acc.push({
          teamA: actingTeam === ActingTeam.TeamA ? formattedMapName : (sidePick?.side ?? "-"),
          action: "Pick",
          teamB: actingTeam === ActingTeam.TeamB ? formattedMapName : (sidePick?.side ?? "-"),
        });
        break;
      }

      case PickBanStepAction.MapBan: {
        acc.push({
          teamA: actingTeam === ActingTeam.TeamA ? formattedMapName : "-",
          action: "Ban",
          teamB: actingTeam === ActingTeam.TeamB ? formattedMapName : "-",
        });
        break;
      }
      case PickBanStepAction.SidePick: {
        // consumed by the preceding MapPick row
        break;
      }

      default: {
        throw new Error(`Unknown PickBanStepAction: ${action}`);
      }
    }
    return acc;
  }, []);

  let description: string;

  switch (status) {
    case Status.Active: {
      if (!currentStep) {
        throw new Error(
          `No current step found for pick/ban state ${pickBanState.id} at step index ${pickBanState.currentStepIndex}`,
        );
      }
      const captainId =
        currentStep.actingTeam === ActingTeam.TeamA ? pickBanState.teamACaptainId : pickBanState.teamBCaptainId;
      const verb =
        currentStep.action === PickBanStepAction.SidePick
          ? "pick a side"
          : currentStep.action === PickBanStepAction.MapPick
            ? "pick a map"
            : "ban a map";
      description = `<@${captainId}> **${verb}**`;
      break;
    }

    case Status.Complete: {
      description = "Pick/ban complete.";
      break;
    }

    case Status.Cancelled: {
      description = "Pick/ban cancelled.";
      break;
    }

    default: {
      throw new Error(`Unknown pick/ban status: ${status}`);
    }
  }

  if (isComplete && pickBanState.deciderMap) {
    const formattedDeciderMapName = MAP_POOL[pickBanState.deciderMap].formattedName;
    rows.push({
      teamA: formattedDeciderMapName,
      action: "Decider",
      teamB: formattedDeciderMapName,
    });
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
