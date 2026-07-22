import { Link } from "wouter";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import { Users, Heart, AlertTriangle, ArrowRight } from "lucide-react";

export default function DashboardCustomers() {
  const { bakerId } = useBuyerSession();
  const { data: customers, isLoading } = useListCustomers(
    { bakerId },
    {
      query: {
        enabled: !!bakerId,
        queryKey: getListCustomersQueryKey({ bakerId }),
        ...liveDashboardQuery(ORDERS_POLL_MS),
      },
    },
  );

  const all = customers ?? [];
  const regulars = all.filter((c) => c.isRegular);
  const atRisk = all.filter((c) => c.isAtRisk);
  const totalSpent = all.reduce((sum, c) => sum + c.totalSpentPkr, 0);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2 font-serif text-primary">Customer CRM</h1>
        <p className="mb-8 text-muted-foreground max-w-2xl">
          Built from real orders — repeat buyers, spend history, and who might need a win-back message before Eid or a birthday.
        </p>

        {isLoading && !customers ? (
          <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <CrmStat icon={Users} label="Total customers" value={String(all.length)} />
              <CrmStat icon={Heart} label="Regulars" value={String(regulars.length)} highlight />
              <CrmStat icon={AlertTriangle} label="At risk" value={String(atRisk.length)} warn={atRisk.length > 0} />
              <CrmStat icon={Users} label="Lifetime value" value={`PKR ${totalSpent.toLocaleString()}`} />
            </div>

            {atRisk.length > 0 && (
              <section className="mb-8 p-6 rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-700" />
                    <h3 className="font-serif text-xl font-bold text-amber-900">Win them back</h3>
                  </div>
                  <Link
                    href="/dashboard/analytics"
                    className="text-sm font-medium text-amber-800 hover:underline inline-flex items-center gap-1"
                  >
                    Send broadcast <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <p className="text-sm text-amber-800/90 mb-4">
                  These regulars haven't ordered in 30+ days. A quick WhatsApp or flash drop can bring them back.
                </p>
                <div className="space-y-3">
                  {atRisk.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} badge="At risk" badgeClass="bg-amber-100 text-amber-800" />
                  ))}
                </div>
              </section>
            )}

            <section className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-2">Your regulars</h3>
              <p className="text-sm text-muted-foreground mb-6">Customers with 2+ orders — your most reliable revenue.</p>
              <div className="space-y-4">
                {regulars.map((customer) => (
                  <CustomerRow key={customer.id} customer={customer} />
                ))}
                {regulars.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No regulars yet. After a buyer's second order they'll show up here automatically.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function CrmStat({
  icon: Icon,
  label,
  value,
  highlight,
  warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border shadow-sm ${
        warn ? "border-amber-200 bg-amber-50/40" : highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <Icon className={`h-4 w-4 mb-2 ${warn ? "text-amber-700" : "text-muted-foreground"}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${warn ? "text-amber-800" : highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function CustomerRow({
  customer,
  badge,
  badgeClass,
}: {
  customer: {
    id: number;
    name: string;
    whatsappNumber: string;
    preferredArea?: string | null;
    totalSpentPkr: number;
    totalOrders: number;
    lastOrderAt?: string | null;
  };
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold">{customer.name}</p>
          {badge && (
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {customer.whatsappNumber}
          {customer.preferredArea ? ` · ${customer.preferredArea}` : ""}
        </p>
        {customer.lastOrderAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Last order {format(new Date(customer.lastOrderAt), "MMM d, yyyy")}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-primary">PKR {customer.totalSpentPkr.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{customer.totalOrders} orders</p>
      </div>
    </div>
  );
}
