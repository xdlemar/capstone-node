import { useState } from "react";
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
import { WORK_ORDER_TRANSITIONS, type WorkOrderStatus } from "@/hooks/useAlmsData";

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], {
    required_error: "Select a status",
  }),
  technician: z.string().optional(),
  cost: z.string().optional(),
  message: z.string().optional(),
});

type StatusFormValues = z.infer<typeof statusSchema>;

interface WorkOrderStatusDialogProps {
  workOrderId: string;
  workOrderNo: string;
  currentStatus: WorkOrderStatus;
  allowedStatuses: WorkOrderStatus[];
}

export function WorkOrderStatusDialog({ workOrderId, workOrderNo, currentStatus, allowedStatuses }: WorkOrderStatusDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const effectiveAllowed = WORK_ORDER_TRANSITIONS[currentStatus].filter((status) => allowedStatuses.includes(status));

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: effectiveAllowed[0] ?? "SCHEDULED",
      technician: "",
      cost: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: StatusFormValues) => {
      const payload: Record<string, any> = { status: values.status };
      if (values.technician) payload.technician = values.technician;
      if (values.cost) payload.cost = Number(values.cost);
      if (values.message) payload.message = values.message;
      await api.patch(`/alms/workorders/${workOrderId}/status`, payload);
    },
    onSuccess: () => {
      toast({ title: "Work order updated" });
      qc.invalidateQueries({ queryKey: ["alms", "workorders"] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to update", description: err?.response?.data?.error ?? err.message });
    },
  });

  if (effectiveAllowed.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Advance status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update work order</DialogTitle>
          <DialogDescription>Advance WO {workOrderNo}. Only managers and admins can change status.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {effectiveAllowed.map((status) => (
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
              name="technician"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technician</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance cost</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <Textarea rows={3} placeholder="Update for the log" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading ? "Updating..." : "Apply"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


