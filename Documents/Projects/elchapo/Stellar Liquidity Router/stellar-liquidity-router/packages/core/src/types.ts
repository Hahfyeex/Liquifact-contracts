export interface Asset {
  code: string;
  issuer?: string; // undefined = XLM (native)
}

export interface PoolEdge {
  type: "amm" | "orderbook";
  poolId?: string;
  assetA: Asset;
  assetB: Asset;
  reserveA: bigint;
  reserveB: bigint;
  fee: number; // basis points e.g. 30 = 0.3%
}

export interface SwapRoute {
  path: Asset[];
  edges: PoolEdge[];
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number; // 0-1
  fee: bigint;
}

export interface QuoteRequest {
  assetIn: Asset;
  assetOut: Asset;
  amountIn: bigint;
  slippageTolerance: number; // 0-1, e.g. 0.005 = 0.5%
  maxHops?: number; // default 3
}

export interface QuoteResult {
  bestRoute: SwapRoute;
  alternativeRoutes: SwapRoute[];
  minAmountOut: bigint; // after slippage
  executionPrice: number;
}

export interface LiquidityGraph {
  nodes: Set<string>; // asset identifiers
  edges: Map<string, PoolEdge[]>; // assetKey -> edges
}
