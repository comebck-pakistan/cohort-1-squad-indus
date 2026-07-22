import { Router } from "express";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db, inventoryItemsTable, ledgerEntriesTable, ordersTable } from "@workspace/db";
import { z } from "zod/v4";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";

const router = Router();

const bakerParamSchema = z.object({ bakerId: z.coerce.number().int().positive() });
const inventoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(24).default("pcs"),
  qtyInStock: z.coerce.number().int().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  unitCostPkr: z.coerce.number().int().min(0).default(0),
});
const inventoryUpdateSchema = inventoryCreateSchema.partial();
const ledgerCreateSchema = z.object({
  type: z.enum(["expense", "delivery_cost", "sale_adjustment"]).default("expense"),
  category: z.string().trim().min(1).max(50).default("general"),
  description: z.string().trim().max(240).optional(),
  amountPkr: z.coerce.number().int().min(0),
  entryDate: z.string().date(),
});

function formatDateDaysAgo(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

// GET /inventory/baker/:bakerId
router.get("/inventory/baker/:bakerId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const parsed = bakerParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const items = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.bakerId, parsed.data.bakerId))
    .orderBy(inventoryItemsTable.name);
  res.json(items);
});

// POST /inventory/baker/:bakerId/items
router.post("/inventory/baker/:bakerId/items", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  const body = inventoryCreateSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [item] = await db.insert(inventoryItemsTable).values({
    bakerId: params.data.bakerId,
    ...body.data,
  }).returning();
  res.status(201).json(item);
});

// PATCH /inventory/baker/:bakerId/items/:itemId
router.patch("/inventory/baker/:bakerId/items/:itemId", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = z.object({ bakerId: z.coerce.number().int().positive(), itemId: z.coerce.number().int().positive() }).safeParse(req.params);
  const body = inventoryUpdateSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const payload = body.data;
  if (Object.keys(payload).length === 0) {
    res.status(400).json({ error: "No fields provided." });
    return;
  }
  const [updated] = await db
    .update(inventoryItemsTable)
    .set(payload)
    .where(and(eq(inventoryItemsTable.id, params.data.itemId), eq(inventoryItemsTable.bakerId, params.data.bakerId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Inventory item not found." });
    return;
  }
  res.json(updated);
});

// GET /ledger/baker/:bakerId/entries
router.get("/ledger/baker/:bakerId/entries", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const parsed = bakerParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.bakerId, parsed.data.bakerId))
    .orderBy(desc(ledgerEntriesTable.entryDate), desc(ledgerEntriesTable.id))
    .limit(150);
  res.json(rows);
});

// POST /ledger/baker/:bakerId/entries
router.post("/ledger/baker/:bakerId/entries", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  const body = ledgerCreateSchema.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [entry] = await db.insert(ledgerEntriesTable).values({
    bakerId: params.data.bakerId,
    ...body.data,
  }).returning();
  res.status(201).json(entry);
});

// GET /analytics/baker/:bakerId/khata?period=weekly|monthly
router.get("/analytics/baker/:bakerId/khata", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const params = bakerParamSchema.safeParse(req.params);
  const period = req.query.period === "weekly" ? "weekly" : "monthly";
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const startDate = period === "weekly" ? formatDateDaysAgo(6) : formatDateDaysAgo(29);
  const bakerId = params.data.bakerId;

  const [sales] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${ordersTable.totalPkr}), 0)::int`,
      orders: sql<number>`coalesce(count(*), 0)::int`,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.bakerId, bakerId),
        gte(sql`date(${ordersTable.createdAt})`, startDate),
        ne(ordersTable.status, "cancelled"),
      ),
    );

  const [expenses] = await db
    .select({
      totalExpenses: sql<number>`coalesce(sum(${ledgerEntriesTable.amountPkr}), 0)::int`,
      deliveryCosts: sql<number>`coalesce(sum(case when ${ledgerEntriesTable.type} = 'delivery_cost' then ${ledgerEntriesTable.amountPkr} else 0 end), 0)::int`,
    })
    .from(ledgerEntriesTable)
    .where(
      and(
        eq(ledgerEntriesTable.bakerId, bakerId),
        gte(ledgerEntriesTable.entryDate, startDate),
      ),
    );

  const [inventory] = await db
    .select({
      inventoryValue: sql<number>`coalesce(sum(${inventoryItemsTable.qtyInStock} * ${inventoryItemsTable.unitCostPkr}), 0)::int`,
      lowStockCount: sql<number>`coalesce(sum(case when ${inventoryItemsTable.qtyInStock} <= ${inventoryItemsTable.reorderLevel} then 1 else 0 end), 0)::int`,
      totalItems: sql<number>`coalesce(count(*), 0)::int`,
    })
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.bakerId, bakerId));

  const profit = sales.revenue - expenses.totalExpenses;
  res.json({
    period,
    startDate,
    revenue: sales.revenue,
    orders: sales.orders,
    totalExpenses: expenses.totalExpenses,
    deliveryCosts: expenses.deliveryCosts,
    estimatedProfit: profit,
    profitMargin: sales.revenue > 0 ? Math.round((profit / sales.revenue) * 1000) / 10 : null,
    inventoryValue: inventory.inventoryValue,
    lowStockCount: inventory.lowStockCount,
    totalInventoryItems: inventory.totalItems,
  });
});

export default router;
