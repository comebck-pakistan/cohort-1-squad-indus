import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  qtyInStock: number;
  reorderLevel: number;
  unitCostPkr: number;
};

type LedgerEntry = {
  id: number;
  type: "expense" | "delivery_cost" | "sale_adjustment";
  category: string;
  description: string | null;
  amountPkr: number;
  entryDate: string;
};

type KhataAnalytics = {
  period: "weekly" | "monthly";
  startDate: string;
  revenue: number;
  orders: number;
  totalExpenses: number;
  deliveryCosts: number;
  estimatedProfit: number;
  profitMargin: number | null;
  inventoryValue: number;
  lowStockCount: number;
  totalInventoryItems: number;
};

export default function DashboardKhata() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    unit: "kg",
    qtyInStock: "0",
    reorderLevel: "0",
    unitCostPkr: "0",
  });
  const [ledgerForm, setLedgerForm] = useState({
    type: "expense" as "expense" | "delivery_cost" | "sale_adjustment",
    category: "ingredients",
    amountPkr: "",
    entryDate: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory-items", bakerId],
    enabled: !!bakerId,
    queryFn: () => customFetch<InventoryItem[]>(`/api/inventory/baker/${bakerId}`),
  });

  const ledgerQuery = useQuery({
    queryKey: ["ledger-entries", bakerId],
    enabled: !!bakerId,
    queryFn: () => customFetch<LedgerEntry[]>(`/api/ledger/baker/${bakerId}/entries`),
  });

  const khataQuery = useQuery({
    queryKey: ["khata-analytics", bakerId, period],
    enabled: !!bakerId,
    queryFn: () => customFetch<KhataAnalytics>(`/api/analytics/baker/${bakerId}/khata?period=${period}`),
  });

  const addInventory = useMutation({
    mutationFn: () =>
      customFetch(`/api/inventory/baker/${bakerId}/items`, {
        method: "POST",
        body: JSON.stringify({
          name: inventoryForm.name.trim(),
          unit: inventoryForm.unit.trim() || "pcs",
          qtyInStock: Number(inventoryForm.qtyInStock) || 0,
          reorderLevel: Number(inventoryForm.reorderLevel) || 0,
          unitCostPkr: Number(inventoryForm.unitCostPkr) || 0,
        }),
      }),
    onSuccess: async () => {
      setInventoryForm({ name: "", unit: "kg", qtyInStock: "0", reorderLevel: "0", unitCostPkr: "0" });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items", bakerId] });
      await queryClient.invalidateQueries({ queryKey: ["khata-analytics", bakerId] });
    },
  });

  const addLedger = useMutation({
    mutationFn: () =>
      customFetch(`/api/ledger/baker/${bakerId}/entries`, {
        method: "POST",
        body: JSON.stringify({
          type: ledgerForm.type,
          category: ledgerForm.category.trim() || "general",
          amountPkr: Number(ledgerForm.amountPkr) || 0,
          entryDate: ledgerForm.entryDate,
          description: ledgerForm.description.trim() || undefined,
        }),
      }),
    onSuccess: async () => {
      setLedgerForm((prev) => ({ ...prev, amountPkr: "", description: "" }));
      await queryClient.invalidateQueries({ queryKey: ["ledger-entries", bakerId] });
      await queryClient.invalidateQueries({ queryKey: ["khata-analytics", bakerId] });
    },
  });

  const lowStockItems = useMemo(
    () =>
      (inventoryQuery.data ?? []).filter((item) => item.qtyInStock <= item.reorderLevel),
    [inventoryQuery.data],
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-primary">Khata & Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track stock, expenses, delivery costs, and estimated profit for your home bakery.
            </p>
          </div>
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            <button onClick={() => setPeriod("weekly")} className={`px-3 py-1.5 rounded-lg text-sm ${period === "weekly" ? "bg-background text-primary font-semibold" : "text-muted-foreground"}`}>Weekly</button>
            <button onClick={() => setPeriod("monthly")} className={`px-3 py-1.5 rounded-lg text-sm ${period === "monthly" ? "bg-background text-primary font-semibold" : "text-muted-foreground"}`}>Monthly</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Revenue" value={`PKR ${khataQuery.data?.revenue.toLocaleString() ?? 0}`} />
          <StatCard label="Orders" value={String(khataQuery.data?.orders ?? 0)} />
          <StatCard label="Total Costs" value={`PKR ${khataQuery.data?.totalExpenses.toLocaleString() ?? 0}`} />
          <StatCard label="Est. Profit" value={`PKR ${khataQuery.data?.estimatedProfit.toLocaleString() ?? 0}`} accent />
          <StatCard label="Profit Margin" value={khataQuery.data?.profitMargin != null ? `${khataQuery.data.profitMargin}%` : "—"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-xl font-bold">Inventory (what is left)</h2>
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!inventoryForm.name.trim()) return;
                addInventory.mutate();
              }}
            >
              <input className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Item name (e.g. Flour)" value={inventoryForm.name} onChange={(e) => setInventoryForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Unit (kg, pcs)" value={inventoryForm.unit} onChange={(e) => setInventoryForm((p) => ({ ...p, unit: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="In stock" value={inventoryForm.qtyInStock} onChange={(e) => setInventoryForm((p) => ({ ...p, qtyInStock: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Reorder level" value={inventoryForm.reorderLevel} onChange={(e) => setInventoryForm((p) => ({ ...p, reorderLevel: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Unit cost PKR" value={inventoryForm.unitCostPkr} onChange={(e) => setInventoryForm((p) => ({ ...p, unitCostPkr: e.target.value }))} />
              <button type="submit" className="rounded-md bg-primary text-primary-foreground font-semibold px-3 py-2 text-sm disabled:opacity-50" disabled={addInventory.isPending}>Add stock item</button>
            </form>

            <div className="space-y-2 max-h-72 overflow-auto">
              {(inventoryQuery.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.qtyInStock} {item.unit} left · reorder at {item.reorderLevel} · PKR {item.unitCostPkr}/{item.unit}
                    </p>
                  </div>
                  {item.qtyInStock <= item.reorderLevel && (
                    <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">Low</span>
                  )}
                </div>
              ))}
              {!inventoryQuery.data?.length && <p className="text-sm text-muted-foreground">No inventory items yet.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-xl font-bold">Khata ledger (expense register)</h2>
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ledgerForm.amountPkr) return;
                addLedger.mutate();
              }}
            >
              <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={ledgerForm.type} onChange={(e) => setLedgerForm((p) => ({ ...p, type: e.target.value as LedgerEntry["type"] }))}>
                <option value="expense">Expense</option>
                <option value="delivery_cost">Delivery cost</option>
                <option value="sale_adjustment">Sale adjustment</option>
              </select>
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Category" value={ledgerForm.category} onChange={(e) => setLedgerForm((p) => ({ ...p, category: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Amount PKR" value={ledgerForm.amountPkr} onChange={(e) => setLedgerForm((p) => ({ ...p, amountPkr: e.target.value }))} />
              <input type="date" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={ledgerForm.entryDate} onChange={(e) => setLedgerForm((p) => ({ ...p, entryDate: e.target.value }))} />
              <input className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Description (optional)" value={ledgerForm.description} onChange={(e) => setLedgerForm((p) => ({ ...p, description: e.target.value }))} />
              <button type="submit" className="col-span-2 rounded-md bg-primary text-primary-foreground font-semibold px-3 py-2 text-sm disabled:opacity-50" disabled={addLedger.isPending}>Add khata entry</button>
            </form>

            <div className="space-y-2 max-h-72 overflow-auto">
              {(ledgerQuery.data ?? []).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{entry.category} · {entry.type.replace("_", " ")}</p>
                    <p className="font-mono">PKR {entry.amountPkr.toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.entryDate}{entry.description ? ` · ${entry.description}` : ""}</p>
                </div>
              ))}
              {!ledgerQuery.data?.length && <p className="text-sm text-muted-foreground">No khata entries yet.</p>}
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-xl font-bold">Actionable summary</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-muted-foreground">Current stock value</p>
              <p className="text-xl font-bold mt-1">PKR {khataQuery.data?.inventoryValue.toLocaleString() ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-muted-foreground">Low stock items</p>
              <p className="text-xl font-bold mt-1">{khataQuery.data?.lowStockCount ?? 0}</p>
              {lowStockItems.length > 0 && <p className="text-xs mt-1 text-amber-700">{lowStockItems.slice(0, 3).map((i) => i.name).join(", ")}</p>}
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-muted-foreground">Delivery costs ({period})</p>
              <p className="text-xl font-bold mt-1">PKR {khataQuery.data?.deliveryCosts.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-xl font-bold font-mono ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
