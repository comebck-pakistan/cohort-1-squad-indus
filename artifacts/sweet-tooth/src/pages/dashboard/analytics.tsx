import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetBakerAnalytics, getGetBakerAnalyticsQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";

export default function DashboardAnalytics() {
  const { bakerId } = useBuyerSession();
  const { data: analytics, isLoading } = useGetBakerAnalytics(bakerId, "monthly", { query: { enabled: !!bakerId, queryKey: getGetBakerAnalyticsQueryKey(bakerId, "monthly") } });

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Sales Analytics</h1>
        
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl w-full"></div>
            <div className="h-64 bg-muted rounded-xl w-full"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
