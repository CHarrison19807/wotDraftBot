import type { ButtonInteraction } from "discord.js";
import { PICK_BAN_CONFIGS } from "../constants.js";
import { advanceStep, recordAction } from "../db/pickBanAction.js";
import type { PickBanAction, PickBanState } from "../generated/prisma/client.js";
import {
  type MapSide,
  PickBanStatus,
  PickBanStepAction,
  type WorldOfTanksMapName,
} from "../generated/prisma/client.js";

export type StateWithActions = PickBanState & { actions: PickBanAction[] };

export async function handleAction(interaction: ButtonInteraction, state: StateWithActions): Promise<StateWithActions> {
  const { format, currentStepIndex, id, availableMaps, status } = state;
  if (status !== PickBanStatus.Active) throw new Error("Cannot perform action on non-active pick/ban session");

  const steps = PICK_BAN_CONFIGS[format];
  const [buttonAction, option] = interaction.customId.split(":");
  const currentStep = steps[currentStepIndex];

  if (!currentStep) throw new Error("Invalid current step index");
  const { action, actingTeam } = currentStep;

  if (buttonAction !== action) throw new Error("Button action does not match current step action");

  const nextStepIndex = currentStepIndex + 1;

  if (action === PickBanStepAction.MapBan || action === PickBanStepAction.MapPick) {
    const mapName = option as WorldOfTanksMapName;
    if (!mapName) throw new Error("Missing map name in customId");

    const newAvailable = state.availableMaps.filter((m) => m !== mapName) as WorldOfTanksMapName[];

    await recordAction({
      stateId: id,
      action,
      actingTeam,
      mapName,
    });

    return (await advanceStep(id, nextStepIndex, newAvailable)) as StateWithActions;
  }

  if (currentStep.action === PickBanStepAction.SidePick) {
    const side = option as MapSide;
    if (!side) throw new Error("Missing side in customId");

    const previousAction = state.actions[currentStepIndex - 1];
    if (!previousAction) throw new Error("No previous action found for side pick");

    const mapName = previousAction.mapName;
    if (!mapName) throw new Error("No previous map pick found for side pick");

    await recordAction({
      stateId: id,
      action,
      actingTeam,
      mapName,
      side,
    });

    return (await advanceStep(id, nextStepIndex, availableMaps as WorldOfTanksMapName[])) as StateWithActions;
  }

  throw new Error(`Unhandled step action: ${action}`);
}
