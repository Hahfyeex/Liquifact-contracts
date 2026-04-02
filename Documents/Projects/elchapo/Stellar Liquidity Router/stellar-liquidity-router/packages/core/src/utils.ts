import { Asset } from "./types";

export function assetKey(asset: Asset): string {
  return asset.issuer ? `${asset.code}:${asset.issuer}` : "XLM";
}

/**
 * AMM constant-product output: (reserveOut * amountIn * (10000 - fee)) / (reserveIn * 10000 + amountIn * (10000 - fee))
 */
export function ammAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number
): bigint {
  const feeMultiplier = BigInt(10000 - feeBps);
  const numerator = reserveOut * amountIn * feeMultiplier;
  const denominator = reserveIn * 10000n + amountIn * feeMultiplier;
  return numerator / denominator;
}

export function priceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  const spotPrice = Number(reserveOut) / Number(reserveIn);
  const executionPrice = Number(reserveOut - ammAmountOut(amountIn, reserveIn, reserveOut, 0)) / Number(amountIn);
  return Math.abs(spotPrice - executionPrice) / spotPrice;
}
