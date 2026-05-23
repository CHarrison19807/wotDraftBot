import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../constants";
import { PickBanStepAction, Status } from "../generated/prisma/client";
import type { StateWithActions } from "../types";

export function buildPickBanButtons(pickBanState: StateWithActions): ActionRowBuilder<ButtonBuilder>[] {
  const { currentStepIndex, format, status, actions } = pickBanState;

  if (status !== Status.Active) return [];

  const pickBanSteps = PICK_BAN_CONFIGS[format];
  const currentStep = pickBanSteps[currentStepIndex];

  if (!currentStep) return [];

  const currentStepAction = currentStep.action;

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();

  if (currentStepAction === PickBanStepAction.SidePick) {
    const previousStepIndex = currentStepIndex - 1;
    const previousStep = pickBanSteps[previousStepIndex];

    if (!previousStep || previousStep.action !== PickBanStepAction.MapPick) {
      throw new Error(`SidePick at step ${currentStepIndex} is not preceded by a MapPick step`);
    }

    const previousAction = actions[previousStepIndex];
    if (!previousAction?.mapName) {
      throw new Error(`No recorded MapPick action found before SidePick at step ${currentStepIndex}`);
    }

    const mapDef = MAP_POOL[previousAction.mapName];
    if (!mapDef) throw new Error(`Map "${previousAction.mapName}" not found in MAP_POOL`);

    for (const side of mapDef.sideOptions) {
      row.addComponents(
        new ButtonBuilder().setLabel(side).setStyle(ButtonStyle.Secondary).setCustomId(`${currentStepAction}:${side}`),
      );
    }
    rows.push(row);
    return rows;
  }

  const style = currentStepAction === PickBanStepAction.MapPick ? ButtonStyle.Success : ButtonStyle.Danger;

  if (pickBanState.availableMaps.length > 25) {
    throw new Error(
      `Too many available maps (${pickBanState.availableMaps.length}) for pick/ban state ${pickBanState.id} to create buttons`,
    );
  }

  for (const mapName of pickBanState.availableMaps) {
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
    row.addComponents(
      new ButtonBuilder()
        .setLabel(MAP_POOL[mapName].formattedName)
        .setStyle(style)
        .setCustomId(`${currentStepAction}:${mapName}`),
    );
  }

  if (row.components.length > 0) rows.push(row);

  return rows;
}
