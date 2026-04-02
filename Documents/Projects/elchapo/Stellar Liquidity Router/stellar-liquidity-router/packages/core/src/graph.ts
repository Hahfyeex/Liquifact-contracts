import { LiquidityGraph, PoolEdge } from "./types";
import { assetKey } from "./utils";

export function buildGraph(edges: PoolEdge[]): LiquidityGraph {
  const graph: LiquidityGraph = {
    nodes: new Set(),
    edges: new Map(),
  };

  for (const edge of edges) {
    const keyA = assetKey(edge.assetA);
    const keyB = assetKey(edge.assetB);

    graph.nodes.add(keyA);
    graph.nodes.add(keyB);

    if (!graph.edges.has(keyA)) graph.edges.set(keyA, []);
    if (!graph.edges.has(keyB)) graph.edges.set(keyB, []);

    graph.edges.get(keyA)!.push(edge);
    graph.edges.get(keyB)!.push(edge);
  }

  return graph;
}

export function getNeighbors(graph: LiquidityGraph, assetId: string): PoolEdge[] {
  return graph.edges.get(assetId) ?? [];
}
