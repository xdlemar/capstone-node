import { CreatePoCard } from "./components/ProcurementForms";

export default function ProcurementPurchaseOrdersPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Issue purchase order</h1>
        <p className="text-muted-foreground max-w-3xl">
          Convert approved requisitions into purchase orders. Friendly dropdowns list recently approved PRs so teams can
          double-check details before committing the order number.
        </p>
      </header>

      <CreatePoCard />
    </section>
  );
}
