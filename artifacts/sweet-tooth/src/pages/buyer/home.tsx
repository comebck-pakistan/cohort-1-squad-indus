import { Link } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { ArrowRight, Bot, Instagram, MessageSquare, Phone, Share2, Sparkles } from "lucide-react";

const features = [
  { icon: Bot, title: "Your always-on order agent", text: "It answers menu, availability, delivery, dietary and custom-order questions using the rules you set - even when you are busy baking." },
  { icon: MessageSquare, title: "One calm order workspace", text: "Bring customer conversations and order context out of scattered WhatsApp and Instagram chats into one dashboard." },
  { icon: Share2, title: "Your menu supports the agent", text: "Share one branded link or QR code. Your live menu gives the agent accurate products, prices and availability to answer from." },
];

export default function Home() {
  return (
    <BuyerLayout>
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground md:py-28">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),radial-gradient(circle_at_80%_60%,hsl(var(--secondary))_0,transparent_25%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"><Sparkles className="h-4 w-4" /> Built for Pakistan&apos;s home bakers</p>
            <h1 className="font-serif text-5xl font-bold leading-tight md:text-6xl">Your bakery agent keeps orders moving while you bake.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">Your always-on assistant answers customer questions across your menu, WhatsApp and Instagram. The dashboard turns messy chats into clear orders, customer history and next steps.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/register" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 font-bold text-primary transition-transform hover:scale-[1.02]">Create your bakery <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/dashboard/login" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-bold hover:bg-white/10">Baker sign in</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white p-6 text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4"><div><p className="font-serif text-2xl font-bold text-primary">Agent inbox</p><p className="text-sm text-muted-foreground">Sana&apos;s Sweet Studio</p></div><Bot className="h-12 w-12 text-primary" /></div>
            <div className="space-y-3 py-5 text-sm">
              <div className="ml-8 rounded-2xl rounded-br-sm bg-muted p-3"><span className="font-semibold">Customer</span><p className="mt-1">Is the chocolate cake available eggless for Friday?</p></div>
              <div className="mr-8 rounded-2xl rounded-bl-sm bg-primary p-3 text-primary-foreground"><span className="font-semibold">Your agent</span><p className="mt-1">Yes. It is available eggless with 2 days&apos; notice. I can help you place the order.</p></div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-white p-3"><span className="flex items-center gap-2"><Phone className="h-4 w-4 text-green-600" /> WhatsApp reply</span><span className="flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-600" /> Instagram ready</span></div>
            </div>
            <div className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground">Every chat becomes useful order context in your dashboard</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-primary">Agent-first bakery operations</p><h2 className="mt-3 font-serif text-4xl font-bold">One assistant. One dashboard. No lost customer chats.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
      </section>

      <section className="bg-muted px-4 py-20"><div className="mx-auto max-w-4xl text-center"><h2 className="font-serif text-4xl font-bold">Set your rules. Let the agent handle the first reply.</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Add your menu, delivery areas, availability and policies once. Your agent uses those facts to answer customers, while the dashboard keeps you in control.</p><Link href="/dashboard/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">Create your bakery agent <ArrowRight className="h-4 w-4" /></Link></div></section>
    </BuyerLayout>
  );
}
