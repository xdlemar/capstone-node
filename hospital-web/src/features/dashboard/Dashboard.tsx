import { Link } from "react-router-dom";
import {
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  STAFF: "Staff",
  MANAGER: "Manager",
  ADMIN: "Administrator",
};

const KPI_CARDS = [
  {
    title: "Open purchase requests",
    value: "14",
    change: "+5.2%",
    helper: "vs last week",
    icon: ClipboardList,
    accent: "from-orange-500/20 via-orange-500/10 to-transparent text-orange-700",
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    title: "Inventory alerts",
    value: "8",
    change: "3 new",
    helper: "expiring in 30 days",
    icon: Boxes,
    accent: "from-rose-500/20 via-rose-500/10 to-transparent text-rose-700",
    roles: ["MANAGER", "ADMIN"],
  },
  {
    title: "Scheduled maintenance",
    value: "22",
    change: "92% on track",
    helper: "asset lifecycle",
    icon: Stethoscope,
    accent: "from-sky-500/20 via-sky-500/10 to-transparent text-sky-700",
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    title: "Pending approvals",
    value: "5",
    change: "needs review",
    helper: "procurement & logistics",
    icon: BadgeCheck,
    accent: "from-amber-400/25 via-amber-400/10 to-transparent text-amber-700",
    roles: ["MANAGER", "ADMIN"],
  },
  {
    title: "Documents uploaded",
    value: "32",
    change: "+12 this week",
    helper: "compliance hub",
    icon: FileText,
    accent: "from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-700",
    roles: ["MANAGER", "ADMIN"],
  },
  {
    title: "Team on duty",
    value: "18",
    change: "4 new users",
    helper: "active across services",
    icon: Users2,
    accent: "from-indigo-500/20 via-indigo-500/10 to-transparent text-indigo-700",
    roles: ["ADMIN"],
  },
] as const;

const QUICK_LINKS = [
  {
    title: "Procurement workspace",
    description: "Track requisitions, orders and receipts",
    href: "/procurement/requisitions",
    icon: ClipboardCheck,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    title: "Inventory insights",
    description: "Review stock movements and cycle counts",
    href: "/inventory/stock-levels",
    icon: Layers,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    title: "Asset maintenance",
    description: "Check upcoming work orders and alerts",
    href: "/alms",
    icon: Factory,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    title: "Logistics routes",
    description: "Monitor deliveries and ETAs",
    href: "/plt",
    icon: Truck,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    title: "Document library",
    description: "Access compliance and regulatory files",
    href: "/dtrs",
    icon: FileText,
    roles: ["MANAGER", "ADMIN"],
  },
  {
    title: "User administration",
    description: "Invite staff and manage access levels",
    href: "/admin",
    icon: ShieldAlert,
    roles: ["ADMIN"],
  },
] as const;

const INVENTORY_SERIES = [68, 72, 75, 78, 74, 81, 85];
const ALERT_FEED = [
  {
    title: "Sterile gloves (MED-019)",
    detail: "14 days until reorder threshold",
    status: "warning",
  },
  {
    title: "CT Scanner scheduled service",
    detail: "Maintenance due in 3 days",
    status: "info",
  },
  {
    title: "Vendor SLA review",
    detail: "2 contracts expiring this month",
    status: "critical",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const roleSet = new Set(roles);
  const roleDisplay = roles.length ? roles.map((role) => ROLE_LABEL[role] ?? role).join(" ? ") : "No roles assigned";

  const visibleKpis = KPI_CARDS.filter((card) => card.roles.some((role) => roleSet.has(role)));
  const shortcuts = QUICK_LINKS.filter((link) => link.roles.some((role) => roleSet.has(role)));

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
              Welcome back{user ? `, user ${user.id}` : ""}
            </h1>
            <p className="text-white/70">
              Stay ahead of requisitions, inventory health, deliveries, and compliance from a single command dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1">Access: {roleDisplay}</span>
              <Separator orientation="vertical" className="hidden h-4 bg-white/20 lg:block" />
              <span className="rounded-full bg-white/10 px-3 py-1">System uptime: 99.98%</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
              <Link to="/inventory/stock-levels">
                View inventory
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-white/90">
              <Link to="/procurement/requisitions">
                Create requisition
                <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleKpis.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-none bg-background/60 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base text-muted-foreground">{card.title}</CardTitle>
                  <CardDescription className="text-3xl font-semibold text-foreground">
                    {card.value}
                  </CardDescription>
                </div>
                <div className={cn("rounded-full p-2 shadow-sm", `bg-gradient-to-br ${card.accent}`)}>
                  <Icon className="size-5" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
        <Card className="border-none bg-card/60 shadow-sm">
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
            <div className="flex h-28 items-end gap-2">
              {INVENTORY_SERIES.map((value, index) => (
                <div key={index} className="flex-1">
                  <div
                    className="rounded-t-full bg-gradient-to-t from-primary/60 via-primary/40 to-primary/20"
                    style={{ height: `${value}%` }}
                    aria-hidden
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Inventory turnover</p>
                <p className="text-lg font-semibold">4.6 days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-time deliveries</p>
                <p className="text-lg font-semibold text-emerald-600">96%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical stockouts</p>
                <p className="text-lg font-semibold text-rose-600">0 events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card/60 shadow-sm">
          <CardHeader>
            <CardTitle>Live alerts</CardTitle>
            <CardDescription>Highlights that need follow-up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ALERT_FEED.map((alert) => (
              <div key={alert.title} className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{alert.title}</p>
                  <Badge
                    variant={alert.status === "critical" ? "destructive" : "secondary"}
                    className={cn(
                      alert.status === "warning" && "border-amber-200 bg-amber-100 text-amber-800",
                      alert.status === "info" && "border-sky-200 bg-sky-100 text-sky-700"
                    )}
                  >
                    {alert.status === "critical" ? "Critical" : alert.status === "warning" ? "Warning" : "Info"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.detail}</p>
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
        <Card className="border-none bg-card/60 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick workspaces</CardTitle>
            <CardDescription>Jump to the modules you use most often</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {shortcuts.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.title}
                  to={link.href}
                  className="group rounded-xl border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary">{link.title}</p>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
            {!shortcuts.length && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                You do not have access to any operational modules yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-card/60 shadow-sm">
          <CardHeader>
            <CardTitle>Today's checklist</CardTitle>
            <CardDescription>Suggested follow-ups generated from recent activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed p-3">
              <p className="font-medium text-foreground">Review requisitions needing approval</p>
              <p className="text-sm text-muted-foreground">Managers & admins - 5 items pending</p>
            </div>
            <div className="rounded-lg border border-dashed p-3">
              <p className="font-medium text-foreground">Confirm inbound deliveries</p>
              <p className="text-sm text-muted-foreground">Logistics team - 3 routes arriving today</p>
            </div>
            <div className="rounded-lg border border-dashed p-3">
              <p className="font-medium text-foreground">Share weekly compliance digest</p>
              <p className="text-sm text-muted-foreground">Document hub - Auto-generated summary ready</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


