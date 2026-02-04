import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  Layers,
  ShieldAlert,
  Stethoscope,
  Truck,
  Users2,
  Coins,
  PiggyBank,
  Pin,
  PinOff,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData, type DashboardUnavailableKey } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("en-PH");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CTA_ROLES = {
  inventory: ["STAFF", "MANAGER", "ADMIN"],
  requisitions: ["STAFF", "MANAGER", "ADMIN"],
  approvals: ["MANAGER", "ADMIN"],
  admin: ["ADMIN"],
};

const MODULE_LABELS: Record<DashboardUnavailableKey, string> = {
  procurement: "Procurement summary",
  inventory: "Inventory metrics",
  assets: "Equipment maintenance",
  logistics: "Project logistics",
  documents: "Document tracking",
  users: "User directory",
};

const PIN_STORAGE_KEY = "dashboard.pins";

type NextBestAction =
  | { title: string; description: string; href: string }
  | { title: string; description: string; actionLabel: string; onClick: () => void };

function formatCurrency(value?: number | null) {
  return currencyFormatter.format(value ?? 0);
}


function formatCount(value?: number, fallback = "0") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return numberFormatter.format(value);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardResult, isLoading, refetch, isFetching } = useDashboardData();

  const dashboardData = dashboardResult?.data;
  const unavailable = dashboardResult?.unavailable ?? [];
  const fetchedAt = dashboardResult?.fetchedAt;

  const roleSet = new Set(user?.roles ?? []);

  const procurement = dashboardData?.procurement;
  const inventory = dashboardData?.inventory;
  const assets = dashboardData?.assets;
  const logistics = dashboardData?.logistics;
  const documents = dashboardData?.documents;
  const usersSummary = dashboardData?.users;

  const isUnavailable = (key: DashboardUnavailableKey) => unavailable.includes(key);
  const unavailableLabel = (key: DashboardUnavailableKey) => MODULE_LABELS[key] ?? key;
  const pinLimit = roleSet.has("ADMIN") ? 6 : roleSet.has("MANAGER") ? 5 : 4;

  const [pinnedWorkspaces, setPinnedWorkspaces] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });

  const persistPins = (next: string[]) => {
    setPinnedWorkspaces(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const togglePin = (id: string) => {
    const next = pinnedWorkspaces.includes(id)
      ? pinnedWorkspaces.filter((pin: string) => pin !== id)
      : [id, ...pinnedWorkspaces].slice(0, pinLimit);
    persistPins(next);
  };

  const resetPins = () => persistPins([]);

  const heroActions = [
    roleSetHas(roleSet, CTA_ROLES.inventory) && (
      <Button
        key="inventory"
        asChild
        variant="secondary"
        className={cn("w-full sm:w-auto justify-between", "bg-white/15 text-white hover:bg-white/25")}
      >
        <Link to="/inventory/stock-levels">
          View inventory
          <ArrowUpRight className="ml-2 size-4" />
        </Link>
      </Button>
    ),
    roleSetHas(roleSet, CTA_ROLES.requisitions) && (
      <Button key="requisition" asChild variant="secondary" className={cn("w-full sm:w-auto justify-between", "bg-white/15 text-white hover:bg-white/25")}>
        <Link to="/procurement/requisitions">
          Create requisition
          <ArrowUpRight className="ml-2 size-4" />
        </Link>
      </Button>
    ),
    roleSetHas(roleSet, CTA_ROLES.approvals) && (
      <Button key="approvals" asChild variant="secondary" className={cn("w-full sm:w-auto justify-between", "bg-white/15 text-white hover:bg-white/25")}>
        <Link to="/procurement/approvals">
          Review approvals
          <ArrowUpRight className="ml-2 size-4" />
        </Link>
      </Button>
    ),
  ].filter(Boolean);

  const heroActionSection = isLoading ? (
    <div className="flex w-full flex-col gap-2 sm:flex-row">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton key={idx} className="h-10 w-full sm:w-40 bg-white/20" />
      ))}
    </div>
  ) : heroActions.length > 0 ? (
    <div className="flex flex-col gap-2 sm:flex-row">{heroActions}</div>
  ) : (
    <div className="text-sm text-white/70">No quick actions available for your role yet.</div>
  );

  const kpiCards = [
    {
      title: "Open purchase requests",
      value: isUnavailable("procurement") ? "—" : formatCount(procurement?.openRequests),
      change: isUnavailable("procurement")
        ? "Unavailable"
        : `${formatCount(procurement?.pendingApprovals)} pending approval`,
      helper: "Procurement pipeline",
      icon: ClipboardList,
      roles: ["STAFF", "MANAGER", "ADMIN"],
    },
    {
      title: "Inventory alerts",
      value: isUnavailable("inventory")
        ? "—"
        : formatCount((inventory?.lowStock ?? 0) + (inventory?.expiringSoon ?? 0)),
      change: isUnavailable("inventory")
        ? "Unavailable"
        : `${formatCount(inventory?.expiringBatches)} batches expiring soon`,
      helper: "Covers low stock & expiries",
      icon: Boxes,
      roles: ["MANAGER", "ADMIN"],
    },
    {
      title: "Scheduled maintenance",
      value: isUnavailable("assets") ? "—" : formatCount(assets?.maintenanceDueSoon),
      change: isUnavailable("assets")
        ? "Unavailable"
        : `${formatCount(assets?.openWorkOrders)} work orders in progress`,
      helper: "Equipment lifecycle",
      icon: Stethoscope,
      roles: ["STAFF", "MANAGER", "ADMIN"],
    },
    {
      title: "Pending approvals",
      value: isUnavailable("procurement") ? "—" : formatCount(procurement?.pendingApprovals),
      change: isUnavailable("procurement")
        ? "Unavailable"
        : `${formatCount(procurement?.openPurchaseOrders)} open purchase orders`,
      helper: "Review & release",
      icon: BadgeCheck,
      roles: ["MANAGER", "ADMIN"],
    },
    {
      title: "Documents uploaded",
      value: isUnavailable("documents") ? "—" : formatCount(documents?.recentUploads),
      change: isUnavailable("documents")
        ? "Unavailable"
        : `${formatCount(documents?.awaitingSignatures)} awaiting signature`,
      helper: "Compliance hub",
      icon: FileText,
      roles: ["MANAGER", "ADMIN"],
    },
    {
      title: "Team on duty",
      value: isUnavailable("users") ? "—" : formatCount(usersSummary?.activeUsers),
      change: isUnavailable("users")
        ? "Unavailable"
        : `+${formatCount(usersSummary?.newThisWeek)} this week`,
      helper: "User access",
      icon: Users2,
      roles: ["ADMIN"],
    },
    {
      title: "Awaiting signatures",
      value: isUnavailable("documents") ? "—" : formatCount(documents?.awaitingSignatures),
      change: isUnavailable("documents") ? "Unavailable" : "Signature backlog",
      helper: "Compliance hub",
      icon: FileText,
      roles: ["MANAGER", "ADMIN"],
    },
    {
      title: "Delayed deliveries",
      value: isUnavailable("logistics") ? "—" : formatCount(logistics?.delayedDeliveries),
      change: isUnavailable("logistics") ? "Unavailable" : "Routes at risk",
      helper: "Project logistics",
      icon: Truck,
      roles: ["MANAGER", "ADMIN"],
    },
  ];

  const operationsSeries =
    inventory?.movementsSeries?.length === 7 ? inventory.movementsSeries : new Array(7).fill(0);

  const inventoryAlerts = (inventory?.alerts ?? []).map((alert) => ({
    id: alert.id,
    title: alert.title,
    detail: alert.detail,
    type: alert.type === "EXPIRY" ? "warning" : "info",
  }));

  const logisticsAlerts = (logistics?.alerts ?? []).map((alert) => ({
    id: alert.id,
    title: alert.delivery?.trackingNo ? `Delivery ${alert.delivery.trackingNo}` : "Delivery alert",
    detail: alert.message,
    type: alert.type === "ETA_MISSED" ? "critical" : "warning",
  }));

  const logisticsCostSummary = logistics?.deliveryCosts;
  const logisticsCostProjects = logisticsCostSummary?.perProject ?? [];
  const totalDeliverySpend = logisticsCostSummary ? logisticsCostSummary.totalDeliverySpend : 0;

  const assetFinancials = assets?.financials;
  const topMaintenanceAssets = assetFinancials?.topAssetsByMaintenance ?? [];


  const liveAlerts = [...inventoryAlerts, ...logisticsAlerts].slice(0, 5);

  const checklist = [
    {
      title: "Review requisitions needing approval",
      detail: isUnavailable("procurement")
        ? "Unavailable"
        : `${formatCount(procurement?.pendingApprovals)} awaiting approval`,
    },
    {
      title: "Confirm inbound deliveries",
      detail: isUnavailable("logistics")
        ? "Unavailable"
        : `${formatCount(logistics?.deliveriesInTransit)} routes in transit`,
    },
    {
      title: "Share weekly compliance digest",
      detail: isUnavailable("documents")
        ? "Unavailable"
        : `${formatCount(documents?.recentUploads)} new files this week`,
    },
  ];

  const nextBestAction: NextBestAction = (() => {
    if (isUnavailable("procurement") && isUnavailable("inventory") && isUnavailable("logistics")) {
      return {
        title: "Retry dashboard data",
        description: "Several services are unavailable right now.",
        actionLabel: "Retry",
        onClick: () => refetch(),
      };
    }
    if (!isUnavailable("procurement") && (procurement?.pendingApprovals ?? 0) > 0) {
      return {
        title: "Review pending approvals",
        description: `${formatCount(procurement?.pendingApprovals)} requisitions awaiting approval`,
        href: "/procurement/approvals",
      };
    }
    const inventoryAlertsCount = (inventory?.lowStock ?? 0) + (inventory?.expiringSoon ?? 0);
    if (!isUnavailable("inventory") && inventoryAlertsCount > 0) {
      return {
        title: "Resolve inventory alerts",
        description: `${formatCount(inventoryAlertsCount)} items need attention`,
        href: "/inventory/stock-levels",
      };
    }
    if (!isUnavailable("logistics") && (logistics?.delayedDeliveries ?? 0) > 0) {
      return {
        title: "Investigate delayed deliveries",
        description: `${formatCount(logistics?.delayedDeliveries)} delayed routes`,
        href: "/plt/deliveries",
      };
    }
    if (!isUnavailable("documents") && (documents?.awaitingSignatures ?? 0) > 0) {
      return {
        title: "Finalize signatures",
        description: `${formatCount(documents?.awaitingSignatures)} documents awaiting sign-off`,
        href: "/dtrs/missing",
      };
    }
    return {
      title: "Review operations overview",
      description: "Everything looks steady. Review core modules for routine checks.",
      href: "/dashboard",
    };
  })();

  if (isLoading && !dashboardData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#0f2540] via-[#112c4a] to-[#0c1e34] p-6 text-white shadow-xl">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top,_rgba(14,54,103,0.6),_transparent)] sm:block" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-4">
            <Badge variant="secondary" className="bg-white/15 text-white">
              Logistics Control Centre
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
              Welcome{user ? (user.name ? `, ${user.name}` : `, user ${user.id}`) : ""}
            </h1>
            <p className="text-white/70">
              Stay ahead of requisitions, inventory health, deliveries, and compliance from a single command dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1">System uptime: 99.98%</span>
            </div>
          </div>
          {heroActionSection}
        </div>
      </section>

      {unavailable.length > 0 && (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50/70 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Some summaries are temporarily unavailable</p>
              <p className="text-xs text-amber-800">
                {fetchedAt ? `Last checked: ${new Date(fetchedAt).toLocaleString()}` : "Check again shortly."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {unavailable.map((key) => (
              <Badge key={key} variant="outline">
                {unavailableLabel(key)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Card className="border bg-card shadow-md">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Next best action</CardTitle>
            <CardDescription>Suggested focus based on current signals</CardDescription>
          </div>
          {"href" in nextBestAction ? (
            <Button asChild variant="secondary" className="gap-2">
              <Link to={nextBestAction.href}>
                {nextBestAction.title}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="secondary" className="gap-2" onClick={nextBestAction.onClick}>
              {nextBestAction.actionLabel}
              <ArrowUpRight className="size-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{nextBestAction.description}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpiCards
          .filter((card) => card.roles.some((role) => roleSet.has(role)))
          .map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="border bg-card shadow-md transition-shadow hover:shadow-lg">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base text-muted-foreground">{card.title}</CardTitle>
                    <CardDescription className="text-3xl font-semibold text-foreground">
                      {card.value}
                    </CardDescription>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2 text-primary shadow-sm">
                    <Icon className="size-5" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="outline" className="w-fit border-dashed text-xs text-muted-foreground">
                    {card.change}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{card.helper}</p>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="border bg-card shadow-md">
          <CardHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Operations pulse</CardTitle>
                <CardDescription>Daily distribution of supply movement and service tickets</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Last 7 days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isUnavailable("inventory") ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Inventory metrics unavailable. Retry once inventory service is online.
              </div>
            ) : (
              <div className="flex h-28 items-end gap-2">
                {operationsSeries.map((value, index) => (
                  <div key={index} className="flex-1">
                    <div
                      className="rounded-t-full bg-gradient-to-t from-primary/60 via-primary/40 to-primary/20"
                      style={{ height: `${Math.min(100, Math.round(value))}%` }}
                      aria-hidden
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Deliveries in transit</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {isUnavailable("logistics") ? "—" : formatCount(logistics?.deliveriesInTransit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delayed deliveries</p>
                <p className="text-lg font-semibold text-rose-600">
                  {isUnavailable("logistics") ? "—" : formatCount(logistics?.delayedDeliveries)}
                </p>
              </div>
            </div>
            {logisticsCostProjects.length > 0 && (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="size-4 text-primary" />
                    <span>Top delivery spend</span>
                  </div>
                  <span className="font-semibold text-primary">{formatCurrency(totalDeliverySpend)}</span>
                </div>
                <div className="space-y-2">
                  {logisticsCostProjects.map((project) => (
                    <div
                      key={project.projectId}
                      className="flex items-center justify-between rounded-md border border-primary/10 bg-background/80 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{project.code || project.name}</span>
                        <span className="text-xs text-muted-foreground">{project.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{formatCurrency(project.deliveryCost)}</p>
                        {project.budget ? (
                          <p className="text-xs text-muted-foreground">Budget {formatCurrency(project.budget)}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-md">
          <CardHeader>
            <CardTitle>Live alerts</CardTitle>
            <CardDescription>Highlights that need follow-up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveAlerts.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {isUnavailable("inventory") && isUnavailable("logistics")
                  ? "Alerts unavailable while services recover."
                  : "No critical alerts at the moment."}
              </div>
            )}
            {liveAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border bg-muted/40 p-3 shadow-sm",
                  alert.type === "critical" && "border-destructive/40 bg-destructive/10",
                  alert.type === "warning" && "border-amber-200 bg-amber-50",
                  alert.type === "info" && "border-sky-200 bg-sky-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <AlertTriangle className="size-4" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" className="ml-auto gap-2 text-sm">
              <Link to="/dtrs">
                View detailed reports
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border bg-card shadow-md lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Quick workspaces</CardTitle>
                <CardDescription>Jump to the modules you use most often</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Pins: {pinnedWorkspaces.length}/{pinLimit}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={resetPins} disabled={!pinnedWorkspaces.length}>
                  Reset pins
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              {
                id: "procurement",
                serviceKey: "procurement" as DashboardUnavailableKey,
                title: "Procurement workspace",
                description: `${formatCount(procurement?.openRequests)} open requests in review`,
                href: "/procurement/requisitions",
                icon: ClipboardCheck,
                roles: ["STAFF", "MANAGER", "ADMIN"],
              },
              {
                id: "inventory",
                serviceKey: "inventory" as DashboardUnavailableKey,
                title: "Inventory insights",
                description: `${formatCount(inventory?.lowStock)} low stock alerts`,
                href: "/inventory/stock-levels",
                icon: Layers,
                roles: ["STAFF", "MANAGER", "ADMIN"],
              },
              {
                id: "equipment",
                serviceKey: "assets" as DashboardUnavailableKey,
                title: "Equipment maintenance",
                description: `${formatCount(assets?.openWorkOrders)} work orders scheduled`,
                href: "/alms",
                icon: Factory,
                roles: ["STAFF", "MANAGER", "ADMIN"],
              },
              {
                id: "logistics",
                serviceKey: "logistics" as DashboardUnavailableKey,
                title: "Logistics routes",
                description: `${formatCount(logistics?.deliveriesInTransit)} routes in transit`,
                href: "/plt",
                icon: Truck,
                roles: ["MANAGER", "ADMIN"],
              },
              {
                id: "documents",
                serviceKey: "documents" as DashboardUnavailableKey,
                title: "Document library",
                description: `${formatCount(documents?.totalDocuments)} files available (role-scoped)`,
                href: "/dtrs",
                icon: FileText,
                roles: ["STAFF", "MANAGER", "ADMIN"],
              },
              {
                id: "users",
                serviceKey: "users" as DashboardUnavailableKey,
                title: "User administration",
                description: `${formatCount(usersSummary?.totalUsers)} registered users`,
                href: "/admin",
                icon: ShieldAlert,
                roles: ["ADMIN"],
              },
            ]
              .filter((link) => roleSetHas(roleSet, link.roles))
              .sort((a, b) => {
                const aPinned = pinnedWorkspaces.includes(a.id);
                const bPinned = pinnedWorkspaces.includes(b.id);
                if (aPinned === bPinned) return 0;
                return aPinned ? -1 : 1;
              })
              .map((link) => {
                const Icon = link.icon;
                const isPinned = pinnedWorkspaces.includes(link.id);
                const isDown = isUnavailable(link.serviceKey);
                return (
                  <Link
                    key={link.title}
                    to={link.href}
                    className="group rounded-xl border bg-muted/40 p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-primary/10 p-2 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary">{link.title}</p>
                          <p className="text-sm text-muted-foreground">{link.description}</p>
                          {isDown ? (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              Unavailable
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(event) => {
                          event.preventDefault();
                          togglePin(link.id);
                        }}
                        title={isPinned ? "Unpin workspace" : "Pin workspace"}
                      >
                        {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                      </Button>
                    </div>
                  </Link>
                );
              })}
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-md">
          <CardHeader>
            <CardTitle>Today's checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item) => (
              <div key={item.title} className="rounded-lg border border-dashed p-3 shadow-sm">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        {assetFinancials && (
          <Card className="border bg-card shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Equipment financials</CardTitle>
                  <CardDescription>Book value and maintenance spend snapshot</CardDescription>
                </div>
                <PiggyBank className="size-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Acquisition value</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(assetFinancials.acquisitionValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Book value</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(assetFinancials.bookValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance (30 days)</p>
                  <p className="text-lg font-semibold text-emerald-600">{formatCurrency(assetFinancials.maintenanceCost30d)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-muted/60 bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Maintenance spend (YTD)</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(assetFinancials.maintenanceCostYtd)}</p>
                </div>
                <div className="rounded-md border border-muted/60 bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Spend vs acquisition</p>
                  <p className="text-lg font-semibold text-foreground">
                    {assetFinancials.acquisitionValue
                      ? `${Math.round((assetFinancials.maintenanceCostYtd / assetFinancials.acquisitionValue) * 100)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
              {topMaintenanceAssets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Top equipment by maintenance (YTD)</p>
                  <ul className="space-y-2">
                    {topMaintenanceAssets.map((asset) => (
                      <li
                        key={asset.assetId}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{asset.assetCode}</span>
                          <span className="text-xs text-muted-foreground">
                            {asset.category ?? asset.status}
                          </span>
                        </div>
                        <span className="font-semibold text-primary">{formatCurrency(asset.spendYtd)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function roleSetHas(roleSet: Set<string>, allowed: string[]) {
  return allowed.some((role) => roleSet.has(role));
}



