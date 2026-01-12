import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { FullScreenPreloader } from "@/components/layout/Preloader";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";
import { hasStaffRole } from "@/lib/roles";

export default function AppLayout() {
  const [isReady, setIsReady] = useState(false);
  const { user } = useAuth();
  const isVendorOnly = !!user && user.roles.includes("VENDOR") && !hasStaffRole(user.roles);
  const portalLabel = isVendorOnly ? "Vendor portal" : "Dashboard";

  useEffect(() => {
    const id = window.setTimeout(() => setIsReady(true), 150);
    return () => window.clearTimeout(id);
  }, []);

  if (!isReady) {
    return <FullScreenPreloader label="Loading dashboard..." />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <Toaster />

      <SidebarInset>
        <header className="sticky top-0 z-20 bg-background">
          <div className="flex h-12 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">Logistics 1</span>
              <Badge variant="secondary">{portalLabel}</Badge>
            </div>
          </div>
          <Separator />
        </header>

        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
