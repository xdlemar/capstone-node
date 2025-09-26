import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

import { CountFormCard, IssueFormCard, TransferFormCard } from "./components/InventoryActions";

function RoleBlockedNotice({ message }: { message: string }) {
  return (
    <Alert variant="secondary" className="border-dashed">
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle>Restricted</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default function InventoryOverview() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");
  const isManager = roles.includes("MANAGER") || isAdmin;
  const isStaff = roles.includes("STAFF") || isManager;

  const defaultTab = isStaff ? "issue" : isManager ? "transfer" : "overview";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Inventory control</h1>
        <p className="text-muted-foreground max-w-3xl">
          Issue stock, coordinate transfers, and reconcile cycle counts with FEFO-aware automations. Access is trimmed to
          the permissions attached to your account.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <TabsTrigger value="issue" disabled={!isStaff}>
            Issue
          </TabsTrigger>
          <TabsTrigger value="transfer" disabled={!isStaff}>
            Transfer
          </TabsTrigger>
          <TabsTrigger value="count" disabled={!isManager}>
            Cycle count
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="space-y-4">
          {isStaff ? (
            <IssueFormCard />
          ) : (
            <RoleBlockedNotice message="Only staff and managers can raise stock issues." />
          )}
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          {isStaff ? (
            <TransferFormCard />
          ) : (
            <RoleBlockedNotice message="Transfers are available to staff and managers." />
          )}
        </TabsContent>

        <TabsContent value="count" className="space-y-4">
          {isManager ? (
            <CountFormCard />
          ) : (
            <RoleBlockedNotice message="Cycle counts are limited to managers and administrators." />
          )}
        </TabsContent>
      </Tabs>

      {!isAdmin && (
        <Alert variant="secondary" className="border-dashed">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Need to manage master data?</AlertTitle>
          <AlertDescription>
            Item and location master records stay behind an administrator workflow. Reach out to the admin team for new
            SKUs or location setup.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
