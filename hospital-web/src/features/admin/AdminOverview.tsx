export default function AdminOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="text-muted-foreground max-w-2xl">
          Configure Logistics 1 settings, manage users and permissions, and oversee audit trails.
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>Admins only</strong>: invite or disable users, assign roles, and update department-wide policies.</li>
        <li>Review cross-module logs to ensure compliance and security.</li>
      </ul>
    </section>
  );
}
