import type { ButtonInteraction } from "discord.js";
import { PICK_BAN_CONFIGS } from "../constants";
import { recordActionAndAdvanceStep } from "../db/pickBanAction";
import { PickBanStepAction, Status } from "../generated/prisma/client";
import { isMapSide, isWorldOfTanksMapName } from "../lib/guards";
import type { StateWithActions } from "../types";

export async function handleAction(interaction: ButtonInteraction, state: StateWithActions): Promise<StateWithActions> {
  const { format, currentStepIndex, id, status } = state;
  if (status !== Status.Active) throw new Error("Cannot perform action on non-active pick/ban session");

  const steps = PICK_BAN_CONFIGS[format];
  const [buttonAction, option] = interaction.customId.split(":");
  const currentStep = steps[currentStepIndex];

  if (!currentStep) throw new Error("Invalid current step index");
  const { action, actingTeam } = currentStep;

  if (buttonAction !== action) throw new Error("Button action does not match current step action");

  const nextStepIndex = currentStepIndex + 1;

  if (action === PickBanStepAction.MapBan || action === PickBanStepAction.MapPick) {
    if (!option || !isWorldOfTanksMapName(option)) {
      throw new Error(`Invalid or missing map name in customId: ${option}`);
    }

    return recordActionAndAdvanceStep({ stateId: id, action, actingTeam, mapName: option }, id, nextStepIndex);
  }

  if (currentStep.action === PickBanStepAction.SidePick) {
    if (!option || !isMapSide(option)) {
      throw new Error(`Invalid or missing side in customId: ${option}`);
    }

    const previousAction = state.actions[currentStepIndex - 1];
    if (!previousAction) throw new Error("No previous action found for side pick");

    const mapName = previousAction.mapName;
    if (!mapName) throw new Error("No previous map pick found for side pick");

    return recordActionAndAdvanceStep({ stateId: id, action, actingTeam, mapName, side: option }, id, nextStepIndex);
  }

  throw new Error(`Unhandled step action: ${action}`);
}
