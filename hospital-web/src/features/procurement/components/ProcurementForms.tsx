import { useMemo, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useInventoryLookups, type InventoryLookupResponse } from "@/hooks/useInventoryLookups";
import { useProcurementLookups } from "@/hooks/useProcurementLookups";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const prLineSchema = z.object({
  itemId: z.string().min(1, "Select an item"),
  qty: z.coerce.number({ invalid_type_error: "Enter quantity" }).positive("Quantity must be greater than zero"),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});

const prSchema = z.object({
  prNo: z.string().min(3, "PR number is required"),
  notes: z.string().optional(),
  lines: z.array(prLineSchema).min(1, "Add at least one line"),
});

type PrValues = z.infer<typeof prSchema>;

const receiptSchema = z.object({
  poNo: z.string().min(3, "PO number is required"),
  drNo: z.string().optional(),
  invoiceNo: z.string().optional(),
});

type ReceiptValues = z.infer<typeof receiptSchema>;

const approveSchema = z.object({
  prNo: z.string().min(1, "Select a PR"),
  action: z.enum(["approve", "reject"], { required_error: "Choose a decision" }),
});

type ApproveValues = z.infer<typeof approveSchema>;

const poSchema = z.object({
  prNo: z.string().min(1, "Select an approved PR"),
  poNo: z.string().min(3, "PO number is required"),
});

type PoValues = z.infer<typeof poSchema>;

const vendorSchema = z.object({
  name: z.string().min(3, "Vendor name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type VendorValues = z.infer<typeof vendorSchema>;

function useItemFormatter() {
  const inv = useInventoryLookups();
  const itemMap = useMemo(() => {
    if (!inv.data) return new Map<string, InventoryLookupResponse["items"][number]>();
    return new Map(inv.data.items.map((item) => [item.id, item]));
  }, [inv.data]);

  const options = inv.data?.items ?? [];
  const format = (id: string) => {
    const item = itemMap.get(id);
    if (!item) return null;
    return `${item.name} - ${item.sku}`;
  };

  return { options, format, query: inv, map: itemMap };
}

function PrLineRow({
  index,
  control,
  remove,
  items,
}: {
  index: number;
  control: any;
  remove: (index: number) => void;
  items: ReturnType<typeof useItemFormatter>["options"];
}) {
  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_160px]">
        <FormField
          control={control}
          name={`lines.${index}.itemId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="bg-background h-auto min-h-[3rem] items-start py-2 text-left">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`lines.${index}.qty`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`lines.${index}.unit`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input placeholder="box, pack, ea" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name={`lines.${index}.notes`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Input placeholder="Optional line notes" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
          <Trash2 className="mr-2 h-4 w-4" /> Remove line
        </Button>
      </div>
    </div>
  );
}

export function PurchaseRequestCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const { options, query } = useItemFormatter();

  const form = useForm<PrValues>({
    resolver: zodResolver(prSchema),
    defaultValues: {
      prNo: `PR-${Date.now()}`,
      notes: "",
      lines: [{ itemId: "", qty: 1, unit: "box", notes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const onSubmit = async (values: PrValues) => {
    try {
      const payload = {
        prNo: values.prNo,
        notes: values.notes || undefined,
        lines: values.lines.map((line) => ({
          itemId: line.itemId,
          qty: line.qty,
          unit: line.unit,
          notes: line.notes || undefined,
        })),
      };
      await api.post("/procurement/pr", payload);
      toast({ title: "Requisition submitted", description: `${values.lines.length} line(s) captured under ${values.prNo}.` });
      form.reset({ prNo: `PR-${Date.now()}`, notes: "", lines: [{ itemId: "", qty: 1, unit: "box", notes: "" }] });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to submit requisition";
      toast({ title: "Requisition failed", description: message, variant: "destructive" });
    }
  };



  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Create purchase requisition</CardTitle>
        <CardDescription>Create a detailed request for supplies. The approval team will review item names, quantities, and units before sourcing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items...
          </div>
        ) : query.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load item master data. Try again or contact an administrator.</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="prNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase requisition number (PR No.)</FormLabel>
                      <FormControl>
                        <Input placeholder="PR-0001" {...field} />
                      </FormControl>
                      <FormDescription>Use consistent numbering for audit traceability.</FormDescription>
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
                        <Input placeholder="Urgent resupply for ER" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Lines</Label>
                <div className="space-y-3">
                  {fields.map((_, index) => (
                    <PrLineRow key={index} index={index} control={form.control} remove={remove} items={options} />
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={() => append({ itemId: "", qty: 1, unit: "box", notes: "" } as any)}>
                  <Plus className="mr-2 h-4 w-4" /> Add line
                </Button>
              </div>

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit requisition
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

export function ReceiptCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const lookups = useProcurementLookups();
  const queryClient = useQueryClient();
  const { map: itemMap, query: inventoryQuery } = useItemFormatter();
  const [hiddenPoNos, setHiddenPoNos] = useState<Set<string>>(() => new Set());
  const form = useForm<ReceiptValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { poNo: "", drNo: "", invoiceNo: "" },
  });

  const onSubmit = async (values: ReceiptValues) => {
    try {
      await api.post("/procurement/receipts", {
        poNo: values.poNo,
        drNo: values.drNo || undefined,
        invoiceNo: values.invoiceNo || undefined,
      });
      toast({ title: "Delivery receipt logged", description: `Receipt recorded for purchase order ${values.poNo}.` });
      form.reset({ poNo: "", drNo: "", invoiceNo: "" });
      setHiddenPoNos((prev) => {
        const next = new Set(prev);
        next.add(values.poNo);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["procurement", "lookups"] });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to record receipt";
      toast({ title: "Delivery receipt failed", description: message, variant: "destructive" });
    }
  };

  const safeLines = (lines?: Array<{ itemId: string; qty: number; unit: string; notes?: string | null }>) => lines ?? [];
  const rawOpenPos = lookups.data?.openPos ?? [];
  const openPos = useMemo(() => {
    if (!hiddenPoNos.size) return rawOpenPos;
    return rawOpenPos.filter((po) => !hiddenPoNos.has(po.poNo));
  }, [rawOpenPos, hiddenPoNos]);
  const selectedPoNo = form.watch("poNo");
  const selectedPo = openPos.find((po) => po.poNo === selectedPoNo);

  const renderLineLabel = (line: { itemId: string; qty: number; unit: string; notes?: string | null }) => {
    const item = itemMap.get(line.itemId);
    return item ? `${item.name} (${item.sku})` : `Item #${line.itemId}`;
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Log delivery receipt</CardTitle>
        <CardDescription>Capture delivery receipt and invoice references so inventory and vendor KPIs stay current.</CardDescription>
      </CardHeader>
      <CardContent>
        {lookups.isLoading || inventoryQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading open purchase orders...
          </div>
        ) : lookups.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load open purchase orders. Try again shortly.</AlertDescription>
          </Alert>
        ) : openPos.length === 0 ? (
          <Alert>
            <AlertTitle>No open purchase orders</AlertTitle>
            <AlertDescription>Create or reopen a purchase order before recording receipts.</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="poNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase order</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background h-auto min-h-[3rem] items-start py-2 text-left">
                          <SelectValue placeholder="Select purchase order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {openPos.map((po) => {
                          const lines = safeLines(po.lines);
                          const totalQty = lines.reduce((sum, line) => sum + (line?.qty ?? 0), 0);
                          return (
                            <SelectItem key={po.id} value={po.poNo}>
                              <div className="flex flex-col text-left">
                                <span className="font-medium">{po.poNo}</span>
                                <span className="text-xs text-muted-foreground">
                                  {(po.vendorName ?? "Vendor pending")} {lines.length} line(s) {totalQty} units
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>Only open purchase orders appear here.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="drNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery receipt number</FormLabel>
                      <FormControl>
                        <Input placeholder="DR-123" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice number</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-456" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {selectedPo ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">Open PO line items</h3>
                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24 text-right">Quantity</TableHead>
                        <TableHead className="w-24">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeLines(selectedPo.lines).map((line, index) => (
                        <TableRow key={`${line.itemId}-${index}`}>
                          <TableCell>{renderLineLabel(line)}</TableCell>
                          <TableCell className="text-right">{line.qty}</TableCell>
                          <TableCell>{line.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record receipt
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}export function ApprovePrCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const lookups = useProcurementLookups();
  const { map: itemMap, query: inventoryQuery } = useItemFormatter();
  const form = useForm<ApproveValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: { prNo: "", action: "approve" },
  });

  const submittedPrs = lookups.data?.submittedPrs ?? [];
  const selectedPrNo = form.watch("prNo");
  const selectedAction = form.watch("action") ?? "approve";
  const selectedPr = submittedPrs.find((pr) => pr.prNo === selectedPrNo);
  const safeLines = (lines?: Array<{ itemId: string; qty: number; unit: string; notes?: string | null }>) => lines ?? [];

  const onSubmit = async (values: ApproveValues) => {
    const isApprove = values.action === "approve";
    const endpoint = isApprove ? "approve" : "reject";
    const successTitle = isApprove ? "Requisition approved" : "Requisition rejected";
    const successDescription = isApprove
      ? `Requisition ${values.prNo} is now APPROVED.`
      : `Requisition ${values.prNo} is now REJECTED.`;
    const failureTitle = isApprove ? "Approval failed" : "Rejection failed";
    const defaultFailureMessage = isApprove ? "Approval failed" : "Rejection failed";

    try {
      await api.post(`/procurement/pr/${encodeURIComponent(values.prNo)}/${endpoint}`);
      toast({ title: successTitle, description: successDescription });
      form.reset({ prNo: "", action: "approve" });
      lookups.refetch();
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || defaultFailureMessage;
      toast({ title: failureTitle, description: message, variant: "destructive" });
    }
  };

  const renderLineLabel = (line: { itemId: string; qty: number; unit: string; notes?: string | null }) => {
    const item = itemMap.get(line.itemId);
    return item ? `${item.name} (${item.sku})` : `Item #${line.itemId}`;
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Approve purchase requisition</CardTitle>
        <CardDescription>Choose a submitted requisition to authorize sourcing.</CardDescription>
      </CardHeader>
      <CardContent>
        {lookups.isLoading || inventoryQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading submitted PRs...
          </div>
        ) : lookups.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load submitted PRs. Try again shortly.</AlertDescription>
          </Alert>
        ) : submittedPrs.length ? (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="prNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase requisition</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background h-auto min-h-[3rem] items-start py-2 text-left">
                          <SelectValue placeholder="Select PR" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {submittedPrs.map((pr) => {
                          const lines = safeLines(pr.lines);
                          const totalQty = lines.reduce((sum, line) => sum + (line?.qty ?? 0), 0);
                          return (
                            <SelectItem key={pr.id} value={pr.prNo}>
                              <div className="space-y-1 text-left">
                                <span className="font-medium">{pr.prNo}</span>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span>{lines.length} line(s)</span>
                                  <span>{totalQty} units</span>
                                  {pr.createdAt ? <span>{new Date(pr.createdAt).toLocaleDateString()}</span> : null}
                                </div>
                                {pr.notes ? (
                                  <span className="block text-xs text-muted-foreground">Note: {pr.notes}</span>
                                ) : null}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedPr ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">Line details</h3>
                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24 text-right">Quantity</TableHead>
                        <TableHead className="w-24">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeLines(selectedPr.lines).map((line, index) => (
                        <TableRow key={`${line.itemId}-${index}`}>
                          <TableCell>{renderLineLabel(line)}</TableCell>
                          <TableCell className="text-right">{line.qty}</TableCell>
                          <TableCell>{line.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              <CardFooter className="px-0 pt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  disabled={form.formState.isSubmitting}
                  onClick={() => {
                    form.setValue("action", "approve");
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  {form.formState.isSubmitting && selectedAction === "approve" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Approve requisition
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={form.formState.isSubmitting}
                  onClick={() => {
                    form.setValue("action", "reject");
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  {form.formState.isSubmitting && selectedAction === "reject" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject requisition
                </Button>
              </CardFooter>
            </form>
          </Form>
        ) : (
          <Alert>
            <AlertTitle>No submitted PRs</AlertTitle>
            <AlertDescription>All requisitions are either approved or none have been created yet.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function CreatePoCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const lookups = useProcurementLookups();
  const queryClient = useQueryClient();
  const { map: itemMap, query: inventoryQuery } = useItemFormatter();
  const [hiddenPrNos, setHiddenPrNos] = useState<Set<string>>(() => new Set());
  const form = useForm<PoValues>({
    resolver: zodResolver(poSchema),
    defaultValues: { prNo: "", poNo: `PO-${Date.now()}` },
  });

  const rawApproved = lookups.data?.approvedPrs ?? [];
  const approved = useMemo(() => {
    if (!hiddenPrNos.size) return rawApproved;
    return rawApproved.filter((pr) => !hiddenPrNos.has(pr.prNo));
  }, [rawApproved, hiddenPrNos]);
  const selectedPrNo = form.watch("prNo");
  const selectedPr = approved.find((pr) => pr.prNo === selectedPrNo);
  const safeLines = (lines?: Array<{ itemId: string; qty: number; unit: string; notes?: string | null }>) => lines ?? [];

  const onSubmit = async (values: PoValues) => {
    try {
      await api.post("/procurement/po", { prNo: values.prNo, poNo: values.poNo });
      toast({ title: "Purchase order created", description: `Purchase order ${values.poNo} linked to requisition ${values.prNo}.` });
      form.reset({ prNo: "", poNo: `PO-${Date.now()}` });
      setHiddenPrNos((prev) => {
        const next = new Set(prev);
        next.add(values.prNo);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["procurement", "lookups"] });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to create purchase order";
      toast({ title: "Purchase order failed", description: message, variant: "destructive" });
    }
  };

  const renderLineLabel = (line: { itemId: string; qty: number; unit: string; notes?: string | null }) => {
    const item = itemMap.get(line.itemId);
    return item ? `${item.name} (${item.sku})` : `Item #${line.itemId}`;
  };

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Issue purchase order</CardTitle>
        <CardDescription>Turn an approved requisition into a purchase order using plain-language lists of recent approvals.</CardDescription>
      </CardHeader>
      <CardContent>
        {lookups.isLoading || inventoryQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading approved PRs...
          </div>
        ) : lookups.error ? (
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load approved PRs. Try again shortly.</AlertDescription>
          </Alert>
        ) : approved.length ? (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="prNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select approved requisition</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background h-auto min-h-[3rem] items-start py-2 text-left">
                          <SelectValue placeholder="Select approved PR" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approved.map((pr) => {
                          const lines = safeLines(pr.lines);
                          const totalQty = lines.reduce((sum, line) => sum + (line?.qty ?? 0), 0);
                          return (
                            <SelectItem key={pr.id} value={pr.prNo}>
                              <div className="space-y-1 text-left">
                                <span className="font-medium">{pr.prNo}</span>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span>{lines.length} line(s)</span>
                                  <span>{totalQty} units</span>
                                  {pr.notes ? <span className="truncate">Note: {pr.notes}</span> : null}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="poNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase order number (PO No.)</FormLabel>
                    <FormControl>
                      <Input placeholder="PO-0001" {...field} />
                    </FormControl>
                    <FormDescription>If blank, we generate a timestamp-based number for you.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPr ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold">Requisition details</h3>
                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24 text-right">Quantity</TableHead>
                        <TableHead className="w-24">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeLines(selectedPr.lines).map((line, index) => (
                        <TableRow key={`${line.itemId}-${index}`}>
                          <TableCell>{renderLineLabel(line)}</TableCell>
                          <TableCell className="text-right">{line.qty}</TableCell>
                          <TableCell>{line.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create purchase order
                </Button>
              </CardFooter>
            </form>
          </Form>
        ) : (
          <Alert>
            <AlertTitle>No approved PRs</AlertTitle>
            <AlertDescription>Approve a requisition before opening a PO.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}export function VendorUpsertCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const lookups = useProcurementLookups();
  const form = useForm<VendorValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: "", email: "", phone: "", address: "" },
  });

  const onSubmit = async (values: VendorValues) => {
    try {
      await api.post("/procurement/vendors", {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
      });
      toast({ title: "Vendor saved", description: `${values.name} is now available for sourcing.` });
      form.reset({ name: "", email: "", phone: "", address: "" });
      lookups.refetch();
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to save vendor";
      toast({ title: "Vendor save failed", description: message, variant: "destructive" });
    }
  };



  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Vendor master data</CardTitle>
        <CardDescription>Create or update vendor contact information.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor name</FormLabel>
                  <FormControl>
                    <Input placeholder="MedSupply Co." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="sales@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Supply Ave, Logistics City" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <CardFooter className="px-0 pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save vendor
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function VendorPerformanceTable({ className }: { className?: string }) {
  const lookups = useProcurementLookups();

  if (lookups.isLoading) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader>
          <CardTitle>Vendor performance</CardTitle>
          <CardDescription>Evaluations based on recent receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Refreshing metrics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lookups.error) {
    return (
      <Card className={cn("border-border/60", className)}>
        <CardHeader>
          <CardTitle>Vendor performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Lookup failed</AlertTitle>
            <AlertDescription>Unable to load vendor metrics.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle>Vendor performance</CardTitle>
        <CardDescription>Latest metrics from scheduled vendor KPI jobs.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>On-time %</TableHead>
              <TableHead>Lead time (days)</TableHead>
              <TableHead>Fulfillment %</TableHead>
              <TableHead>Total spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lookups.data?.vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>{vendor.metrics?.onTimePercentage ?? "-"}</TableCell>
                <TableCell>{vendor.metrics?.avgLeadTimeDays ?? "-"}</TableCell>
                <TableCell>{vendor.metrics?.fulfillmentRate ?? "-"}</TableCell>
                <TableCell>
                  {vendor.metrics ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(vendor.metrics.totalSpend) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}







































