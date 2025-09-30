import { ProcurementInsightsPanel } from "./components/ProcurementInsights";

export default function ProcurementInsightsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Supplier insights</h1>
        <p className="text-muted-foreground max-w-3xl">
          Compare supplier performance and identify savings opportunities across recent procurement activity.
        </p>
      </header>

      <ProcurementInsightsPanel />
    </section>
  );
}