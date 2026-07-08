import { useState } from "react";
import { useLocation } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import {
  useGetCart,
  useRemoveFromCart,
  useCreateOrder,
  useClearCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";

export default function Cart() {
  const { buyerId } = useBuyerSession();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerArea, setBuyerArea] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: cartItems, isLoading } = useGetCart(
    { buyerId },
    { query: { enabled: !!buyerId, queryKey: getGetCartQueryKey({ buyerId }) } },
  );
  const removeFromCart = useRemoveFromCart();
  const createOrder = useCreateOrder();
  const clearCart = useClearCart();

  const handleRemove = (cartItemId: number) => {
    removeFromCart.mutate({ cartItemId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ buyerId }) });
      },
    });
  };

  const total = cartItems?.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0) || 0;
  const bakerIds = [...new Set(cartItems?.map((item) => item.bakerId) ?? [])];

  const handleCheckout = () => {
    setCheckoutError(null);
    if (!cartItems?.length) return;
    if (bakerIds.length > 1) {
      setCheckoutError("Please checkout one baker at a time. Remove items from other bakers first.");
      return;
    }
    if (!buyerName.trim() || !buyerWhatsapp.trim() || !buyerAddress.trim()) {
      setCheckoutError("Name, WhatsApp number, and address are required.");
      return;
    }

    const bakerId = bakerIds[0]!;
    createOrder.mutate({
      data: {
        bakerId,
        buyerId,
        buyerName: buyerName.trim(),
        buyerWhatsapp: buyerWhatsapp.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerArea: buyerArea.trim() || undefined,
        totalPkr: total,
        source: "marketplace",
        specialInstructions: specialInstructions.trim() || undefined,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sizeLabel: item.sizeLabel,
          quantity: item.quantity,
          unitPricePkr: item.unitPricePkr,
        })),
      },
    }, {
      onSuccess: () => {
        clearCart.mutate({ params: { buyerId } }, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ buyerId }) });
            setCheckoutOpen(false);
            setLocation("/orders");
          },
        });
      },
      onError: (err) => setCheckoutError(err.message ?? "Checkout failed"),
    });
  };

  return (
    <BuyerLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Your Cart</h1>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-xl w-full" />
            <div className="h-24 bg-muted rounded-xl w-full" />
          </div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
            <p className="text-xl font-serif text-muted-foreground mb-4">Your cart is empty.</p>
            <p className="text-muted-foreground mb-6">Let's find some delicious home-baked treats.</p>
            <a href="/bakers" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
              Explore Bakers
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 border border-border bg-card rounded-xl shadow-sm">
                  <div className="w-24 h-24 bg-muted rounded-md shrink-0 overflow-hidden">
                    {item.photoUrl && <img src={item.photoUrl} alt={item.productName} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg">{item.productName}</h3>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          disabled={removeFromCart.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">Size: {item.sizeLabel}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-mono font-bold text-primary">PKR {(item.unitPricePkr * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-fit sticky top-24">
              <h3 className="font-serif text-xl font-bold mb-4">Order Summary</h3>
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-medium">PKR {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-sm text-muted-foreground italic">COD — pay on delivery</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="font-mono text-primary">PKR {total.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Checkout (COD)</h2>
              <button onClick={() => setCheckoutOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
            <input
              value={buyerWhatsapp}
              onChange={(e) => setBuyerWhatsapp(e.target.value)}
              placeholder="WhatsApp (+92...)"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
            <input
              value={buyerArea}
              onChange={(e) => setBuyerArea(e.target.value)}
              placeholder="Area (e.g. F-7, Gulberg)"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
            <textarea
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              placeholder="Full delivery address"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
            />
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Special instructions (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
            />
            {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
            <button
              onClick={handleCheckout}
              disabled={createOrder.isPending || clearCart.isPending}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {createOrder.isPending ? "Placing order..." : `Place order — PKR ${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      )}
    </BuyerLayout>
  );
}
