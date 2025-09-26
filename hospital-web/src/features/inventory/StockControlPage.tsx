import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

import { IssueFormCard, TransferFormCard } from "./components/InventoryActions";

export default function StockControlPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canIssue = roles.includes("STAFF") || roles.includes("MANAGER") || roles.includes("ADMIN");

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Stock control</h1>
        <p className="text-muted-foreground max-w-3xl">
          Issue stock to requesting locations or coordinate inter-location transfers. Allocations respect FEFO and update
          stock moves automatically.
        </p>
      </header>

      <Tabs defaultValue="issue" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="issue">Issue</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="space-y-4">
          {canIssue ? <IssueFormCard /> : null}
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          {canIssue ? <TransferFormCard /> : null}
        </TabsContent>
      </Tabs>
    </section>
  );
}
