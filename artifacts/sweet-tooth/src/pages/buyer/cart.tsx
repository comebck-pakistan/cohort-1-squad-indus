import { BuyerLayout } from "@/components/layout/buyer-layout";
import { Link } from "wouter";

export default function Cart() {
  return (
    <BuyerLayout>
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl font-bold text-primary">Order in the bakery chat</h1>
        <p className="mt-4 text-muted-foreground">Website checkout is not enabled. Return to the bakery menu and use its WhatsApp, Instagram, or web assistant to confirm an order directly with the baker.</p>
        <Link href="/" className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Return home</Link>
      </div>
    </BuyerLayout>
  );
}
