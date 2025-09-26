"use client";

import type * as React from "react";
import {
  Boxes,
  FileText,
  LayoutDashboard,
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
    items: [{ title: "Overview", url: "/dashboard" }],
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
    ],
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Boxes,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Stock control", url: "/inventory/stock-control", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Cycle counts", url: "/inventory/cycle-counts", roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Asset lifecycle",
    url: "/alms",
    icon: Stethoscope,
    roles: ["STAFF", "MANAGER", "ADMIN"],
    items: [
      { title: "Assets", url: "/alms", roles: ["STAFF", "MANAGER", "ADMIN"] },
      { title: "Schedules", url: "/alms", roles: ["STAFF", "MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Project logistics",
    url: "/plt",
    icon: Truck,
    roles: ["MANAGER", "ADMIN"],
    items: [
      { title: "Deliveries", url: "/plt", roles: ["MANAGER", "ADMIN"] },
      { title: "Routes", url: "/plt", roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Document hub",
    url: "/dtrs",
    icon: FileText,
    roles: ["MANAGER", "ADMIN"],
    items: [{ title: "Records", url: "/dtrs", roles: ["MANAGER", "ADMIN"] }],
  },
  {
    title: "Administration",
    url: "/admin",
    icon: Users,
    roles: ["ADMIN"],
    items: [{ title: "User access", url: "/admin", roles: ["ADMIN"] }],
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

