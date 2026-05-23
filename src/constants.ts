import { PermissionFlagsBits } from "discord.js";
import {
  ActingTeam,
  MapSide,
  type PickBanFormat,
  PickBanStepAction,
  type WorldOfTanksMapName,
} from "./generated/prisma/client";
import type { PickBanStep } from "./types";

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

export const REQUIRED_PERMISSIONS = new Map<bigint, string>([
  [PermissionFlagsBits.ViewChannel, "View Channel"],
  [PermissionFlagsBits.SendMessages, "Send Messages"],
  [PermissionFlagsBits.ManageChannels, "Manage Channels"],
  [PermissionFlagsBits.ReadMessageHistory, "Read Message History"],
]);

export const INTERACTION_CUSTOM_IDS = {
  DraftSetOrderConfirm: "draft_setorder_confirm",
  DraftSetOrderReset: "draft_setorder_reset",
  DraftSetOrderMenu: "draft_setorder_menu",
  DraftPickConfirm: "draft_pick_confirm",
} as const;

export const TEXT_CHANNEL_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.UseApplicationCommands,
  PermissionFlagsBits.ReadMessageHistory,
] as const;

export const VOICE_CHANNEL_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseVAD,
] as const;

export const MAP_POOL: { [key in WorldOfTanksMapName]: { formattedName: string; sideOptions: MapSide[] } } = {
  Cliff: {
    formattedName: "Cliff",
    sideOptions: [North, South],
  },
  Ensk: {
    formattedName: "Ensk",
    sideOptions: [North, South],
  },
  GhostTown: {
    formattedName: "Ghost Town",
    sideOptions: [North, South],
  },
  Himmelsdorf: {
    formattedName: "Himmelsdorf",
    sideOptions: [North, South],
  },
  Westfield: {
    formattedName: "Westfield",
    sideOptions: [East, West],
  },
  Pilsen: {
    formattedName: "Pilsen",
    sideOptions: [North, South],
  },
  SandRiver: {
    formattedName: "Sand River",
    sideOptions: [East, West],
  },
  Tundra: {
    formattedName: "Tundra",
    sideOptions: [East, West],
  },
  Ruinberg: {
    formattedName: "Ruinberg",
    sideOptions: [North, South],
  },
};

export const PICK_BAN_CONFIGS: { [key in PickBanFormat]: [PickBanStep, ...PickBanStep[]] } = {
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
