import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

import { IssueFormCard, TransferFormCard } from "./components/InventoryActions";

export default function StockControlPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canIssue = roles.includes("MANAGER") || roles.includes("ADMIN");
  const isApprover = canIssue;
  const canTransfer = roles.includes("STAFF") && !isApprover;
  const defaultTab = canIssue ? "issue" : "transfer";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Issue & transfer</h1>
        <p className="text-muted-foreground max-w-3xl">
          Issue stock to requesting locations or coordinate inter-location transfers. Allocations respect FEFO and update
          stock moves automatically.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          {canIssue ? <TabsTrigger value="issue">Issue</TabsTrigger> : null}
          {canTransfer ? <TabsTrigger value="transfer">Transfer</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="issue" className="space-y-4">
          {canIssue ? (
            <IssueFormCard />
          ) : (
            <p className="text-sm text-muted-foreground">Issuing stock requires manager or admin access.</p>
          )}
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          {canTransfer ? <TransferFormCard /> : null}
        </TabsContent>
      </Tabs>
    </section>
  );
}

