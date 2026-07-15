import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  MarkOrderPaidParams,
  MarkOrderPaidBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { triggerPaymentOCRVerification } from "../lib/ocr.js";
import { AuthenticatedRequest, requireBakerAuth } from "../middlewares/auth.js";

const router = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return { ...o, items: (o.items as unknown[]) ?? [] };
}

// GET /orders
router.get("/orders", requireBakerAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const bakerId = (req as AuthenticatedRequest).bakerId!;
  let dbQuery = db.select().from(ordersTable).where(eq(ordersTable.bakerId, bakerId)).$dynamic();
  if (query.data.status) dbQuery = dbQuery.where(and(eq(ordersTable.bakerId, bakerId), eq(ordersTable.status, query.data.status)));
  const orders = await dbQuery;
  res.json(orders.map(formatOrder));
});

// POST /orders
router.post("/orders", (_req, res): void => {
  // Browser checkout intentionally remains disabled until buyer identity is
  // server verified. Channel agents create pending orders in a later phase.
  res.status(410).json({
    error: "Website checkout is not enabled. Please place your order through the bakery's selected contact channel.",
  });
});

// POST /orders/:orderId/verify-payment
router.post("/orders/:orderId/verify-payment", requireBakerAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [order] = await db.select({ bakerId: ordersTable.bakerId }).from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.bakerId !== (req as AuthenticatedRequest).bakerId) {
    res.status(403).json({ error: "You can only verify your own orders." });
    return;
  }
  const result = await triggerPaymentOCRVerification(orderId);
  if (!result) {
    res.status(400).json({ error: "No screenshot URL found on this order or verification failed." });
    return;
  }
  res.json(result);
});

// GET /orders/:orderId
router.get("/orders/:orderId", requireBakerAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.bakerId !== (req as AuthenticatedRequest).bakerId) {
    res.status(403).json({ error: "You can only access your own orders." });
    return;
  }
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/status
router.patch("/orders/:orderId/status", requireBakerAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const isCancelled = parsed.data.status === "cancelled";
  const [order] = await db.update(ordersTable)
    .set({
      status: parsed.data.status,
      cancellationReason: isCancelled ? parsed.data.cancellationReason?.trim() || "Not specified" : null,
      cancelledBy: isCancelled ? parsed.data.cancelledBy?.trim() || "baker" : null,
      cancelledAt: isCancelled ? new Date() : null,
    })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

// PATCH /orders/:orderId/payment
router.patch("/orders/:orderId/payment", requireBakerAuth, async (req, res): Promise<void> => {
  const params = MarkOrderPaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = MarkOrderPaidBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.update(ordersTable)
    .set({ paymentStatus: "paid", advancePaid: true, paymentAmountReceived: parsed.data.amountReceived })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

export default router;
