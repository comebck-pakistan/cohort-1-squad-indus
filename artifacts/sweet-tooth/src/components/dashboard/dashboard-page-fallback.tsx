import { DashboardLayout } from "@/components/layout/dashboard-layout";

export function DashboardPageFallback() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-64 bg-muted rounded-lg" />
        <div className="h-28 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    </DashboardLayout>
  );
}
