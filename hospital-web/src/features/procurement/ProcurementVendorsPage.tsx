import { Building2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { VendorPerformanceTable, VendorUpsertCard } from "./components/ProcurementForms";
import { ProcurementFlowGuide } from "./components/ProcurementFlowGuide";

export default function ProcurementVendorsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-primary">Supporting step</p>
          <h1 className="text-3xl font-semibold tracking-tight">Vendor management</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Administrators maintain supplier master data, capture contact channels, and review performance metrics before
          renewing contracts. Clean vendor records make every dropdown across Procurement faster to navigate.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Keep contact info current so buyers always see the right phone numbers and emails.</li>
          <li>Track performance metrics to support sourcing decisions and identify risk early.</li>
          <li>Archive or reactivate vendors to control which names show up in purchasing workflows.</li>
        </ul>
      </header>

      <ProcurementFlowGuide current="documents" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <VendorUpsertCard />
        </div>
        <aside className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="flex items-start gap-3">
              <span className="rounded-full bg-primary/10 p-2 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Vendor governance</CardTitle>
                <CardDescription>Best practices for keeping supplier records current.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Audit vendor profiles quarterly and retire inactive suppliers.</p>
              <p>Capture service level agreements inside the notes field for quick reference.</p>
              <p>Compare KPI trends before approving new sourcing requests.</p>
            </CardContent>
          </Card>

          <VendorPerformanceTable />
        </aside>
      </div>
    </section>
  );
}
