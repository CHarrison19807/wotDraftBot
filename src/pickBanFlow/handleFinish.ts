import { completePickBanState } from "../db/pickBanAction";
import type { StateWithActions } from "../types";

export async function handleFinish(state: StateWithActions): Promise<StateWithActions> {
  const remaining = state.availableMaps;

  if (remaining.length === 0) {
    throw new Error("No remaining maps to select decider from");
  }

  const decider = remaining[Math.floor(Math.random() * remaining.length)];

  if (!decider) {
    throw new Error("Failed to select a decider map");
  }

  return completePickBanState(state.id, decider);
}
