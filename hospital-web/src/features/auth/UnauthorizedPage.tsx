export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-semibold text-destructive">Access restricted</h1>
      <p className="max-w-md text-muted-foreground">
        You do not have permission to view this resource. If you believe this is a mistake, please contact your Logistics 1 administrator.
      </p>
    </div>
  );
}
