import { Outlet, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const AUTH_ROUTES = ["/login"]; // add more like "/register", "/forgot-password" if you have them

export default function AppLayout() {
  const { pathname } = useLocation()
  const isAuth = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  // For auth pages, render content only (no sidebar/header)
  if (isAuth) {
    return <Outlet />
  }

  // App chrome for everything else
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-20 bg-background">
          <div className="flex h-12 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">Logistics 1</span>
              <Badge variant="secondary">Dashboard</Badge>
            </div>
          </div>
          <Separator />
        </header>

        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
