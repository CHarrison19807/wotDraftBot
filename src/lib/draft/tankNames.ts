import { WG_API_BASE } from "../../constants";

interface WgVehiclesResponse {
  status: "ok" | "error";
  error?: { message: string; code: number };
  meta: {
    count: number;
    page_total: number;
    total: number;
    limit: number;
    page: number | null;
  };
  data: Record<string, { name: string }>;
}

async function fetchTier10TankNames(appId: string): Promise<string[]> {
  const url = `${WG_API_BASE}/wot/encyclopedia/vehicles/?application_id=${appId}&fields=name&tier=10`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`WG API responded with ${res.status}`);

  const body = (await res.json()) as WgVehiclesResponse;

  if (body.status !== "ok") {
    throw new Error(`WG API error: ${body.error?.message ?? "unknown"}`);
  }

  return Object.values(body.data).map((v) => v.name);
}

export async function getRandomTankNames(count: number): Promise<string[]> {
  const appId = process.env.WOT_API_KEY;
  if (!appId) {
    console.warn("WOT_API_KEY is not set - using numeric team names as fallback");
    return Array.from({ length: count }, (_, i) => `Team ${i + 1}`);
  }

  let names: string[];
  try {
    names = await fetchTier10TankNames(appId);
  } catch (err) {
    console.error("Failed to fetch tier 10 tank names from WG API:", err);
    return Array.from({ length: count }, (_, i) => `Team ${i + 1}`);
  }

  // Fisher-Yates shuffle
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = names[i];
    const b = names[j];
    if (a !== undefined && b !== undefined) {
      names[i] = b;
      names[j] = a;
    }
  }

  const result = names.slice(0, count).map((name, i) => (name ? `Team ${name}` : `Team ${i + 1}`));

  return result;
}
