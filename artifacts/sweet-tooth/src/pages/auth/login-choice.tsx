import { Link } from "wouter";
import { ShoppingBag, Store } from "lucide-react";

export default function LoginChoice() {
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="w-full max-w-2xl text-center space-y-8">
      <div><h1 className="text-4xl font-serif font-bold text-primary">Welcome to Sweet Tooth</h1><p className="mt-2 text-muted-foreground">How would you like to continue?</p></div>
      <div className="grid gap-4 md:grid-cols-2 text-left">
        <Link href="/login/buyer" className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all">
          <ShoppingBag className="w-8 h-8 text-primary mb-4" /><h2 className="font-serif text-2xl font-bold">I’m a customer</h2><p className="mt-2 text-sm text-muted-foreground">Find local bakers, chat about menus, and order sweets.</p><span className="inline-block mt-5 text-sm font-bold text-primary">Shop the marketplace →</span>
        </Link>
        <Link href="/dashboard/login" className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary hover:shadow-md transition-all">
          <Store className="w-8 h-8 text-primary mb-4" /><h2 className="font-serif text-2xl font-bold">I’m a baker</h2><p className="mt-2 text-sm text-muted-foreground">Sign in to your own kitchen, products, orders, and customer data.</p><span className="inline-block mt-5 text-sm font-bold text-primary">Manage my bakery →</span>
        </Link>
      </div>
    </div>
  </div>;
}
