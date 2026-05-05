import {
  ActingTeam,
  MapSide,
  type PickBanFormat,
  PickBanStepAction,
  WorldOfTanksMapName,
} from "./generated/prisma/client";

const TeamA = ActingTeam.TeamA;
const TeamB = ActingTeam.TeamB;
const MapPick = PickBanStepAction.MapPick;
const SidePick = PickBanStepAction.SidePick;
const MapBan = PickBanStepAction.MapBan;
const North = MapSide.North;
const South = MapSide.South;
const East = MapSide.East;
const West = MapSide.West;

export const WG_API_BASE = "https://api.worldoftanks.com";
export const TOMATO_GG_BASE = "https://tomato.gg";
export const rosterTruthyValues = new Set(["yes", "true", "1"]);
export const rosterFalsyValues = new Set(["no", "false", "0", ""]);
export const validRegions = new Set(["na", "eu", "asia"]);

export const CustomId = {
  DraftSetOrderConfirm: "draft_setorder_confirm",
  DraftSetOrderReset: "draft_setorder_reset",
  DraftSetOrderMenu: "draft_setorder_menu",
  DraftPickConfirm: "draft_pick_confirm",
} as const;

export interface WorldOfTanksMap {
  name: WorldOfTanksMapName;
  sideOptions: MapSide[];
}

export interface PickBanStep {
  action: PickBanStepAction;
  actingTeam: ActingTeam;
}

export const MAP_POOL: WorldOfTanksMap[] = [
  {
    name: WorldOfTanksMapName.Cliff,
    sideOptions: [North, South],
  },
  {
    name: WorldOfTanksMapName.Ensk,
    sideOptions: [North, South],
  },
  {
    name: WorldOfTanksMapName.GhostTown,
    sideOptions: [North, South],
  },
  {
    name: WorldOfTanksMapName.Himmelsdorf,
    sideOptions: [North, South],
  },
  {
    name: WorldOfTanksMapName.Westfield,
    sideOptions: [East, West],
  },
  {
    name: WorldOfTanksMapName.Pilsen,
    sideOptions: [North, South],
  },
  {
    name: WorldOfTanksMapName.SandRiver,
    sideOptions: [East, West],
  },
  {
    name: WorldOfTanksMapName.Tundra,
    sideOptions: [North, South],
  },
  {
    name: WorldOfTanksMapName.Ruinberg,
    sideOptions: [North, South],
  },
];

export const PICK_BAN_CONFIGS: { [key in PickBanFormat]: PickBanStep[] } = {
  Bo5: [
    { action: MapBan, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamB },
    { action: MapPick, actingTeam: TeamB },
    { action: SidePick, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapBan, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapBan, actingTeam: TeamA },
  ],
  Bo7: [
    { action: MapBan, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamB },
    { action: MapPick, actingTeam: TeamB },
    { action: SidePick, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapBan, actingTeam: TeamA },
    { action: MapPick, actingTeam: TeamB },
    { action: SidePick, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamA },
  ],
  Bo9: [
    { action: MapBan, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamB },
    { action: MapPick, actingTeam: TeamB },
    { action: SidePick, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamB },
    { action: MapBan, actingTeam: TeamA },
    { action: MapPick, actingTeam: TeamB },
    { action: SidePick, actingTeam: TeamA },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamB },
  ],
  // TODO: Make correct Bo11 config, currently testing config
  Bo11: [
    { action: MapBan, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamA },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamA },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamA },
    { action: MapPick, actingTeam: TeamA },
    { action: SidePick, actingTeam: TeamA },
    { action: MapBan, actingTeam: TeamA },
  ],
};
