export function formatMapName(mapName: string): string {
  return mapName.replace(/([A-Z])/g, " $1").trim();
}
