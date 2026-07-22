import { date, index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sweetTooth } from "./pg";

export const inventoryItemsTable = sweetTooth.table("inventory_items", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("pcs"),
  qtyInStock: integer("qty_in_stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  unitCostPkr: integer("unit_cost_pkr").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  bakerIdx: index("inventory_items_baker_idx").on(table.bakerId),
}));

export const ledgerEntriesTable = sweetTooth.table("ledger_entries", {
  id: serial("id").primaryKey(),
  bakerId: integer("baker_id").notNull(),
  type: text("type").notNull().default("expense"),
  category: text("category").notNull().default("general"),
  description: text("description"),
  amountPkr: integer("amount_pkr").notNull(),
  entryDate: date("entry_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bakerIdx: index("ledger_entries_baker_idx").on(table.bakerId),
  dateIdx: index("ledger_entries_date_idx").on(table.entryDate),
}));
