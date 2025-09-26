import { PurchaseRequestCard } from "./components/ProcurementForms";

export default function ProcurementRequisitionsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create purchase requisition</h1>
        <p className="text-muted-foreground max-w-3xl">
          Capture detailed purchase requisitions using readable item names. Submitted requests route to the procurement
          approval queue for manager review.
        </p>
      </header>

      <PurchaseRequestCard />
    </section>
  );
}
