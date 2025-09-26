import { CheckCircle2, ClipboardList, FileCheck2, Inbox, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "requisition" as const,
    title: "Create purchase requisition",
    description: "List the exact medical supplies and quantities the ward needs.",
    icon: ClipboardList,
  },
  {
    key: "approval" as const,
    title: "Manager approval",
    description: "Supervisors validate demand, budget, and preferred suppliers.",
    icon: CheckCircle2,
  },
  {
    key: "purchase-order" as const,
    title: "Issue purchase order",
    description: "Convert the approved request into a supplier-facing order.",
    icon: ScrollText,
  },
  {
    key: "receiving" as const,
    title: "Receive delivery",
    description: "Log DR/Invoice details and hand-off to inventory for put-away.",
    icon: Inbox,
  },
  {
    key: "documents" as const,
    title: "Document archive",
    description: "Attach supporting docs for audit readiness (handled in DTRS).",
    icon: FileCheck2,
  },
];

export type ProcurementStepKey = typeof STEPS[number]["key"];

export function ProcurementFlowGuide({ current }: { current: ProcurementStepKey }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="mb-4 text-sm font-medium text-primary">Procurement flow</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {STEPS.map((step, index) => {
          const isActive = step.key === current;
          return (
            <div
              key={step.key}
              className={cn(
                "flex h-full flex-col gap-2 rounded-md border bg-background p-4 text-sm",
                isActive ? "border-primary shadow-sm" : "border-border/60 text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <step.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>{step.title}</span>
              </div>
              <p className="text-xs leading-relaxed">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
