import { Asset, QuoteRequest, QuoteResult } from "@stellar-router/core";

export interface RouterClientOptions {
  baseUrl: string;
  timeout?: number;
}

export class RouterClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options: RouterClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeout = options.timeout ?? 10_000;
  }

  /**
   * Get a swap quote for the given request.
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResult> {
    const body = {
      assetIn: request.assetIn,
      assetOut: request.assetOut,
      amountIn: request.amountIn.toString(),
      slippageTolerance: request.slippageTolerance,
      maxHops: request.maxHops ?? 3,
    };

    const res = await this.fetch("/quote", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await res.json();
    // Deserialize bigints from strings
    return this.deserializeQuote(data);
  }

  /**
   * Build and return a Stellar transaction envelope for the best route.
   * The caller is responsible for signing and submitting.
   */
  async buildSwapTx(
    request: QuoteRequest,
    sourceAccount: string
  ): Promise<{ xdr: string; minAmountOut: string }> {
    const body = {
      ...request,
      amountIn: request.amountIn.toString(),
      sourceAccount,
    };

    const res = await this.fetch("/swap/build", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return res.json();
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await globalThis.fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deserializeQuote(data: any): QuoteResult {
    const deserializeRoute = (r: any) => ({
      ...r,
      amountIn: BigInt(r.amountIn),
      amountOut: BigInt(r.amountOut),
      fee: BigInt(r.fee),
      reserveA: r.reserveA ? BigInt(r.reserveA) : undefined,
      reserveB: r.reserveB ? BigInt(r.reserveB) : undefined,
    });

    return {
      bestRoute: deserializeRoute(data.bestRoute),
      alternativeRoutes: (data.alternativeRoutes ?? []).map(deserializeRoute),
      minAmountOut: BigInt(data.minAmountOut),
      executionPrice: data.executionPrice,
    };
  }
}
