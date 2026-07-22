import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, ordersTable, productsTable, bakersTable } from "@workspace/db";
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
import { rateLimit } from "../middlewares/rate-limiter.js";
import { normalizePakistanPhone } from "../lib/phone.js";

const router = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return { ...o, items: (o.items as unknown[]) ?? [] };
}

const guestOrderSchema = z.object({
  bakerId: z.number().int().positive(),
  buyerName: z.string().trim().min(2).max(120),
  buyerWhatsapp: z.string().trim().min(10).max(24),
  buyerAddress: z.string().trim().min(5).max(400),
  buyerArea: z.string().trim().max(120).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(50),
    sizeLabel: z.string().trim().min(1).max(80).optional(),
    variant: z.string().trim().max(80).nullable().optional(),
  })).min(1).max(30),
  deliveryDate: z.string().optional(),
  specialInstructions: z.string().trim().max(600).optional(),
  source: z.string().trim().max(40).optional(),
});

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

// GET /orders/lookup?phone= — buyer self-serve status (no payment details)
router.get("/orders/lookup", rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const phoneRaw = String(req.query.phone ?? "");
  const normalized = normalizePakistanPhone(phoneRaw);
  if (!normalized) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number." });
    return;
  }
  const digits = normalized.replace(/\D/g, "");
  const variants = Array.from(new Set([
    normalized,
    digits,
    digits.startsWith("92") ? `0${digits.slice(2)}` : digits,
    `+${digits}`,
  ]));
  const orders = await db
    .select({
      id: ordersTable.id,
      bakerId: ordersTable.bakerId,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
      totalPkr: ordersTable.totalPkr,
      deliveryDate: ordersTable.deliveryDate,
      createdAt: ordersTable.createdAt,
      items: ordersTable.items,
    })
    .from(ordersTable)
    .where(inArray(ordersTable.buyerWhatsapp, variants))
    .limit(20);
  res.json(orders.map((o) => ({ ...o, items: (o.items as unknown[]) ?? [] })));
});

// POST /orders — guest checkout with server-side price verification
router.post("/orders", rateLimit(15, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const parsed = guestOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const phone = normalizePakistanPhone(parsed.data.buyerWhatsapp);
  if (!phone) {
    res.status(400).json({ error: "Enter a valid Pakistani WhatsApp number, for example +92 300 1234567." });
    return;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, parsed.data.bakerId)).limit(1);
  if (!baker || baker.marketplaceVisible === false) {
    res.status(404).json({ error: "Baker not found." });
    return;
  }

  const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.bakerId, parsed.data.bakerId), inArray(productsTable.id, productIds)));
  if (products.length !== productIds.length) {
    res.status(400).json({ error: "One or more products are invalid for this bakery." });
    return;
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const lineItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPricePkr: number;
    sizeLabel: string;
    variant: string | null;
  }> = [];
  for (const item of parsed.data.items) {
    const product = productById.get(item.productId)!;
    if (!product.isAvailable) {
      res.status(400).json({ error: `"${product.name}" is currently unavailable.` });
      return;
    }
    const sizes = (product.sizes as Array<{ label: string; pricePkr: number }> | null) ?? [];
    const matchedSize = item.sizeLabel
      ? sizes.find((s) => s.label === item.sizeLabel)
      : sizes[0];
    const unitPricePkr = matchedSize?.pricePkr ?? product.basePricePkr;
    lineItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPricePkr,
      sizeLabel: matchedSize?.label ?? item.sizeLabel ?? "Standard",
      variant: item.variant ?? null,
    });
  }

  const totalPkr = lineItems.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0);

  try {
    const [order] = await db.insert(ordersTable).values({
      bakerId: parsed.data.bakerId,
      buyerName: parsed.data.buyerName,
      buyerWhatsapp: phone,
      buyerAddress: parsed.data.buyerAddress,
      buyerArea: parsed.data.buyerArea ?? null,
      items: lineItems,
      totalPkr,
      deliveryDate: parsed.data.deliveryDate || null,
      specialInstructions: parsed.data.specialInstructions ?? null,
      source: parsed.data.source?.trim() || "web_guest",
      status: "new",
      paymentStatus: "pending",
      requireAdvance: Boolean(baker.requireAdvance),
    }).returning();
    res.status(201).json(formatOrder(order));
  } catch (cause) {
    console.error("Guest order create failed", cause);
    res.status(500).json({ error: "Could not place your order right now. Please try again." });
  }
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

// PATCH /orders/:orderId/payment-screenshot — set receipt image URL for advisory OCR (does not mark paid)
router.patch("/orders/:orderId/payment-screenshot", requireBakerAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.orderId), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const parsed = z.object({
    paymentScreenshotUrl: z.string().url().refine(
      (value) => {
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "paymentScreenshotUrl must be an https URL" },
    ),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [order] = await db.update(ordersTable)
    .set({ paymentScreenshotUrl: parsed.data.paymentScreenshotUrl })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.bakerId, (req as AuthenticatedRequest).bakerId!)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(order));
});

export default router;
