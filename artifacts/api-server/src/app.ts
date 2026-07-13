import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { ensureDatabase } from "./bootstrap-db.js";

// Vercel has no separate migration runner for this API. Initialise the
// idempotent schema before exposing routes, including for a newly linked Neon DB.
await ensureDatabase();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Indus API is running", health: "/api/healthz" });
});

app.use("/api", router);

export default app;
