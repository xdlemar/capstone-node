import { useEffect, useMemo, useState } from "react";
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

import type { AssetRecord, MaintenanceType } from "@/hooks/useAlmsData";

const maintenanceSchema = z.object({
  assetId: z.string({ required_error: "Select an asset" }),
  type: z.enum(["PREVENTIVE", "CORRECTIVE", "INSPECTION", "CALIBRATION"], {
    required_error: "Select a maintenance type",
  }),
  scheduledAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema> & {
  woNo?: string;
};

function generateWorkOrderNo(assetCode?: string) {
  const now = new Date();
  const seg = now
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  return `WO-${assetCode ? assetCode.replace(/[^A-Z0-9]+/gi, "").toUpperCase().slice(0, 6) : "GEN"}-${seg}`;
}

const assetSchema = z.object({
  name: z.string().min(2, "Asset name is required"),
  assetCode: z.string().min(2, "Asset code is required"),
  category: z.string().optional(),
  status: z.enum(["ACTIVE", "UNDER_MAINTENANCE", "RETIRED", "DISPOSED"]),
  locationId: z.string().optional(),
  purchaseDate: z.string().optional(),
  acquisitionCost: z.string().optional(),
  warrantyUntil: z.string().optional(),
  serialNo: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface MaintenanceRequestDialogProps {
  assets: AssetRecord[];
  defaultAssetId?: string;
  trigger: React.ReactNode;
  onSubmitted?: () => void;
}

export function MaintenanceRequestDialog({ assets, defaultAssetId, trigger, onSubmitted }: MaintenanceRequestDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      assetId: defaultAssetId ?? assets[0]?.id ?? "",
      type: "CORRECTIVE",
      scheduledAt: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      const payload = {
        woNo: values.woNo && values.woNo.trim().length > 0 ? values.woNo.trim() : generateWorkOrderNo(
          assets.find((asset) => asset.id === values.assetId)?.assetCode
        ),
        assetId: values.assetId,
        type: values.type as MaintenanceType,
        notes: values.notes ?? undefined,
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
      };
      await api.post("/alms/workorders", payload);
    },
    onSuccess: () => {
      toast({ title: "Maintenance request submitted" });
      qc.invalidateQueries({ queryKey: ["alms", "workorders"] });
      setOpen(false);
      form.reset({
        assetId: assets[0]?.id ?? "",
        type: "CORRECTIVE",
        scheduledAt: "",
        notes: "",
      });
      onSubmitted?.();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to submit", description: err?.response?.data?.error ?? err.message });
    },
  });

  const assetOptions = useMemo(() => assets.map((asset) => ({ id: asset.id, label: asset.assetCode })), [assets]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request maintenance</DialogTitle>
          <DialogDescription>Select the asset and maintenance type. Managers will schedule and approve the work order.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetOptions.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.label}
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
                      <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                      <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                      <SelectItem value="INSPECTION">Inspection</SelectItem>
                      <SelectItem value="CALIBRATION">Calibration</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred schedule</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                    <Textarea rows={3} placeholder="Details for the maintenance team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isLoading || assets.length === 0}>
                {mutation.isLoading ? "Submitting..." : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface RegisterAssetDialogProps {
  locations: Array<{ id: string; name: string; kind: string }>;
  onCreated?: () => void;
  disabled?: boolean;
}

export function RegisterAssetDialog({ locations, onCreated, disabled }: RegisterAssetDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      assetCode: "",
      category: "",
      status: "ACTIVE",
      locationId: locations[0]?.id ?? "",
      purchaseDate: "",
      acquisitionCost: "",
      warrantyUntil: "",
      serialNo: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AssetFormValues) => {
      const payload: Record<string, any> = {
        name: values.name.trim(),
        assetCode: values.assetCode.trim(),
        category: values.category?.trim() || null,
        status: values.status,
        locationId: values.locationId ? values.locationId : null,
        serialNo: values.serialNo?.trim() || null,
        notes: values.notes?.trim() || null,
      };
      if (values.purchaseDate) payload.purchaseDate = new Date(values.purchaseDate).toISOString();
      if (values.warrantyUntil) payload.warrantyUntil = new Date(values.warrantyUntil).toISOString();
      if (values.acquisitionCost) payload.acquisitionCost = Number(values.acquisitionCost);
      await api.post("/alms/assets", payload);
    },
    onSuccess: () => {
      toast({ title: "Asset registered" });
      qc.invalidateQueries({ queryKey: ["alms", "assets"] });
      setOpen(false);
      onCreated?.();
      form.reset({
        name: "",
        assetCode: "",
        category: "",
        status: "ACTIVE",
        locationId: locations[0]?.id ?? "",
        purchaseDate: "",
        acquisitionCost: "",
        warrantyUntil: "",
        serialNo: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to register asset", description: err?.response?.data?.error ?? err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Register asset</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register new asset</DialogTitle>
          <DialogDescription>Provide asset details. Asset codes must be unique.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Operating room refrigerator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assetCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MRI-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Imaging" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="UNDER_MAINTENANCE">Under maintenance</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                      <SelectItem value="DISPOSED">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warrantyUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="acquisitionCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition cost</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 150000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serialNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial number</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
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
                    <Textarea rows={3} placeholder="Operational notes or storage info" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading ? "Saving..." : "Save asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}




