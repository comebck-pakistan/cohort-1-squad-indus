import { db } from "@workspace/db";
import { customersTable, ordersTable, reviewsTable, bakersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

export type DemoProduct = { id: number; name: string; basePricePkr: number };

type DemoBaker = {
  id: number;
  businessName: string;
  ownerName: string;
  city: string;
  areas: string[];
  products: DemoProduct[];
  phoneBase: string;
};

const SOURCES = ["marketplace", "baker_whatsapp", "instagram_dm", "manual"] as const;

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function deliveryDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export async function seedBakerDemoData(baker: DemoBaker): Promise<void> {
  const customerRows = [
    {
      bakerId: baker.id,
      name: "Ayesha Raza",
      whatsappNumber: `${baker.phoneBase}1111`,
      city: baker.city,
      preferredArea: baker.areas[0],
      totalOrders: 6,
      totalSpentPkr: 28600,
      lastOrderAt: daysAgo(4),
      isRegular: true,
      isAtRisk: false,
    },
    {
      bakerId: baker.id,
      name: "Bilal Ahmad",
      whatsappNumber: `${baker.phoneBase}2222`,
      city: baker.city,
      preferredArea: baker.areas[1] ?? baker.areas[0],
      totalOrders: 2,
      totalSpentPkr: 9400,
      lastOrderAt: daysAgo(45),
      isRegular: false,
      isAtRisk: true,
    },
    {
      bakerId: baker.id,
      name: "Hira Tariq",
      whatsappNumber: `${baker.phoneBase}3333`,
      city: baker.city,
      preferredArea: baker.areas[2] ?? baker.areas[0],
      totalOrders: 4,
      totalSpentPkr: 18200,
      lastOrderAt: daysAgo(8),
      isRegular: true,
      isAtRisk: false,
    },
    {
      bakerId: baker.id,
      name: "Omar Siddiqui",
      whatsappNumber: `${baker.phoneBase}4444`,
      city: baker.city,
      preferredArea: baker.areas[3] ?? baker.areas[0],
      totalOrders: 1,
      totalSpentPkr: 3200,
      lastOrderAt: daysAgo(70),
      isRegular: false,
      isAtRisk: true,
    },
    {
      bakerId: baker.id,
      name: "Zara Khan",
      whatsappNumber: `${baker.phoneBase}5555`,
      city: baker.city,
      preferredArea: baker.areas[0],
      totalOrders: 8,
      totalSpentPkr: 42300,
      lastOrderAt: daysAgo(2),
      isRegular: true,
      isAtRisk: false,
    },
  ];

  const customers = await db.insert(customersTable).values(customerRows).returning();
  const [ayesha, bilal, hira, omar, zara] = customers;
  const p0 = baker.products[0];
  const p1 = baker.products[1] ?? p0;

  const item = (product: DemoProduct, qty = 1) => ({
    productId: product.id,
    productName: product.name,
    sizeLabel: "Standard",
    quantity: qty,
    unitPricePkr: product.basePricePkr,
  });

  const orderSpecs: Array<{
    buyer: (typeof customers)[0];
    area: string;
    items: ReturnType<typeof item>[];
    totalPkr: number;
    daysBack: number;
    status: string;
    paymentStatus: string;
    source: (typeof SOURCES)[number];
    occasion: string | null;
    cancel?: { reason: string; by: string };
  }> = [
    { buyer: zara, area: baker.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 0, status: "new", paymentStatus: "pending", source: "marketplace", occasion: "Birthday" },
    { buyer: hira, area: baker.areas[1] ?? baker.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 1, status: "confirmed", paymentStatus: "pending", source: "baker_whatsapp", occasion: null },
    { buyer: ayesha, area: baker.areas[0], items: [item(p0), item(p1, 2)], totalPkr: p0.basePricePkr + p1.basePricePkr * 2, daysBack: 3, status: "in_production", paymentStatus: "pending", source: "instagram_dm", occasion: "Dawat" },
    { buyer: bilal, area: baker.areas[1] ?? baker.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 6, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Anniversary" },
    { buyer: zara, area: baker.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 10, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Eid" },
    { buyer: ayesha, area: baker.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 18, status: "delivered", paymentStatus: "paid", source: "baker_whatsapp", occasion: null },
    { buyer: hira, area: baker.areas[2] ?? baker.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 25, status: "delivered", paymentStatus: "paid", source: "instagram_dm", occasion: "Birthday" },
    { buyer: omar, area: baker.areas[3] ?? baker.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 35, status: "delivered", paymentStatus: "paid", source: "manual", occasion: null },
    { buyer: zara, area: baker.areas[0], items: [item(p0), item(p1)], totalPkr: p0.basePricePkr + p1.basePricePkr, daysBack: 48, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Party" },
    { buyer: bilal, area: baker.areas[1] ?? baker.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 62, status: "delivered", paymentStatus: "paid", source: "baker_whatsapp", occasion: null },
    { buyer: ayesha, area: baker.areas[0], items: [item(p0)], totalPkr: p0.basePricePkr, daysBack: 75, status: "delivered", paymentStatus: "paid", source: "marketplace", occasion: "Eid" },
    { buyer: hira, area: baker.areas[2] ?? baker.areas[0], items: [item(p1)], totalPkr: p1.basePricePkr, daysBack: 12, status: "cancelled", paymentStatus: "pending", source: "marketplace", occasion: null, cancel: { reason: "Customer changed delivery date", by: "customer" } },
  ];

  await db.insert(ordersTable).values(
    orderSpecs.map((spec) => ({
      bakerId: baker.id,
      buyerId: spec.buyer.id,
      buyerName: spec.buyer.name,
      buyerWhatsapp: spec.buyer.whatsappNumber,
      buyerAddress: `House demo, ${spec.area}, ${baker.city}`,
      buyerArea: spec.area,
      items: spec.items,
      totalPkr: spec.totalPkr,
      deliveryDate: deliveryDate(spec.daysBack > 5 ? -3 : 1),
      status: spec.status,
      paymentStatus: spec.paymentStatus,
      source: spec.source,
      occasion: spec.occasion,
      specialInstructions: null,
      cancellationReason: spec.cancel?.reason ?? null,
      cancelledBy: spec.cancel?.by ?? null,
      cancelledAt: spec.cancel ? daysAgo(spec.daysBack) : null,
      createdAt: daysAgo(spec.daysBack),
    })),
  );

  await db.insert(reviewsTable).values([
    {
      bakerId: baker.id,
      buyerId: ayesha.id,
      buyerName: ayesha.name,
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 5,
      reviewText: `Loved the ${p0.name}! ${baker.ownerName} delivered on time and the packaging was beautiful.`,
      productName: p0.name,
    },
    {
      bakerId: baker.id,
      buyerId: zara.id,
      buyerName: zara.name,
      rating: 5,
      ratingProduct: 5,
      ratingPackaging: 4,
      reviewText: `${baker.businessName} is my go-to for celebrations. Highly recommend.`,
      productName: p1.name,
    },
    {
      bakerId: baker.id,
      buyerId: hira.id,
      buyerName: hira.name,
      rating: 4,
      ratingProduct: 5,
      ratingPackaging: 4,
      reviewText: "Fresh, delicious, and worth every rupee.",
      productName: p0.name,
    },
  ]);
}

export async function syncBakerStats(bakerId: number): Promise<void> {
  const [{ count: orderCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.bakerId, bakerId));

  const [{ avgRating }] = await db
    .select({ avgRating: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)` })
    .from(reviewsTable)
    .where(eq(reviewsTable.bakerId, bakerId));

  await db
    .update(bakersTable)
    .set({
      totalOrders: orderCount,
      ratingAvg: Math.round(Number(avgRating) * 10) / 10 || 4.8,
    })
    .where(eq(bakersTable.id, bakerId));
}
