import { CreatePoCard } from "./components/ProcurementForms";

export default function ProcurementPurchaseOrdersPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Issue purchase order</h1>
        <p className="text-muted-foreground max-w-3xl">
          Convert approved requisitions into purchase orders. The dropdown lists recent approvals using the PR number so you
          can confirm you are ordering against the right request.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Select the requisition that passed manager review. The request details will flow to the order automatically.</li>
          <li>Confirm or override the generated PO number if you follow a custom numbering convention.</li>
          <li>Submit to notify suppliers and unblock receiving once goods are in transit.</li>
        </ul>
      </header>

      <CreatePoCard />
    </section>
  );
}
