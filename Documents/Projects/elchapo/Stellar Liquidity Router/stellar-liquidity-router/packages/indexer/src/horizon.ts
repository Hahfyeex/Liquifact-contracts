import StellarSdk from "@stellar/stellar-sdk";
import { Asset, PoolEdge } from "@stellar-router/core";

const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

function toAsset(a: StellarSdk.Asset): Asset {
  return a.isNative()
    ? { code: "XLM" }
    : { code: a.getCode(), issuer: a.getIssuer() };
}

/**
 * Fetch all AMM liquidity pools from Horizon and map them to PoolEdges.
 */
export async function fetchAmmPools(): Promise<PoolEdge[]> {
  const edges: PoolEdge[] = [];
  let page = await server.liquidityPools().limit(200).call();

  while (page.records.length > 0) {
    for (const pool of page.records) {
      if (pool.reserves.length !== 2) continue;
      const [r0, r1] = pool.reserves;
      const assetA = StellarSdk.Asset.fromOperation(
        StellarSdk.xdr.Asset.fromXDR(r0.asset, "base64")
      );
      const assetB = StellarSdk.Asset.fromOperation(
        StellarSdk.xdr.Asset.fromXDR(r1.asset, "base64")
      );

      edges.push({
        type: "amm",
        poolId: pool.id,
        assetA: toAsset(assetA),
        assetB: toAsset(assetB),
        reserveA: BigInt(Math.floor(parseFloat(r0.amount) * 1e7)),
        reserveB: BigInt(Math.floor(parseFloat(r1.amount) * 1e7)),
        fee: pool.fee_bp ?? 30,
      });
    }

    if (page.records.length < 200) break;
    page = await page.next();
  }

  return edges;
}

/**
 * Fetch top order book offers for a pair and synthesize a single PoolEdge
 * representing the aggregate liquidity at the best price.
 */
export async function fetchOrderBookEdge(
  selling: StellarSdk.Asset,
  buying: StellarSdk.Asset
): Promise<PoolEdge | null> {
  try {
    const ob = await server.orderbook(selling, buying).limit(20).call();
    if (!ob.asks.length || !ob.bids.length) return null;

    const totalAsk = ob.asks.reduce((s, a) => s + parseFloat(a.amount), 0);
    const totalBid = ob.bids.reduce((s, b) => s + parseFloat(b.amount), 0);
    const midPrice = (parseFloat(ob.asks[0].price) + parseFloat(ob.bids[0].price)) / 2;

    return {
      type: "orderbook",
      assetA: toAsset(selling),
      assetB: toAsset(buying),
      reserveA: BigInt(Math.floor(totalAsk * 1e7)),
      reserveB: BigInt(Math.floor(totalAsk * midPrice * 1e7)),
      fee: 0,
    };
  } catch {
    return null;
  }
}
