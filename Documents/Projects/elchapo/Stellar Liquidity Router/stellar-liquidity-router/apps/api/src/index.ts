import express from "express";
import quoteRouter from "./routes/quote";
import swapRouter from "./routes/swap";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/quote", quoteRouter);
app.use("/swap", swapRouter);

app.listen(PORT, () => {
  console.log(`Stellar Liquidity Router API running on port ${PORT}`);
});

export default app;
