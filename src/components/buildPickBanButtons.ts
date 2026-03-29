import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MAP_POOL, PICK_BAN_CONFIGS } from "../constants.js";
import { type PickBanAction, type PickBanState, PickBanStatus, PickBanStepAction } from "../generated/prisma/client.js";
import { formatMapName } from "../lib/formatMapName.js";

type StateWithActions = PickBanState & { actions: PickBanAction[] };

export function buildPickBanButtons(pickBanState: StateWithActions): ActionRowBuilder<ButtonBuilder>[] {
  const { currentStepIndex, format, status, actions } = pickBanState;

  const pickBanSteps = PICK_BAN_CONFIGS[format];
  const currentStep = pickBanSteps[currentStepIndex];

  if (!currentStep || status === PickBanStatus.Complete) return [];

  const currentStepAction = currentStep.action;

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();

  if (currentStepAction === PickBanStepAction.SidePick) {
    const previousStepIndex = currentStepIndex - 1;
    const previousStep = pickBanSteps[previousStepIndex];

    if (!previousStep || previousStep.action !== PickBanStepAction.MapPick) {
      return [];
    }

    const previousAction = actions[previousStepIndex];
    if (!previousAction?.mapName) {
      return [];
    }

    const mapDef = MAP_POOL.find((m) => m.name === previousAction.mapName);
    if (!mapDef) return [];

    for (const side of mapDef.sideOptions) {
      row.addComponents(
        new ButtonBuilder().setLabel(side).setStyle(ButtonStyle.Secondary).setCustomId(`${currentStepAction}:${side}`),
      );
    }
    rows.push(row);
    return rows;
  }

  const style = currentStepAction === PickBanStepAction.MapPick ? ButtonStyle.Success : ButtonStyle.Danger;

  for (const mapName of pickBanState.availableMaps) {
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder<ButtonBuilder>();
    }
    row.addComponents(
      new ButtonBuilder()
        .setLabel(formatMapName(mapName))
        .setStyle(style)
        .setCustomId(`${currentStepAction}:${mapName}`),
    );
  }

  if (row.components.length > 0) rows.push(row);

  return rows;
}
