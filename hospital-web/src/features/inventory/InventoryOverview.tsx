export default function InventoryOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Inventory control</h1>
        <p className="text-muted-foreground max-w-2xl">
          Monitor stock levels, execute stock moves, and reconcile cycle counts for critical supplies.
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>Staff</strong>: issue items, request transfers, run cycle counts.</li>
        <li><strong>Managers</strong>: authorize adjustments, review expiry/low stock reports.</li>
        <li><strong>Admins</strong>: configure thresholds, update master data, and audit activity.</li>
      </ul>
    </section>
  );
}
