import { ProcurementFlowGuide } from "./components/ProcurementFlowGuide";
import { ReceiptCard } from "./components/ProcurementForms";

export default function ProcurementReceivingPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-primary">Step 4 of 4</p>
          <h1 className="text-3xl font-semibold tracking-tight">Receive delivery (post receipt)</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Log delivery receipts and invoice details so the system can update on-hand stock, vendor KPIs, and downstream
          inventory moves.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Pick the PO from the dropdown; only open orders appear so you cannot post to the wrong document.</li>
          <li>Enter the DR and invoice reference numbers exactly as printed to simplify reconciliation.</li>
          <li>After posting, the PO will disappear from the list once it is fully received.</li>
        </ul>
      </header>

      <ProcurementFlowGuide current="receiving" />

      <ReceiptCard />
    </section>
  );
}
