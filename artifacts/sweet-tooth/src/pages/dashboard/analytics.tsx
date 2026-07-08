import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetBakerAnalytics,
  useGetOrderSources,
  getGetBakerAnalyticsQueryKey,
  getGetOrderSourcesQueryKey,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";

type Period = "daily" | "weekly" | "monthly";

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "7 days" },
  { id: "weekly", label: "4 weeks" },
  { id: "monthly", label: "90 days" },
];

const SOURCE_COLORS = ["#4A0E8F", "#F5C518", "#E879A9", "#6B7280"];

export default function DashboardAnalytics() {
  const { bakerId } = useBuyerSession();
  const [period, setPeriod] = useState<Period>("monthly");

  const { data: analytics, isLoading } = useGetBakerAnalytics(bakerId, period, {
    query: { enabled: !!bakerId, queryKey: getGetBakerAnalyticsQueryKey(bakerId, period) },
  });

  const { data: sources } = useGetOrderSources(bakerId, {
    query: { enabled: !!bakerId, queryKey: getGetOrderSourcesQueryKey(bakerId) },
  });

  const chartData = analytics?.dataPoints?.map((point) => ({
    label: format(parseISO(point.date), period === "daily" ? "EEE" : "MMM d"),
    orders: point.orders,
    revenue: point.revenue,
  })) ?? [];

  const sourceData = sources?.map((s) => ({
    name: s.source.replace(/_/g, " "),
    value: s.orders,
    percentage: s.percentage,
  })) ?? [];

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold font-serif text-primary">Sales Analytics</h1>
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.id ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl w-full" />
            <div className="h-64 bg-muted rounded-xl w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold font-mono text-primary mt-2">PKR {analytics?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold font-mono mt-2">{analytics?.totalOrders || 0}</p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold font-mono text-secondary mt-2">PKR {analytics?.avgOrderValue?.toLocaleString() || 0}</p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">New Customers</p>
                <p className="text-2xl font-bold font-mono mt-2">{analytics?.newCustomers || 0}</p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Repeat Customers</p>
                <p className="text-2xl font-bold font-mono mt-2">{analytics?.repeatCustomers || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-4">Revenue over time</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-4">Orders over time</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-4">Order sources</h3>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percentage }) => `${name} (${percentage}%)`}>
                        {sourceData.map((_, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground">No source data yet.</p>
                )}
              </div>

              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-4">Top Products</h3>
                <div className="space-y-4">
                  {analytics?.topProducts?.map((product, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.orders} orders</p>
                      </div>
                      <p className="font-mono font-medium text-primary">PKR {product.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                  {(!analytics?.topProducts || analytics.topProducts.length === 0) && (
                    <p className="text-muted-foreground">No data available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
