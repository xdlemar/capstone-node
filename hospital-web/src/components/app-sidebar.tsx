"use client";

import type * as React from "react";
import {
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";

import { NavMain, type NavSection } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Brand } from "@/components/layout/Brand";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS: Array<NavSection & { roles: string[] }> = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["STAFF", "MANAGER", "ADMIN"],
  },
  {
    title: "Procurement",
    url: "/procurement",
    icon: ShoppingCart,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Purchase requests", url: "/procurement/requisitions", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Purchase orders", url: "/procurement/purchase-orders", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Receiving", url: "/procurement/receiving", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Approvals", url: "/procurement/approvals", roles: ["MANAGER", "ADMIN"] },
      { title: "Vendors", url: "/procurement/vendors", roles: ["ADMIN"] },
      { title: "Insights", url: "/procurement/insights", roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Boxes,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Stock levels", url: "/inventory/stock-levels", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Issue & transfer", url: "/inventory/stock-control", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Transfer approvals", url: "/inventory/transfer-approvals", roles: ["MANAGER", "ADMIN"] },
      { title: "Item catalog", url: "/inventory/item-catalog", roles: ["MANAGER", "ADMIN"] },
      { title: "Storage areas", url: "/inventory/storage-areas", roles: ["ADMIN"] },
    ],
  },
  {
    title: "Asset lifecycle",
    url: "/alms",
    icon: Stethoscope,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Asset register", url: "/alms/assets", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Work orders", url: "/alms/work-orders", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Maintenance schedule", url: "/alms/schedules", roles: ["MANAGER", "ADMIN"] },
      { title: "Alerts", url: "/alms/alerts", roles: ["MANAGER", "ADMIN"] },
      { title: "Financials", url: "/alms/financial", roles: ["ADMIN"] },
    ],
  },
  {
    title: "Project logistics",
    url: "/plt",
    icon: Truck,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Deliveries", url: "/plt/deliveries", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Projects", url: "/plt/projects", roles: ["MANAGER", "ADMIN"] },
      { title: "Alerts", url: "/plt/alerts", roles: ["MANAGER", "ADMIN"] },
      { title: "Routes", url: "/plt/routes", roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Document hub",
    url: "/dtrs",
    icon: FileText,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Library & uploads", url: "/dtrs/documents", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Missing docs ", url: "/dtrs/missing", roles: ["MANAGER", "ADMIN"] }
    ],
  },
  {
    title: "Administration",
    url: "/admin",
    icon: Users,
    roles: ["ADMIN"],
    items: [{ title: "User access", url: "/admin", roles: ["ADMIN"] }],
  },
  {
    title: "Vendor portal",
    url: "/vendor",
    icon: Package,
    roles: ["VENDOR"],
    items: [
      { title: "Overview", url: "/vendor/overview", roles: ["VENDOR"] },
      { title: "Orders", url: "/vendor/orders", roles: ["VENDOR"] },
      { title: "Shipments", url: "/vendor/shipments", roles: ["VENDOR"] },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];

  const filteredNav = NAV_ITEMS.map((section) => ({
    ...section,
    items: section.items?.filter((sub: any) => {
      const required = sub.roles ?? section.roles;
      return required.some((role: string) => userRoles.includes(role));
    }),
  })).filter((section) => section.roles.some((role) => userRoles.includes(role)));

  return (
    <Sidebar collapsible="offcanvas" className="bg-gradient-to-b from-[#0f2540] via-[#112a45] to-[#0c1e34]" {...props}>
      <SidebarHeader>
        <Brand />
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll">
        <NavMain items={filteredNav} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser roles={userRoles} />
      </SidebarFooter>
    </Sidebar>
  );
}




