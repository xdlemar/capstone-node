export default function PltOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Project logistics & transport</h1>
        <p className="text-muted-foreground max-w-2xl">
          Coordinate project deliveries, track shipment milestones, and notify stakeholders.
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>Staff</strong>: update delivery events, attach dispatch documents.</li>
        <li><strong>Managers</strong>: approve dispatch plans and resolve exceptions.</li>
        <li><strong>Admins</strong>: configure project templates and carrier integrations.</li>
      </ul>
    </section>
  );
}
