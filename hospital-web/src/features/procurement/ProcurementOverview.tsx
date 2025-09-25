export default function ProcurementOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Procurement workspace</h1>
        <p className="text-muted-foreground max-w-2xl">
          Manage purchase requisitions, purchase orders, and receipts for Logistics 1. Staff can draft and post receipts, while managers approve sourcing decisions.
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>Staff</strong>: create PRs/POs, receive deliveries, upload DR attachments.</li>
        <li><strong>Managers</strong>: approve PRs and POs, review vendor performance.</li>
        <li><strong>Admins</strong>: maintain vendor master data and override escalations.</li>
      </ul>
    </section>
  );
}
