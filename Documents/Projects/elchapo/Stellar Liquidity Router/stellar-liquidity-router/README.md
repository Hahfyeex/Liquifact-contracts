# Stellar Liquidity Router

> Optimized Swaps. Maximum Liquidity.

Smart routing engine that aggregates liquidity across Stellar DEX order books and AMM pools to find the best swap paths with minimal slippage.

## Monorepo Structure

```
packages/
  core/      # Graph-based routing engine + types
  indexer/   # Horizon data fetcher + in-memory cache
  sdk/       # TypeScript client SDK for dApps/wallets
apps/
  api/       # Express REST API
```

## Quick Start

```bash
cp .env.example .env
npm install
npm run build
```

Start the API:
```bash
cd apps/api && npm run start
```

## API

### `POST /quote`
Get the best swap route and estimated output.

```json
{
  "assetIn":  { "code": "USDC", "issuer": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  "assetOut": { "code": "XLM" },
  "amountIn": "10000000",
  "slippageTolerance": 0.005,
  "maxHops": 3
}
```

### `POST /swap/build`
Returns an unsigned Stellar transaction XDR for the optimal path payment.

```json
{
  "assetIn":  { "code": "USDC", "issuer": "..." },
  "assetOut": { "code": "XLM" },
  "amountIn": "10000000",
  "slippageTolerance": 0.005,
  "sourceAccount": "G..."
}
```

## SDK Usage

```ts
import { RouterClient } from "@stellar-router/sdk";

const client = new RouterClient({ baseUrl: "http://localhost:3000" });

const quote = await client.getQuote({
  assetIn:  { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  assetOut: { code: "XLM" },
  amountIn: 10_000_000n, // 1 USDC in stroops
  slippageTolerance: 0.005,
});

console.log(quote.bestRoute.path);
console.log(quote.minAmountOut);
```

## Notes

- All amounts are in **stroops** (1 XLM = 10,000,000 stroops).
- The liquidity graph refreshes every 30 seconds from Horizon.
- `maxHops` controls path depth (default 3, max recommended 4).
