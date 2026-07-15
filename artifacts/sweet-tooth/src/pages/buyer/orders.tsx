import { BuyerLayout } from "@/components/layout/buyer-layout";
import { Link } from "wouter";

export default function BuyerOrders() {
  return (
    <BuyerLayout>
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl font-bold text-primary">Order updates stay with the bakery</h1>
        <p className="mt-4 text-muted-foreground">For privacy, customer order records are not shown on this shared website. Please continue in the WhatsApp or Instagram conversation used to place your order.</p>
        <Link href="/" className="mt-8 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Return home</Link>
      </div>
    </BuyerLayout>
  );
}
