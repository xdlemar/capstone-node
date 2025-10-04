import { isAxiosError } from "axios";
import { ClipboardList, Loader2, MapPin, Warehouse } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateInventoryLocation,
  useInventoryLocations,
  type CreateInventoryLocationInput
} from "@/hooks/useInventoryLocations";
import { cn } from "@/lib/utils";

const KIND_PRESETS = [
  "WAREHOUSE",
  "MAIN STORE",
  "STOREROOM",
  "EMERGENCY",
  "OPERATING ROOM",
  "CLINIC",
  "LAB",
  "PHARMACY",
  "STERILE",
  "COLD ROOM",
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const storageAreaSchema = z.object({
  name: z.string().min(2, "Storage name is required"),
  kind: z.string().min(2, "Classification is required"),
});

type StorageAreaFormValues = z.infer<typeof storageAreaSchema>;

export default function StorageAreasPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <Warehouse className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Storage areas</h1>
            <p className="text-muted-foreground max-w-3xl">
              Maintain logistics locations used across Inventory, Procurement, and Asset workflows. Consistent storage
              names keep every request, transfer, and alert aligned to the same reference list.
            </p>
          </div>
        </div>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
          <li>Use human-friendly names that match signage on the floor so staff recognise them instantly.</li>
          <li>Classify each area to support reporting and routing (e.g. Warehouse, Operating Room, Pharmacy).</li>
          <li>Once added, storage areas automatically appear in dropdowns for stock issues, transfers, and counts.</li>
        </ul>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <StorageAreaTableCard />
        </div>
        <aside className="space-y-6">
          <StorageAreaFormCard />
          <StorageAreaTipsCard />
        </aside>
      </div>
    </section>
  );
}

function StorageAreaTableCard() {
  const locations = useInventoryLocations();
  const total = locations.data?.length ?? 0;

  const rows = useMemo(() => {
    return (locations.data ?? []).map((loc) => ({
      ...loc,
      createdLabel: dateFormatter.format(new Date(loc.createdAt)),
      updatedLabel: dateFormatter.format(new Date(loc.updatedAt)),
    }));
  }, [locations.data]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Registered storage areas</CardTitle>
          <CardDescription>All active locations available to downstream workflows.</CardDescription>
        </div>
        <Badge variant="secondary" className="w-fit">{total} active</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {locations.isLoading ? (
          <div className="space-y-3">
            {[...Array(4).keys()].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead className="w-[20%]">Classification</TableHead>
                  <TableHead className="w-[20%]">Created</TableHead>
                  <TableHead className="w-[20%]">Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase tracking-wide">
                        {loc.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{loc.createdLabel}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{loc.updatedLabel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StorageAreaFormCard() {
  const { toast } = useToast();
  const createLocation = useCreateInventoryLocation();
  const form = useForm<StorageAreaFormValues>({
    resolver: zodResolver(storageAreaSchema),
    defaultValues: { name: "", kind: "" },
  });

  const onSubmit = async (values: StorageAreaFormValues) => {
    const payload: CreateInventoryLocationInput = {
      name: values.name.trim(),
      kind: values.kind.trim(),
    };

    try {
      await createLocation.mutateAsync(payload);
      toast({
        title: "Storage area added",
        description: `${payload.name} is now available across inventory workflows.`,
      });
      form.reset({ name: "", kind: "" });
    } catch (err) {
      const description = isAxiosError(err)
        ? err.response?.data?.error ?? err.message
        : "Unexpected error while saving the storage area.";
      toast({
        variant: "destructive",
        title: "Could not add storage area",
        description,
      });
    }
  };

  const isSubmitting = createLocation.isPending;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">Add a storage area</CardTitle>
        <CardDescription>
          Create controlled locations used when issuing stock, reconciling counts, or routing deliveries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main warehouse" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Warehouse, ER, Pharmacy" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                  <PresetKindPills onSelect={(value) => form.setValue("kind", value)} selected={field.value} />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </span>
                ) : (
                  "Save storage area"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PresetKindPills({
  onSelect,
  selected,
}: {
  onSelect: (value: string) => void;
  selected: string;
}) {
  if (!KIND_PRESETS.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Quick tags</p>
      <div className="flex flex-wrap gap-2">
        {KIND_PRESETS.map((preset) => {
          const isActive = selected?.toLowerCase() === preset.toLowerCase();
          return (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={isActive ? "default" : "secondary"}
              className={cn("rounded-full", isActive ? "" : "bg-secondary/70")}
              onClick={() => onSelect(preset)}
            >
              {preset}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function StorageAreaTipsCard() {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <CardTitle className="text-lg">Governance checklist</CardTitle>
          <CardDescription>Keep the master list accurate for downstream integrations.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Review storage names each quarter and retire areas no longer in use.</p>
        <p>Match names with facilities signage so floor teams select the right location.</p>
        <p>Coordinate with Biomedical and Facilities when new areas open to avoid duplicate entries.</p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <MapPin className="h-9 w-9 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">No storage areas yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first location to unlock inventory transfers, cycle counts, and replenishment alerts.
        </p>
      </div>
    </div>
  );
}