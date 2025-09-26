import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

import { CountFormCard } from "./components/InventoryActions";

export default function CycleCountPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canCount = roles.includes("MANAGER") || roles.includes("ADMIN");

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Cycle counts</h1>
        <p className="text-muted-foreground max-w-3xl">
          Initiate cycle count sessions, capture variances, and post adjustments once the review is complete.
        </p>
      </header>

      {canCount ? (
        <CountFormCard />
      ) : (
        <Alert variant="secondary" className="border-dashed">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Restricted</AlertTitle>
          <AlertDescription>Cycle counting is limited to managers and administrators.</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
