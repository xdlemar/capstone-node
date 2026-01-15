import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";

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
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const isVendorOnly = !!user && user.roles.includes("VENDOR") && !hasStaffRole(user.roles);
  const portalLabel = isVendorOnly ? "Vendor portal" : "Dashboard";
  const notificationCount = 0;

  useEffect(() => {
    const id = window.setTimeout(() => setIsReady(true), 150);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!showNotifications) return undefined;
    function handleOutside(event: MouseEvent) {
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showNotifications]);

  if (!isReady) {
    return <FullScreenPreloader label="Loading dashboard..." />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <Toaster />

      <SidebarInset>
        <header className="sticky top-0 z-20 bg-background">
          <div className="flex h-12 items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 h-6" />
              <div className="flex items-center gap-2">
                <span className="font-semibold">Logistics 1</span>
                <Badge variant="secondary">{portalLabel}</Badge>
              </div>
            </div>
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={showNotifications}
                title="Once you add alert storage + API, we can wire the real count into notificationCount."
                className="relative inline-flex items-center justify-center rounded-full border border-border/60 bg-background/80 p-2 text-muted-foreground shadow-sm transition hover:text-foreground"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                ) : (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </button>
              {showNotifications ? (
                <div className="absolute right-0 mt-3 w-80 rounded-lg border border-border/60 bg-background shadow-xl">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNotifications(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No new notifications to display.
                  </div>
                </div>
              ) : null}
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
