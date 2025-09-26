import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ApprovePrCard, VendorPerformanceTable } from "./components/ProcurementForms";

export default function ProcurementApprovalsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Procurement approvals</h1>
        <p className="text-muted-foreground max-w-3xl">
          Review submitted purchase requisitions, manage sourcing decisions, and monitor vendor performance signals before
          signing off. This view is limited to managers and admins to reflect segregation of duties.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <ApprovePrCard />
        </div>
        <aside className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="flex items-start gap-3">
              <span className="rounded-full bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Approval checklist</CardTitle>
                <CardDescription>Confirm budgets and supplier readiness before approving.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>- Validate that requested quantities match project demand and safety stock policies.</p>
              <p>- Ensure the chosen supplier meets compliance and performance thresholds.</p>
              <p>- Communicate with logistics for delivery scheduling once approvals are granted.</p>
            </CardContent>
          </Card>

          <VendorPerformanceTable />
        </aside>
      </div>
    </section>
  );
}
