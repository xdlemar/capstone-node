import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function InventoryOverview() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Inventory workspace</h1>
        <p className="text-muted-foreground max-w-3xl">
          Choose one of the dedicated workspaces below to manage stock movement or reconciliation tasks.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/inventory/stock-control">Stock control</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/inventory/cycle-counts">Cycle counts</Link>
        </Button>
      </div>
    </section>
  );
}
