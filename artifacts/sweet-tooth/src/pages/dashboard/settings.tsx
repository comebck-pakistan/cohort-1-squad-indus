import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardSettings() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-2 font-serif text-primary">Your kitchen, your rules.</h1>
        <p className="text-muted-foreground mb-8">Manage your profile, delivery areas, and policies.</p>
        
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Kitchen Details</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Name</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-md bg-background" defaultValue="Sana's Kitchen" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tagline</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-md bg-background" defaultValue="Authentic homemade desserts" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Number</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-md bg-background" defaultValue="+92 300 1234567" />
            </div>
          </div>
          
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Policies</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cash on Delivery (COD) Policy</label>
              <textarea className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[100px]" defaultValue="50% advance for orders over PKR 5,000. Balance on delivery." />
            </div>
          </div>
          
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto">
            Save Changes
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
