import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardCalendar() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Order Calendar</h1>
        <div className="p-12 text-center border border-border rounded-xl bg-card">
          <p className="text-muted-foreground">Calendar view coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
