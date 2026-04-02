import { Asset, LiquidityGraph, PoolEdge, QuoteRequest, QuoteResult, SwapRoute } from "./types";
import { assetKey, ammAmountOut, priceImpact } from "./utils";
import { getNeighbors } from "./graph";

interface PathState {
  asset: Asset;
  amountOut: bigint;
  path: Asset[];
  edges: PoolEdge[];
  totalFee: bigint;
}

/**
 * DFS-based multi-hop pathfinder. Explores all paths up to maxHops deep
 * and returns them sorted by amountOut descending.
 */
function findAllPaths(
  graph: LiquidityGraph,
  state: PathState,
  targetKey: string,
  maxHops: number,
  visited: Set<string>,
  results: SwapRoute[]
): void {
  const currentKey = assetKey(state.asset);

  if (currentKey === targetKey && state.path.length > 1) {
    const lastAsset = state.path[state.path.length - 1];
    const impact = state.edges.length > 0
      ? priceImpact(state.amountOut, state.edges[state.edges.length - 1].reserveA, state.edges[state.edges.length - 1].reserveB)
      : 0;

    results.push({
      path: [...state.path],
      edges: [...state.edges],
      amountIn: state.path.length > 0 ? state.amountOut : 0n, // set by caller
      amountOut: state.amountOut,
      priceImpact: impact,
      fee: state.totalFee,
    });
    return;
  }

  if (state.path.length - 1 >= maxHops) return;

  for (const edge of getNeighbors(graph, currentKey)) {
    const isA = assetKey(edge.assetA) === currentKey;
    const nextAsset = isA ? edge.assetB : edge.assetA;
    const nextKey = assetKey(nextAsset);

    if (visited.has(nextKey) && nextKey !== targetKey) continue;

    const reserveIn = isA ? edge.reserveA : edge.reserveB;
    const reserveOut = isA ? edge.reserveB : edge.reserveA;
    const out = ammAmountOut(state.amountOut, reserveIn, reserveOut, edge.fee);
    if (out === 0n) continue;

    const feePaid = (state.amountOut * BigInt(edge.fee)) / 10000n;

    visited.add(nextKey);
    findAllPaths(
      graph,
      {
        asset: nextAsset,
        amountOut: out,
        path: [...state.path, nextAsset],
        edges: [...state.edges, edge],
        totalFee: state.totalFee + feePaid,
      },
      targetKey,
      maxHops,
      visited,
      results
    );
    visited.delete(nextKey);
  }
}

export function getQuote(graph: LiquidityGraph, request: QuoteRequest): QuoteResult {
  const { assetIn, assetOut, amountIn, slippageTolerance, maxHops = 3 } = request;
  const targetKey = assetKey(assetOut);

  const results: SwapRoute[] = [];
  const visited = new Set<string>([assetKey(assetIn)]);

  findAllPaths(
    graph,
    { asset: assetIn, amountOut: amountIn, path: [assetIn], edges: [], totalFee: 0n },
    targetKey,
    maxHops,
    visited,
    results
  );

  if (results.length === 0) {
    throw new Error(`No route found from ${assetKey(assetIn)} to ${targetKey}`);
  }

  // Patch amountIn on all routes
  results.forEach((r) => (r.amountIn = amountIn));

  // Sort best first
  results.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

  const best = results[0];
  const minAmountOut = BigInt(
    Math.floor(Number(best.amountOut) * (1 - slippageTolerance))
  );

  return {
    bestRoute: best,
    alternativeRoutes: results.slice(1, 5),
    minAmountOut,
    executionPrice: Number(amountIn) / Number(best.amountOut),
  };
}
