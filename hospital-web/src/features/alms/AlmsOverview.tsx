export default function AlmsOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Asset lifecycle</h1>
        <p className="text-muted-foreground max-w-2xl">
          Track biomedical assets, preventive maintenance schedules, and work orders for Logistics 1.
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>Staff</strong>: log inspections, update work order progress, capture repairs.</li>
        <li><strong>Managers</strong>: approve transfers, disposals, and schedule changes.</li>
        <li><strong>Admins</strong>: manage asset registry, warranty data, and technician assignments.</li>
      </ul>
    </section>
  );
}
