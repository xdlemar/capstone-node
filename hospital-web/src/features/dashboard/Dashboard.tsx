import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Welcome back{user ? `, user ${user.id}` : ""}</h1>
        <p className="text-muted-foreground">
          Current access: {roles.length ? roles.join(" � ") : "No roles assigned"}
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      
      </div>
    </div>
  );
}
