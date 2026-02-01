import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { ClipboardList, ClipboardPenLine, Loader2, Package } from "lucide-react";
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
  useInventoryItems,
  useUpsertInventoryItem,
  type InventoryItem,
  type UpsertInventoryItemInput,
} from "@/hooks/useInventoryItems";

const itemSchema = z.object({
  sku: z.string().min(2, "SKU is required"),
  name: z.string().min(2, "Name is required"),
  strength: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  minQty: z.coerce
    .number({ invalid_type_error: "Min level must be a number" })
    .min(0, "Min level cannot be negative"),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

export default function ItemCatalogPage() {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Item catalog</h1>
            <p className="text-muted-foreground max-w-3xl">
              Maintain the master list of SKUs available to requisitions, purchase orders, and inventory controls. Keep
              supplier-friendly names so every department selects the right material.
            </p>
          </div>
        </div>
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
          <li>Enter the supplier SKU exactly as procured to speed up sourcing and receiving.</li>
          <li>Update minimum levels so inventory alerts fire before the stock-out risk.</li>
          <li>Use the edit action to refresh names or units without breaking existing transactions.</li>
        </ul>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <ItemTableCard onEdit={setEditingItem} />
        </div>
        <aside className="space-y-6">
          <ItemFormCard editingItem={editingItem} onDone={() => setEditingItem(null)} />
          <ItemGovernanceCard />
        </aside>
      </div>
    </section>
  );
}

function ItemTableCard({ onEdit }: { onEdit: (item: InventoryItem) => void }) {
  const itemsQuery = useInventoryItems();
  const rows = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Registered items</CardTitle>
          <CardDescription>SKUs available to Procurement and Inventory workflows.</CardDescription>
        </div>
        <Badge variant="secondary" className="w-fit">{rows.length} listed</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemsQuery.isLoading ? (
          <div className="space-y-3">
            {[...Array(4).keys()].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyItemsState />
        ) : (
          <ItemTable rows={rows} onEdit={onEdit} />
        )}
      </CardContent>
    </Card>
  );
}

function ItemTable({ rows, onEdit }: { rows: InventoryItem[]; onEdit: (item: InventoryItem) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="w-[20%]">SKU</TableHead>
            <TableHead className="w-[25%]">Name</TableHead>
            <TableHead className="w-[15%]">Strength</TableHead>
            <TableHead className="w-[10%]">Unit</TableHead>
            <TableHead className="w-[15%]">Min level</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[10%]" aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.sku}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.strength || "-"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase tracking-wide">
                  {item.unit}
                </Badge>
              </TableCell>
              <TableCell>{item.minQty}</TableCell>
              <TableCell>
                <Badge variant={item.isActive ? "secondary" : "destructive"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <ClipboardPenLine className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ItemFormCard({ editingItem, onDone }: { editingItem: InventoryItem | null; onDone: () => void }) {
  const { toast } = useToast();
  const upsertMutation = useUpsertInventoryItem();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { sku: "", name: "", strength: "", unit: "", minQty: 0 },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        sku: editingItem.sku,
        name: editingItem.name,
        strength: editingItem.strength ?? "",
        unit: editingItem.unit,
        minQty: editingItem.minQty,
      });
    }
  }, [editingItem, form]);

  const handleSubmit = async (values: ItemFormValues) => {
    const payload: UpsertInventoryItemInput = {
      sku: values.sku.trim(),
      name: values.name.trim(),
      strength: values.strength?.trim() || null,
      unit: values.unit.trim(),
      minQty: Number(values.minQty) || 0,
    };

    try {
      await upsertMutation.mutateAsync(payload);
      toast({
        title: editingItem ? "Item updated" : "Item added",
        description: `${payload.name} (${payload.sku}) is now in the catalog.`,
      });
      form.reset({ sku: "", name: "", strength: "", unit: "", minQty: 0 });
      onDone();
    } catch (error) {
      const description = isAxiosError(error)
        ? error.response?.data?.error ?? error.message
        : "Unexpected error while saving the item.";
      toast({
        variant: "destructive",
        title: "Could not save item",
        description,
      });
    }
  };

  const isSubmitting = upsertMutation.isPending;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">{editingItem ? "Edit item" : "Add an item"}</CardTitle>
        <CardDescription>
          Provide supplier-friendly details so purchasing and inventory stay in sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. IV-SET-001" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Item name" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="strength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strength</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 250mg / 500mg" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="box, pack, ea" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum level</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              {editingItem ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.reset({ sku: "", name: "", strength: "", unit: "", minQty: 0 });
                    onDone();
                  }}
                >
                  Cancel edit
                </Button>
              ) : (
                <div />
              )}
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </span>
                ) : (
                  editingItem ? "Save changes" : "Add item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ItemGovernanceCard() {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex items-start gap-3">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <CardTitle className="text-lg">Catalog governance</CardTitle>
          <CardDescription>Keep the master list clean for sourcing and analytics.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Audit the list quarterly and archive inactive SKUs by marking them inactive in the database if needed.</p>
        <p>Align with Finance so GL codes map correctly for each item.</p>
        <p>Inform receiving teams when units of measure change so they can update bin labels.</p>
      </CardContent>
    </Card>
  );
}

function EmptyItemsState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Package className="h-9 w-9 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">No items yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first SKU to make it available for purchase requisitions and receiving.
        </p>
      </div>
    </div>
  );
}
