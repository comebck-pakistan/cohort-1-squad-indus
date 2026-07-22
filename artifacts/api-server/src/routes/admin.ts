import { Router } from "express";
import { enrichPitchData } from "../seed-enrich.js";

const router = Router();

/** One-time pitch data enrich. Requires Authorization: Bearer <JWT_SECRET or ENRICH_DEMO_SECRET>. */
router.post("/admin/enrich-demo", async (req, res): Promise<void> => {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const enrichSecret = process.env.ENRICH_DEMO_SECRET?.trim();
  const auth = req.headers.authorization;
  const allowed = [jwtSecret, enrichSecret].filter(Boolean);
  if (allowed.length === 0 || !auth || !allowed.some((s) => auth === `Bearer ${s}`)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    await enrichPitchData();
    res.json({ ok: true, message: "Demo bakers enriched with orders, customers, and reviews." });
  } catch (error) {
    console.error("enrich-demo failed", error);
    res.status(500).json({ error: "Enrich failed" });
  }
});

export default router;
