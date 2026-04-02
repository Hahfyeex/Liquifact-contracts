import { LiquidityGraph, PoolEdge, buildGraph } from "@stellar-router/core";
import { fetchAmmPools } from "./horizon";

const REFRESH_INTERVAL_MS = 30_000; // 30s

let cachedGraph: LiquidityGraph | null = null;
let lastRefresh = 0;

export async function getLiquidityGraph(): Promise<LiquidityGraph> {
  const now = Date.now();
  if (cachedGraph && now - lastRefresh < REFRESH_INTERVAL_MS) {
    return cachedGraph;
  }

  const edges: PoolEdge[] = await fetchAmmPools();
  cachedGraph = buildGraph(edges);
  lastRefresh = now;
  return cachedGraph;
}
