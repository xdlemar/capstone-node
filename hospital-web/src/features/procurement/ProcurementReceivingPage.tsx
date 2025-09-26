import { ReceiptCard } from "./components/ProcurementForms";

export default function ProcurementReceivingPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Receive delivery (post receipt)</h1>
        <p className="text-muted-foreground max-w-3xl">
          Log delivery receipts and invoice details so the system can update on-hand stock and vendor metrics. All PO
          numbers are displayed with readable labels for quick confirmation.
        </p>
      </header>

      <ReceiptCard />
    </section>
  );
}
