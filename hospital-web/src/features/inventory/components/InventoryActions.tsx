import { useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useInventoryLookups, type InventoryLookupResponse } from "@/hooks/useInventoryLookups";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const lineSchema = z.object({
  itemId: z.string().min(1, "Select an item"),
  qty: z.coerce.number({ invalid_type_error: "Enter a quantity" }).positive("Qty must be greater than 0"),
  notes: z.string().optional(),
});

const issueSchema = z.object({
  issueNo: z.string().min(3, "Issue number is required"),
  fromLocId: z.string().min(1, "Select a source location"),
  toLocId: z.string().min(1, "Select a destination"),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one line"),
});

const transferSchema = z.object({
  transferNo: z.string().min(3, "Transfer number is required"),
  fromLocId: z.string().min(1, "Select a source location"),
  toLocId: z.string().min(1, "Select a destination"),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one line"),
});

const countSchema = z.object({
  sessionNo: z.string().min(3, "Session number is required"),
  locationId: z.string().min(1, "Select a location"),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      itemId: z.string().min(1, "Select an item"),
      countedQty: z.coerce.number({ invalid_type_error: "Enter a counted qty" }).nonnegative(),
      systemQty: z.coerce.number({ invalid_type_error: "Enter the system qty" }).nonnegative(),
      notes: z.string().optional(),
    })
  ),
});

type IssueValues = z.infer<typeof issueSchema>;
type TransferValues = z.infer<typeof transferSchema>;
type CountValues = z.infer<typeof countSchema>;

function useInventoryData() {
  const query = useInventoryLookups();
  const itemsById = useMemo(() => {
    if (!query.data) return new Map<string, InventoryLookupResponse["items"][number]>();
    return new Map(query.data.items.map((it) => [it.id, it]));
  }, [query.data]);
  const locationsById = useMemo(() => {
    if (!query.data) return new Map<string, InventoryLookupResponse["locations"][number]>();
    return new Map(query.data.locations.map((loc) => [loc.id, loc]));
  }, [query.data]);
  return { ...query, itemsById, locationsById };
}

function LinesTableHeader({ title }: { title: string }) {
  return (
    <div className="grid grid-cols-[1fr,130px,120px] items-center gap-3 text-sm font-medium text-muted-foreground">
      <span>{title}</span>
      <span className="justify-self-center">Qty</span>
      <span className="justify-self-center">Actions</span>
    </div>
  );
}

function LineRow({
  index,
  control,
  remove,
  itemOptions,
  itemHint,
  formType,
}: {
  index: number;
  control: any;
  remove: (index: number) => void;
  itemOptions: InventoryLookupResponse["items"];
  itemHint: (id: string) => React.ReactNode;
  formType: "issue" | "transfer" | "count";
}) {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <FormField
        control={control}
        name={`lines.${index}.itemId`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Item</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {itemOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>{field.value ? itemHint(field.value) : ""}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <FormField
          control={control}
          name={`lines.${index}.${formType === "count" ? "countedQty" : "qty"}` as const}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{formType === "count" ? "Counted qty" : "Quantity"}</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {formType === "count" ? (
          <FormField
            control={control}
            name={`lines.${index}.systemQty`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>System qty</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="hidden md:block" />
        )}
        <FormField
          control={control}
          name={`lines.${index}.notes`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
          <Trash2 className="mr-2 h-4 w-4" /> Remove line
        </Button>
      </div>
    </div>
  );
}

function useLineHelpers(data: ReturnType<typeof useInventoryData>) {
  const formatItem = (id: string) => {
    if (!id) return null;
    const meta = data.itemsById.get(id);
    if (!meta) return null;
    return (
      <span className="text-muted-foreground">
        {meta.unit ? `Unit: ${meta.unit}` : ""}
        {meta.minQty ? ` · Min: ${meta.minQty}` : ""}
      </span>
    );
  };
  return { formatItem };
}

export function IssueFormCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const data = useInventoryData();
  const { formatItem } = useLineHelpers(data);

  const form = useForm<IssueValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      issueNo: `ISS-${Date.now()}`,
      fromLocId: "",
      toLocId: "",
      notes: "",
      lines: [{ itemId: "", qty: 1, notes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const onSubmit = async (values: IssueValues) => {
    try {
      const payload = {
        issueNo: values.issueNo,
        fromLocId: values.fromLocId,
        toLocId: values.toLocId,
        notes: values.notes || undefined,
        lines: values.lines.map((ln) => ({ itemId: ln.itemId, qty: ln.qty, notes: ln.notes || undefined })),
      };
      await api.post("/inventory/issues", payload);
      toast({
        title: "Issue recorded",
        description: `${values.lines.length} line(s) issued successfully`,
      });
      form.reset({
        issueNo: `ISS-${Date.now()}`,
        fromLocId: "",
        toLocId: "",
        notes: "",
        lines: [{ itemId: "", qty: 1, notes: "" }],
      });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to submit issue";
      toast({ title: "Issue failed", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Issue stock</CardTitle>
        <CardDescription>
          Raise an issue ticket from a storeroom to a requesting location. FEFO allocations are handled automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items and locations...
          </div>
        ) : data.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load inventory lookups. Check your permissions or try again.</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issueNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue number</FormLabel>
                      <FormControl>
                        <Input placeholder="ISS-001" {...field} />
                      </FormControl>
                      <FormDescription>Reference shared with the requesting unit.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Urgent: ER restock" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fromLocId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Main warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.data?.locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} · {loc.kind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toLocId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Receiving location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.data?.locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} · {loc.kind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Lines</Label>
                <LinesTableHeader title="Item" />
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <LineRow
                      key={(field as any).id ?? index}
                      index={index}
                      control={form.control}
                      remove={remove}
                      itemOptions={data.data?.items ?? []}
                      itemHint={formatItem}
                      formType="issue"
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ itemId: "", qty: 1, notes: "" } as any)}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add another line
                </Button>
              </div>

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post issue
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

export function TransferFormCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const data = useInventoryData();
  const { formatItem } = useLineHelpers(data);

  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transferNo: `XFER-${Date.now()}`,
      fromLocId: "",
      toLocId: "",
      notes: "",
      lines: [{ itemId: "", qty: 1, notes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const onSubmit = async (values: TransferValues) => {
    try {
      const payload = {
        transferNo: values.transferNo,
        fromLocId: values.fromLocId,
        toLocId: values.toLocId,
        notes: values.notes || undefined,
        lines: values.lines.map((ln) => ({ itemId: ln.itemId, qty: ln.qty, notes: ln.notes || undefined })),
      };
      await api.post("/inventory/transfers", payload);
      toast({ title: "Transfer queued", description: `${values.lines.length} line(s) in transfer ${values.transferNo}` });
      form.reset({
        transferNo: `XFER-${Date.now()}`,
        fromLocId: "",
        toLocId: "",
        notes: "",
        lines: [{ itemId: "", qty: 1, notes: "" }],
      });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to record transfer";
      toast({ title: "Transfer failed", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Transfer stock</CardTitle>
        <CardDescription>
          Schedule an inter-location transfer. Remainders trigger a FEFO stock-out warning if insufficient inventory exists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items and locations...
          </div>
        ) : data.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load inventory lookups. Check your permissions or try again.</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="transferNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer number</FormLabel>
                      <FormControl>
                        <Input placeholder="XFER-001" {...field} />
                      </FormControl>
                      <FormDescription>Visible on transfer paperwork.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Move to dialysis storage" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fromLocId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.data?.locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} · {loc.kind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toLocId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.data?.locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} · {loc.kind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Lines</Label>
                <LinesTableHeader title="Item" />
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <LineRow
                      key={(field as any).id ?? index}
                      index={index}
                      control={form.control}
                      remove={remove}
                      itemOptions={data.data?.items ?? []}
                      itemHint={formatItem}
                      formType="transfer"
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ itemId: "", qty: 1, notes: "" } as any)}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add another line
                </Button>
              </div>

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Schedule transfer
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

export function CountFormCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const data = useInventoryData();
  const { formatItem } = useLineHelpers(data);

  const form = useForm<CountValues>({
    resolver: zodResolver(countSchema),
    defaultValues: {
      sessionNo: `CNT-${Date.now()}`,
      locationId: "",
      notes: "",
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const onSubmit = async (values: CountValues) => {
    try {
      const payload = {
        sessionNo: values.sessionNo,
        locationId: values.locationId,
        notes: values.notes || undefined,
        lines: values.lines.map((ln) => ({
          itemId: ln.itemId,
          countedQty: ln.countedQty,
          systemQty: ln.systemQty,
          variance: Number(ln.countedQty) - Number(ln.systemQty),
          notes: ln.notes || undefined,
        })),
      };
      await api.post("/inventory/counts", payload);
      toast({ title: "Count session created", description: `${values.lines.length} lines captured for reconciliation.` });
      form.reset({ sessionNo: `CNT-${Date.now()}`, locationId: "", notes: "", lines: [] });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to create cycle count";
      toast({ title: "Count failed", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Start a cycle count</CardTitle>
        <CardDescription>Use this when reconciling physical counts against system balances.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items and locations...
          </div>
        ) : data.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load inventory lookups. Check your permissions or try again.</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sessionNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session number</FormLabel>
                      <FormControl>
                        <Input placeholder="CNT-001" {...field} />
                      </FormControl>
                      <FormDescription>Used for posting adjustments later.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {data.data?.locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name} · {loc.kind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Cycle count for ICU shelves" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Lines</Label>
                  <Button type="button" variant="outline" onClick={() => append({ itemId: "", countedQty: 0, systemQty: 0, notes: "" } as any)}>
                    <Plus className="mr-2 h-4 w-4" /> Add line
                  </Button>
                </div>
                {fields.length === 0 && <p className="text-sm text-muted-foreground">Add items you’ve counted to capture variances.</p>}
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <LineRow
                      key={(field as any).id ?? index}
                      index={index}
                      control={form.control}
                      remove={remove}
                      itemOptions={data.data?.items ?? []}
                      itemHint={formatItem}
                      formType="count"
                    />
                  ))}
                </div>
              </div>

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create session
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
















