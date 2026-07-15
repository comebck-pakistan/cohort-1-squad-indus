import { Router } from "express";

const router = Router();

// Sweet Tooth is currently channel-first: orders are confirmed through the
// baker's selected WhatsApp or Instagram conversation. The former browser
// cart trusted a client-provided buyerId and must not be exposed publicly.
router.all("/cart", (_req, res): void => {
  res.status(410).json({
    error: "Website checkout is not enabled. Please place your order through the bakery's selected contact channel.",
  });
});

router.all("/cart/:cartItemId", (_req, res): void => {
  res.status(410).json({
    error: "Website checkout is not enabled. Please place your order through the bakery's selected contact channel.",
  });
});

router.all("/cart/clear", (_req, res): void => {
  res.status(410).json({
    error: "Website checkout is not enabled. Please place your order through the bakery's selected contact channel.",
  });
});

export default router;
