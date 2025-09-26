import { PurchaseRequestCard } from "./components/ProcurementForms";

export default function ProcurementRequisitionsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Create purchase requisition</h1>
        <p className="text-muted-foreground max-w-3xl">
          Capture detailed purchase requisitions using readable item names. As soon as you submit, the request appears in the
          manager approval queue.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Describe the need in plain language so approvers know which department or patient program requested it.</li>
          <li>Set quantities and units exactly as the supplier packages them (e.g., box of 10 IV sets).</li>
          <li>Add optional notes for critical instructions such as delivery deadlines or cold-chain requirements.</li>
        </ul>
      </header>

      <PurchaseRequestCard />
    </section>
  );
}
