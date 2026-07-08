import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  ToggleProductStockParams,
  CreateProductBody,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    sizes: (p.sizes as unknown[]) ?? [],
    variants: p.variants ?? [],
    occasionTags: p.occasionTags ?? [],
    dietaryTags: p.dietaryTags ?? [],
  };
}

// GET /products
router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let dbQuery = db.select().from(productsTable).$dynamic();
  if (query.data.bakerId) dbQuery = dbQuery.where(eq(productsTable.bakerId, query.data.bakerId));
  if (query.data.category) dbQuery = dbQuery.where(eq(productsTable.category, query.data.category));
  const products = await dbQuery.orderBy(productsTable.displayOrder);
  res.json(products.map(formatProduct));
});

// POST /products
router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values(parsed.data as any).returning();
  res.status(201).json(formatProduct(product));
});

// GET /products/:productId
router.get("/products/:productId", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product));
});

// PATCH /products/:productId
router.patch("/products/:productId", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.update(productsTable).set(parsed.data as any).where(eq(productsTable.id, params.data.productId)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(product));
});

// DELETE /products/:productId
router.delete("/products/:productId", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.productId));
  res.sendStatus(204);
});

// PATCH /products/:productId/toggle-stock
router.patch("/products/:productId/toggle-stock", async (req, res): Promise<void> => {
  const params = ToggleProductStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.productId));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [product] = await db.update(productsTable)
    .set({ isAvailable: !existing.isAvailable })
    .where(eq(productsTable.id, params.data.productId))
    .returning();
  res.json(formatProduct(product));
});

export default router;
