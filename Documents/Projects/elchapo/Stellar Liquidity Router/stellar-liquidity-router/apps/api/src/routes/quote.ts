import { Router, Request, Response } from "express";
import { getQuote, QuoteRequest } from "@stellar-router/core";
import { getLiquidityGraph } from "@stellar-router/indexer";

const router = Router();

// POST /quote
router.post("/", async (req: Request, res: Response) => {
  try {
    const { assetIn, assetOut, amountIn, slippageTolerance, maxHops } = req.body;

    if (!assetIn || !assetOut || !amountIn) {
      return res.status(400).json({ error: "assetIn, assetOut, and amountIn are required" });
    }

    const request: QuoteRequest = {
      assetIn,
      assetOut,
      amountIn: BigInt(amountIn),
      slippageTolerance: slippageTolerance ?? 0.005,
      maxHops: maxHops ?? 3,
    };

    const graph = await getLiquidityGraph();
    const result = getQuote(graph, request);

    // Serialize bigints to strings for JSON
    return res.json(JSON.parse(JSON.stringify(result, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v
    )));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

export default router;
