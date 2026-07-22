import { BuyerLayout } from "@/components/layout/buyer-layout";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { customFetch } from "@workspace/api-client-react";

type GuestCartItem = {
  bakerId: number;
  bakerName?: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPricePkr: number;
  sizeLabel: string;
};

const CART_KEY = "sweet_tooth_guest_cart";

function readCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: GuestCartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addGuestCartItem(item: GuestCartItem) {
  const cart = readCart().filter((row) => row.bakerId === item.bakerId);
  const existing = cart.find(
    (row) => row.productId === item.productId && row.sizeLabel === item.sizeLabel,
  );
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  writeCart(cart);
}

export default function Cart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerArea, setBuyerArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0),
    [items],
  );
  const bakerId = items[0]?.bakerId;

  const updateQuantity = (productId: number, sizeLabel: string, quantity: number) => {
    const next = readCart()
      .map((item) =>
        item.productId === productId && item.sizeLabel === sizeLabel
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      );
    writeCart(next);
    setItems(next);
  };

  const removeItem = (productId: number, sizeLabel: string) => {
    const next = readCart().filter(
      (item) => !(item.productId === productId && item.sizeLabel === sizeLabel),
    );
    writeCart(next);
    setItems(next);
  };

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bakerId || items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const order = await customFetch<{ id: number }>("/api/orders", {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({
          bakerId,
          buyerName,
          buyerWhatsapp,
          buyerAddress,
          buyerArea: buyerArea || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            sizeLabel: item.sizeLabel,
          })),
          source: "web_guest",
        }),
      });
      writeCart([]);
      setItems([]);
      setOrderId(order.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BuyerLayout>
      <div className="container mx-auto max-w-xl px-4 py-12">
        <h1 className="font-serif text-4xl font-bold text-primary">Your bag</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Guest checkout creates a pending bakery order. Prices are verified on the server.
        </p>

        {orderId ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <p className="font-serif text-2xl font-bold">Order #{orderId} placed</p>
            <p className="mt-2 text-sm">
              The bakery will confirm on WhatsApp. You can look up status anytime on the orders page.
            </p>
            <Link href="/orders" className="mt-4 inline-flex text-sm font-semibold underline">
              Check order status
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-muted-foreground">Your bag is empty.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer messaging? Open a bakery menu and use WhatsApp, Instagram, or the web assistant.
            </p>
            <Link href="/bakers" className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
              Discover bakers
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={`${item.productId}-${item.sizeLabel}`} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.sizeLabel}</p>
                    </div>
                    <p className="font-mono font-bold">
                      PKR {(item.unitPricePkr * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, item.sizeLabel, Number(e.target.value) || 1)}
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.sizeLabel)}
                      className="text-xs font-medium text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-right font-mono text-lg font-bold">Total PKR {total.toLocaleString()}</p>

            <form onSubmit={placeOrder} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <input required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Your name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input required value={buyerWhatsapp} onChange={(e) => setBuyerWhatsapp(e.target.value)} placeholder="WhatsApp +92 300 1234567" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input required value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Delivery address" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input value={buyerArea} onChange={(e) => setBuyerArea(e.target.value)} placeholder="Area (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {loading ? "Placing order…" : "Place guest order"}
              </button>
            </form>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
