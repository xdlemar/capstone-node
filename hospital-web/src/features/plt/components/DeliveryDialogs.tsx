import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

import { DELIVERY_TRANSITIONS, type DeliveryRecord, type DeliveryStatus, type ProjectRecord } from "@/hooks/usePltData";

const createDeliverySchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  poId: z.string().optional(),
  vendorId: z.string().optional(),
  trackingNo: z.string().optional(),
  eta: z.string().optional(),
  departedAt: z.string().optional(),
  lastKnown: z.string().optional(),
  notes: z.string().optional(),
});

type CreateDeliveryFormValues = z.infer<typeof createDeliverySchema>;

interface CreateDeliveryDialogProps {
  projects: ProjectRecord[];
  trigger: React.ReactNode;
  onCreated?: () => void;
}

export function CreateDeliveryDialog({ projects, trigger, onCreated }: CreateDeliveryDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateDeliveryFormValues>({
    resolver: zodResolver(createDeliverySchema),
    defaultValues: {
      projectId: projects[0]?.id ?? "",
      poId: "",
      vendorId: "",
      trackingNo: "",
      eta: "",
      departedAt: "",
      lastKnown: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateDeliveryFormValues) => {
      const payload: Record<string, unknown> = {
        projectId: values.projectId,
        trackingNo: values.trackingNo || undefined,
        lastKnown: values.lastKnown || undefined,
        notes: values.notes || undefined,
      };
      if (values.poId) payload.poId = values.poId;
      if (values.vendorId) payload.vendorId = values.vendorId;
      if (values.eta) payload.eta = new Date(values.eta).toISOString();
      if (values.departedAt) payload.departedAt = new Date(values.departedAt).toISOString();
      await api.post("/plt/deliveries", payload);
    },
    onSuccess: () => {
      toast({ title: "Delivery scheduled", description: "Delivery record created successfully." });
      qc.invalidateQueries({ queryKey: ["plt", "deliveries"] });
      qc.invalidateQueries({ queryKey: ["plt", "alerts"] });
      qc.invalidateQueries({ queryKey: ["plt", "summary"] });
      setOpen(false);
      form.reset({
        projectId: projects[0]?.id ?? "",
        poId: "",
        vendorId: "",
        trackingNo: "",
        eta: "",
        departedAt: "",
        lastKnown: "",
        notes: "",
      });
      onCreated?.();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create delivery",
        description: err?.response?.data?.error ?? err.message ?? "Unexpected error",
      });
    },
  });

  const projectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, label: `${project.code} · ${project.name}` })),
    [projects]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create delivery</DialogTitle>
          <DialogDescription>Capture dispatch details so the team can track milestones.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="poId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked PO (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="PO numeric id" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor id" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="trackingNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking number</FormLabel>
                    <FormControl>
                      <Input placeholder="Waybill / reference" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastKnown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last known location</FormLabel>
                    <FormControl>
                      <Input placeholder="Hub / in-transit location" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="departedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departed at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ETA</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
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
                    <Textarea rows={3} placeholder="Handling instructions, access, etc." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Create delivery"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const updateStatusSchema = z.object({
  status: z.string().min(1, "Select status") as z.ZodType<DeliveryStatus>,
  message: z.string().optional(),
  place: z.string().optional(),
  occurredAt: z.string().optional(),
  lastKnown: z.string().optional(),
});

type UpdateStatusFormValues = z.infer<typeof updateStatusSchema>;

interface UpdateDeliveryStatusDialogProps {
  delivery: DeliveryRecord;
  trigger: React.ReactNode;
  onUpdated?: () => void;
}

export function UpdateDeliveryStatusDialog({ delivery, trigger, onUpdated }: UpdateDeliveryStatusDialogProps) {
  const allowedStatuses = DELIVERY_TRANSITIONS[delivery.status] ?? [];
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateStatusFormValues>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: allowedStatuses[0] ?? delivery.status,
      message: "",
      place: "",
      occurredAt: "",
      lastKnown: delivery.lastKnown ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: UpdateStatusFormValues) => {
      await api.patch(`/plt/deliveries/${delivery.id}/status`, {
        status: values.status,
        message: values.message || undefined,
        place: values.place || undefined,
        occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : undefined,
        lastKnown: values.lastKnown || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Delivery updated" });
      qc.invalidateQueries({ queryKey: ["plt", "deliveries"] });
      qc.invalidateQueries({ queryKey: ["plt", "alerts"] });
      qc.invalidateQueries({ queryKey: ["plt", "summary"] });
      setOpen(false);
      onUpdated?.();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update delivery",
        description: err?.response?.data?.error ?? err.message ?? "Unexpected error",
      });
    },
  });

  const disabled = allowedStatuses.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update status</DialogTitle>
          <DialogDescription>{delivery.trackingNo || `Delivery ${delivery.id}`}</DialogDescription>
        </DialogHeader>
        {disabled ? (
          <p className="text-sm text-muted-foreground">This delivery is already closed.</p>
        ) : (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowedStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
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
                name="occurredAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occurred at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / checkpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="Distribution hub, facility, etc." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastKnown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Update last known location</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Add context for this milestone" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Updating..." : "Update status"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
