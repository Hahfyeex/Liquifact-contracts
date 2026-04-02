import { Router, Request, Response } from "express";
import StellarSdk from "@stellar/stellar-sdk";
import { getQuote, QuoteRequest } from "@stellar-router/core";
import { getLiquidityGraph } from "@stellar-router/indexer";

const router = Router();
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

function toStellarAsset(a: { code: string; issuer?: string }): StellarSdk.Asset {
  return a.issuer ? new StellarSdk.Asset(a.code, a.issuer) : StellarSdk.Asset.native();
}

// POST /swap/build — returns unsigned XDR transaction envelope
router.post("/build", async (req: Request, res: Response) => {
  try {
    const { assetIn, assetOut, amountIn, slippageTolerance, maxHops, sourceAccount } = req.body;

    if (!assetIn || !assetOut || !amountIn || !sourceAccount) {
      return res.status(400).json({ error: "assetIn, assetOut, amountIn, and sourceAccount are required" });
    }

    const request: QuoteRequest = {
      assetIn,
      assetOut,
      amountIn: BigInt(amountIn),
      slippageTolerance: slippageTolerance ?? 0.005,
      maxHops: maxHops ?? 3,
    };

    const graph = await getLiquidityGraph();
    const quote = getQuote(graph, request);
    const { bestRoute, minAmountOut } = quote;

    const account = await server.loadAccount(sourceAccount);
    const fee = await server.fetchBaseFee();

    // Build path payment strict send
    const sendAsset = toStellarAsset(bestRoute.path[0]);
    const destAsset = toStellarAsset(bestRoute.path[bestRoute.path.length - 1]);
    const sendAmount = (Number(bestRoute.amountIn) / 1e7).toFixed(7);
    const destMin = (Number(minAmountOut) / 1e7).toFixed(7);
    const path = bestRoute.path.slice(1, -1).map(toStellarAsset);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: fee.toString(),
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset,
          sendAmount,
          destination: sourceAccount,
          destAsset,
          destMin,
          path,
        })
      )
      .setTimeout(60)
      .build();

    return res.json({
      xdr: tx.toXDR(),
      minAmountOut: minAmountOut.toString(),
      executionPrice: quote.executionPrice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

export default router;
