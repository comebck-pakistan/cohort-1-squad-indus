/**
 * Sweet Tooth baker packages — tuned for Pakistan home bakers (2026).
 *
 * Market reference:
 * - HomeBakersPK: Free / PKR 1,500 per 60d Standard / PKR 2,000 per 60d Premium (listings only, 0% commission)
 * - foodpanda Home Chef: ~PKR 800/mo listing + high order commission
 *
 * Our model: low fixed fee + optional small commission (capped) so low-revenue bakers keep margin.
 * AI reply limits keep API spend predictable; overage priced above our marginal OpenAI cost.
 */

export type PlanId = "free" | "starter" | "pro";

export type BillingPeriod = "monthly" | "quarterly";

export interface PricingPlan {
  id: PlanId;
  name: string;
  nameUr?: string;
  tagline: string;
  monthlyPkr: number;
  /** Founder launch price for 3 months (shown when FOUNDER_OFFER_ACTIVE) */
  founderQuarterlyPkr: number;
  featured?: boolean;
  commissionPercent: number;
  commissionCapPkr: number;
  extraReplyPkr: number;
  features: string[];
  limits: {
    products: string;
    aiReplies: string;
    orders: string;
    channels: string;
  };
}

export const FOUNDER_OFFER_ACTIVE = true;
export const FOUNDER_OFFER_LABEL = "Founder launch — first 100 bakeries";
export const FOUNDER_OFFER_NOTE =
  "Pay quarterly upfront. First month 0% commission on checkout orders. No card gateway required — JazzCash / Easypaisa / bank transfer.";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Nanha Start",
    nameUr: "شروع مفت",
    tagline: "For hobby bakers testing online orders — no monthly fee.",
    monthlyPkr: 0,
    founderQuarterlyPkr: 0,
    commissionPercent: 0,
    commissionCapPkr: 0,
    extraReplyPkr: 4,
    limits: {
      products: "Up to 8 menu items",
      aiReplies: "60 AI replies / month",
      orders: "Up to 25 orders / month",
      channels: "Web shop + built-in chat agent",
    },
    features: [
      "Branded menu link & QR code",
      "Basic order inbox",
      "Eggless & delivery area settings",
      "Payment proof review (COD / transfer)",
      "0% commission — you keep full cake price",
    ],
  },
  {
    id: "starter",
    name: "Ghar Starter",
    nameUr: "گھر سٹارٹر",
    tagline: "Best for side-income bakers — cheaper than listing-only sites, with a real agent.",
    monthlyPkr: 799,
    founderQuarterlyPkr: 1499,
    commissionPercent: 2,
    commissionCapPkr: 350,
    extraReplyPkr: 2.5,
    limits: {
      products: "Up to 25 menu items",
      aiReplies: "250 AI replies / month",
      orders: "Up to 80 orders / month",
      channels: "Web agent + customer CRM",
    },
    features: [
      "Everything in Nanha Start",
      "CRM — regulars & at-risk customers",
      "Sales analytics & weekly summary",
      "Custom agent greeting & policies",
      "2% commission on checkout orders only (max PKR 350/mo)",
    ],
  },
  {
    id: "pro",
    name: "Pro Kitchen",
    nameUr: "پرو کچن",
    tagline: "For busy home bakeries with repeat Eid & birthday volume.",
    monthlyPkr: 1499,
    founderQuarterlyPkr: 2999,
    featured: true,
    commissionPercent: 1.5,
    commissionCapPkr: 600,
    extraReplyPkr: 2,
    limits: {
      products: "Unlimited menu items",
      aiReplies: "800 AI replies / month",
      orders: "Up to 300 orders / month",
      channels: "Web + WhatsApp agent + broadcast",
    },
    features: [
      "Everything in Ghar Starter",
      "WhatsApp & Instagram agent setup",
      "Flash drops & customer broadcast",
      "Sales forecast & product trends",
      "Priority onboarding support",
      "1.5% commission on checkout orders only (max PKR 600/mo)",
    ],
  },
];

export const MARKET_COMPARISON = {
  competitor: "HomeBakersPK",
  listingOnly: "PKR 1,500–2,000 / 60 days for listings only (no AI, no order desk)",
  foodpanda: "foodpanda Home Chef: ~PKR 800/mo + high per-order commission",
  sweetToothEdge:
    "Sweet Tooth includes an AI order agent + dashboard from PKR 799/mo — or start free.",
};

export function getPlanById(id?: string | null): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id);
}

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function displayPrice(plan: PricingPlan, period: BillingPeriod = "monthly"): {
  primary: string;
  suffix: string;
  sub?: string;
  savings?: string;
} {
  if (plan.monthlyPkr === 0) {
    return { primary: formatPkr(0), suffix: "forever" };
  }

  if (FOUNDER_OFFER_ACTIVE && period === "quarterly") {
    const perMonth = Math.round(plan.founderQuarterlyPkr / 3);
    const regularQuarter = plan.monthlyPkr * 3;
    const savings = regularQuarter - plan.founderQuarterlyPkr;
    return {
      primary: formatPkr(plan.founderQuarterlyPkr),
      suffix: "/ 3 months",
      sub: `≈ ${formatPkr(perMonth)}/month`,
      savings: savings > 0 ? `Save ${formatPkr(savings)} vs monthly` : undefined,
    };
  }

  return {
    primary: formatPkr(plan.monthlyPkr),
    suffix: "/ month",
    sub:
      period === "quarterly"
        ? `${formatPkr(plan.monthlyPkr * 3)} if billed monthly`
        : undefined,
  };
}

/** Rough unit economics (internal) — monthly API + infra estimate per active baker */
export const UNIT_ECONOMICS_NOTE =
  "At 250 replies/mo, marginal AI cost ≈ PKR 200–400; PKR 799 starter covers APIs + modest margin at 30+ paying bakers.";
