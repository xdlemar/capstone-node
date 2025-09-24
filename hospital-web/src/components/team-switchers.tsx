import * as React from "react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
type Team = {
  name: string
  plan?: string
  // accept either a URL string or a React component
  logo?: string | React.ElementType
  logoUrl?: string
}

export function TeamSwitcher({ teams }: { teams: Team[] }) {
  const [activeTeam] = React.useState(teams[0])
  if (!activeTeam) return null

  const LogoComp =
    typeof activeTeam.logo === "function" ? activeTeam.logo : undefined
  const imgSrc =
    typeof activeTeam.logo === "string"
      ? activeTeam.logo
      : activeTeam.logoUrl

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          className="cursor-default select-text data-[state=open]:bg-transparent data-[state=open]:text-inherit"
          aria-disabled
        >
          <div className="flex items-center gap-3">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-9 items-center justify-center rounded-full ring-1 ring-[hsl(var(--sidebar-border))] shadow-sm">
              {imgSrc ? (
                <img src={imgSrc} alt={activeTeam.name} className="h-9 w-9 rounded-full object-cover" />
              ) : LogoComp ? (
                <LogoComp className="size-5" />
              ) : null}
            </div>
            <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{activeTeam.name}</span>
              {activeTeam.plan && (
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {activeTeam.plan}
                </span>
              )}
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
