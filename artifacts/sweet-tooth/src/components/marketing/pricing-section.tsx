import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Sparkles, TrendingDown } from "lucide-react";
import {
  FOUNDER_OFFER_ACTIVE,
  FOUNDER_OFFER_LABEL,
  FOUNDER_OFFER_NOTE,
  MARKET_COMPARISON,
  PRICING_PLANS,
  displayPrice,
  type PlanId,
} from "@/lib/pricing-plans";

function PlanCard({
  plan,
  registerHref = "/dashboard/register",
}: {
  plan: (typeof PRICING_PLANS)[number];
  registerHref?: string;
}) {
  const price = displayPrice(plan, FOUNDER_OFFER_ACTIVE ? "quarterly" : "monthly");
  const featured = plan.featured;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm md:p-7 ${
        featured
          ? "border-primary bg-primary text-primary-foreground shadow-lg md:scale-[1.02]"
          : "border-border bg-card"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
          Best for growing bakeries
        </span>
      )}
      {plan.id === "free" && (
        <span className="absolute -top-3 left-6 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
          Start here
        </span>
      )}

      <div>
        <h3 className="font-serif text-2xl font-bold">{plan.name}</h3>
        {plan.nameUr && (
          <p className={`text-sm mt-0.5 ${featured ? "text-white/70" : "text-muted-foreground"}`}>
            {plan.nameUr}
          </p>
        )}
        <p className={`mt-2 text-sm leading-relaxed ${featured ? "text-white/85" : "text-muted-foreground"}`}>
          {plan.tagline}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-bold tabular-nums md:text-4xl">
          {price.primary}
          <span className={`ml-1 text-sm font-medium ${featured ? "text-white/80" : "text-muted-foreground"}`}>
            {price.suffix}
          </span>
        </p>
        {price.sub && (
          <p className={`mt-1 text-sm ${featured ? "text-white/75" : "text-muted-foreground"}`}>{price.sub}</p>
        )}
        {price.savings && (
          <p className={`mt-1 text-xs font-semibold ${featured ? "text-secondary" : "text-green-700"}`}>
            {price.savings}
          </p>
        )}
      </div>

      <div
        className={`mt-4 rounded-lg px-3 py-2 text-xs ${
          featured ? "bg-white/10" : "bg-muted/60"
        }`}
      >
        <p className="font-semibold">{plan.limits.products}</p>
        <p className="mt-1 opacity-90">{plan.limits.aiReplies}</p>
        <p className="mt-1 opacity-90">{plan.limits.orders}</p>
        <p className="mt-1 opacity-90">{plan.limits.channels}</p>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckCircle2
              className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-secondary" : "text-primary"}`}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {plan.extraReplyPkr > 0 && (
        <p className={`mt-4 text-xs ${featured ? "text-white/70" : "text-muted-foreground"}`}>
          Extra AI replies: {plan.extraReplyPkr === 2.5 ? "PKR 2.50" : `PKR ${plan.extraReplyPkr}`} each
        </p>
      )}

      <Link
        href={`${registerHref}?plan=${plan.id}`}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition-colors ${
          featured
            ? "bg-secondary text-primary hover:bg-secondary/90"
            : plan.id === "free"
              ? "border border-primary text-primary hover:bg-primary/5"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {plan.id === "free" ? "Start free" : `Choose ${plan.name}`}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="pricing" className="scroll-mt-20 bg-muted px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className={`mx-auto text-center ${compact ? "max-w-3xl" : "max-w-2xl"}`}>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Packages for Pakistan</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Pay less than listing sites. Get an agent + order desk.
          </h2>
          <p className="mt-4 text-muted-foreground">
            {MARKET_COMPARISON.competitor} charges {MARKET_COMPARISON.listingOnly}.{" "}
            {MARKET_COMPARISON.sweetToothEdge}
          </p>
        </div>

        {FOUNDER_OFFER_ACTIVE && (
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-primary">{FOUNDER_OFFER_LABEL}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{FOUNDER_OFFER_NOTE}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
              <TrendingDown className="h-4 w-4" />
              Up to 33% off quarterly
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Why we charge this way</p>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            <li>
              <strong>0% on the free plan</strong> — you keep your full cake price (unlike delivery apps).
            </li>
            <li>
              <strong>Commission only on checkout orders</strong> through Sweet Tooth, capped monthly so low-revenue
              bakers are protected.
            </li>
            <li>
              <strong>AI reply limits</strong> keep our API costs predictable; overage is priced above cost so we stay
              sustainable.
            </li>
            <li>{MARKET_COMPARISON.foodpanda}</li>
          </ul>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No customer payment gateway required. Take Easypaisa, JazzCash or bank transfer — review receipts in your
          dashboard.
        </p>
      </div>
    </section>
  );
}

export function PlanBadge({ planId }: { planId?: PlanId | string | null }) {
  const plan = PRICING_PLANS.find((p) => p.id === planId) ?? PRICING_PLANS[0];
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
      {plan.name}
    </span>
  );
}
