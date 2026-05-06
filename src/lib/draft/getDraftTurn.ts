import { DraftType, Status } from "../../generated/prisma/client";

export function getCurrentTeamIndex(currentPickIndex: number, numTeams: number, draftType: DraftType): number {
  if (draftType === DraftType.Snake) {
    const round = Math.floor(currentPickIndex / numTeams);
    const pos = currentPickIndex % numTeams;
    return round % 2 === 0 ? pos : numTeams - 1 - pos;
  }
  return currentPickIndex % numTeams;
}

export function totalDraftPicks(numTeams: number, numPlayersPerTeam: number): number {
  return numTeams * (numPlayersPerTeam - 1);
}

export function isDraftPickable(session: { draftMessageId: string | null; status: Status }): boolean {
  return session.status === Status.Active && session.draftMessageId !== null;
}

export function isDraftComplete(currentPickIndex: number, numTeams: number, numPlayersPerTeam: number): boolean {
  return currentPickIndex >= totalDraftPicks(numTeams, numPlayersPerTeam);
}
