import { ActingTeam, PickBanStepAction } from "../generated/prisma/client";

const actionText: Record<PickBanStepAction, string> = {
  [PickBanStepAction.MapBan]: "ban a map",
  [PickBanStepAction.MapPick]: "pick a map",
  [PickBanStepAction.SidePick]: "pick a side",
};

export function getTurnNotificationContent(
  step: { action: PickBanStepAction; actingTeam: ActingTeam },
  teamACaptainId: string,
  teamBCaptainId: string,
): string {
  const captainId = step.actingTeam === ActingTeam.TeamA ? teamACaptainId : teamBCaptainId;
  return `<@${captainId}> it's your turn to **${actionText[step.action]}**.`;
}
