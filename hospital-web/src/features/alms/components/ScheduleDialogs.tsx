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

import type { AssetRecord, MaintenanceType, ScheduleRecord } from "@/hooks/useAlmsData";

const scheduleSchema = z.object({
  assetId: z.string({ required_error: "Select equipment" }),
  type: z.enum(["PREVENTIVE", "CORRECTIVE", "INSPECTION", "CALIBRATION"], {
    required_error: "Select a maintenance type",
  }),
  intervalDays: z.string().optional(),
  nextDue: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleDialogProps {
  assets: AssetRecord[];
  trigger: React.ReactNode;
  onSaved?: () => void;
}

export function AddScheduleDialog({ assets, trigger, onSaved }: ScheduleDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      assetId: assets[0]?.id ?? "",
      type: "PREVENTIVE",
      intervalDays: "90",
      nextDue: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      const payload: Record<string, any> = {
        assetId: values.assetId,
        type: values.type as MaintenanceType,
        intervalDays: values.intervalDays ? Number(values.intervalDays) : null,
        notes: values.notes ?? null,
      };
      if (values.nextDue) payload.nextDue = new Date(values.nextDue).toISOString();
      await api.post("/alms/schedules", payload);
    },
    onSuccess: () => {
      toast({ title: "Schedule saved" });
      qc.invalidateQueries({ queryKey: ["alms", "schedules"] });
      setOpen(false);
      onSaved?.();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to save", description: err?.response?.data?.error ?? err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create maintenance schedule</DialogTitle>
          <DialogDescription>Define a preventive or inspection cycle for equipment.</DialogDescription>
        </DialogHeader>
        <ScheduleForm assets={assets} form={form} onSubmit={(values) => mutation.mutate(values)} submitting={mutation.isPending} />
      </DialogContent>
    </Dialog>
  );
}

interface EditScheduleDialogProps {
  assets: AssetRecord[];
  schedule: ScheduleRecord;
  trigger: React.ReactNode;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export function EditScheduleDialog({ assets, schedule, trigger, onSaved, onDeleted }: EditScheduleDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      assetId: schedule.assetId,
      type: schedule.type,
      intervalDays: schedule.intervalDays ? String(schedule.intervalDays) : "",
      nextDue: schedule.nextDue ? schedule.nextDue.slice(0, 10) : "",
      notes: schedule.notes ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      const payload: Record<string, any> = {
        type: values.type as MaintenanceType,
        intervalDays: values.intervalDays ? Number(values.intervalDays) : null,
        notes: values.notes ?? null,
      };
      if (values.nextDue) payload.nextDue = new Date(values.nextDue).toISOString();
      await api.put(`/alms/schedules/${schedule.id}`, payload);
      if (values.assetId !== schedule.assetId) {
        await api.delete(`/alms/schedules/${schedule.id}`);
        await api.post("/alms/schedules", {
          assetId: values.assetId,
          type: values.type,
          intervalDays: values.intervalDays ? Number(values.intervalDays) : null,
          nextDue: values.nextDue ? new Date(values.nextDue).toISOString() : undefined,
          notes: values.notes ?? null,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Schedule updated" });
      qc.invalidateQueries({ queryKey: ["alms", "schedules"] });
      setOpen(false);
      onSaved?.();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to update", description: err?.response?.data?.error ?? err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/alms/schedules/${schedule.id}`);
    },
    onSuccess: () => {
      toast({ title: "Schedule removed" });
      qc.invalidateQueries({ queryKey: ["alms", "schedules"] });
      setOpen(false);
      onDeleted?.();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to remove", description: err?.response?.data?.error ?? err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit schedule</DialogTitle>
          <DialogDescription>Adjust due dates or intervals.</DialogDescription>
        </DialogHeader>
        <ScheduleForm
          assets={assets}
          form={form}
          onSubmit={(values) => updateMutation.mutate(values)}
          submitting={updateMutation.isPending}
          allowAssetChange={false}
          extraFooter={
            <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}

interface ScheduleFormProps {
  assets: AssetRecord[];
  form: ReturnType<typeof useForm<ScheduleFormValues>>;
  onSubmit: (values: ScheduleFormValues) => void;
  submitting: boolean;
  allowAssetChange?: boolean;
  extraFooter?: React.ReactNode;
}

function ScheduleForm({ assets, form, onSubmit, submitting, allowAssetChange = true, extraFooter }: ScheduleFormProps) {
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {allowAssetChange ? (
          <FormField
            control={form.control}
            name="assetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {`${asset.name} (${asset.assetCode})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maintenance type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="INSPECTION">Inspection</SelectItem>
                  <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                  <SelectItem value="CALIBRATION">Calibration</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intervalDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interval (days)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="e.g., 90" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nextDue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next due date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
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
                <Textarea rows={3} placeholder="Instructions for technicians" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="flex gap-2">
          {extraFooter}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}




