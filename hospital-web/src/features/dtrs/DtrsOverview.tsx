export default function DtrsOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Document tracking</h1>
        <p className="text-muted-foreground max-w-2xl">
          Maintain proof-of-delivery, invoices, and compliance documents tied to procurement and transport events.
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>Staff</strong>: upload POD scans and tag supporting paperwork.</li>
        <li><strong>Managers</strong>: validate documents and release payments.</li>
        <li><strong>Admins</strong>: manage retention policies and audit access.</li>
      </ul>
    </section>
  );
}
