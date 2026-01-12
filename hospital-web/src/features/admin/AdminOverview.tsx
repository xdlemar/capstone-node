import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser, CreateAdminUserPayload, UpdateAdminUserPayload } from "@/hooks/useAdminUsers";
import { useAdminUsers, useCreateAdminUser, useDisableAdminUser, useUpdateAdminUser } from "@/hooks/useAdminUsers";
import { useProcurementVendors, useVendorLinks, type VendorSummary } from "@/hooks/useVendorAdmin";
import { api } from "@/lib/api";

const ROLE_OPTIONS = ["STAFF", "MANAGER", "ADMIN", "VENDOR"] as const;
const RoleEnum = z.enum(ROLE_OPTIONS);

const CreateUserSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roles: z.array(RoleEnum).min(1, "Assign at least one role"),
  isActive: z.boolean().default(true),
});

type CreateUserFormValues = z.infer<typeof CreateUserSchema>;

const EditUserSchema = z.object({
  name: z.string().min(2, "Name required"),
  roles: z.array(RoleEnum).min(1, "Assign at least one role"),
  isActive: z.boolean(),
  password: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof EditUserSchema>;

export default function AdminOverview() {
  const { toast } = useToast();
  const usersQuery = useAdminUsers();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const disableUser = useDisableAdminUser();
  const vendorsQuery = useProcurementVendors();

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedVendorUserId, setSelectedVendorUserId] = useState("");
  const [cleanupInput, setCleanupInput] = useState("");

  const vendorLinksQuery = useVendorLinks(selectedVendorId);
  const qc = useQueryClient();

  const linkVendorUser = useMutation({
    mutationFn: async ({ vendorId, userId }: { vendorId: string; userId: string }) => {
      await api.post(`/procurement/vendors/${vendorId}/users`, { userId });
      await api.post("/plt/vendor-users", { vendorId, userId });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["vendor", "links", variables.vendorId] });
      toast({ title: "Vendor linked", description: "User access granted for orders and shipments." });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to link vendor user";
      toast({ title: "Link failed", description: message, variant: "destructive" });
    },
  });

  const unlinkVendorUser = useMutation({
    mutationFn: async ({ vendorId, userId }: { vendorId: string; userId: string }) => {
      await api.delete(`/procurement/vendors/${vendorId}/users/${userId}`);
      await api.delete(`/plt/vendor-users/${vendorId}/${userId}`);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["vendor", "links", variables.vendorId] });
      toast({ title: "Vendor unlinked", description: "User access removed." });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to unlink vendor user";
      toast({ title: "Unlink failed", description: message, variant: "destructive" });
    },
  });

  const cleanupShipments = useMutation({
    mutationFn: async () => {
      const value = cleanupInput.trim();
      if (!value) {
        throw new Error("Enter a PO number or ID");
      }
      const params = /^\d+$/.test(value) ? { poId: value } : { poNo: value };
      const { data } = await api.delete("/plt/deliveries/by-po", { params });
      return data as { deleted?: number; poId?: string; poNo?: string };
    },
    onSuccess: (data) => {
      const label = data?.poNo || data?.poId || "PO";
      toast({
        title: "Shipments cleared",
        description: `Deleted ${data?.deleted ?? 0} shipment(s) for ${label}.`,
      });
      setCleanupInput("");
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || err.message || "Failed to delete shipments";
      toast({ title: "Cleanup failed", description: message, variant: "destructive" });
    },
  });

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roles: ["STAFF"],
      isActive: true,
    },
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(EditUserSchema),
    defaultValues: { name: "", roles: ["STAFF"], isActive: true, password: "" },
  });

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name: editingUser.name ?? "",
        roles: editingUser.roles as typeof ROLE_OPTIONS[number][],
        isActive: editingUser.isActive,
        password: "",
      });
    }
  }, [editingUser, editForm]);

  const onCreate = async (values: CreateUserFormValues) => {
    const payload: CreateAdminUserPayload = {
      name: values.name,
      email: values.email,
      password: values.password,
      roles: values.roles,
      isActive: values.isActive,
    };
    try {
      await createUser.mutateAsync(payload);
      toast({ title: "User created", description: `${values.name} (${values.email}) can now access Logistics 1.` });
      createForm.reset({ name: "", email: "", password: "", roles: ["STAFF"], isActive: true });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to create user";
      toast({ title: "Create user failed", description: message, variant: "destructive" });
    }
  };

  const onEdit = async (values: EditUserFormValues) => {
    if (!editingUser) return;
    try {
      const payload: UpdateAdminUserPayload = {
        id: editingUser.id,
        name: values.name,
        roles: values.roles,
        isActive: values.isActive,
      };
      if (values.password && values.password.length > 0) {
        payload.password = values.password;
      }
      await updateUser.mutateAsync(payload);
      toast({ title: "User updated", description: `${editingUser.name ?? editingUser.email} has been refreshed.` });
      setEditingUser(null);
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to update user";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  };

  const onDisable = async (user: AdminUser) => {
    try {
      await disableUser.mutateAsync(user.id);
      toast({ title: "Account disabled", description: `${user.name ?? user.email} can no longer log in.` });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to disable user";
      toast({ title: "Disable failed", description: message, variant: "destructive" });
    }
  };

  const users = usersQuery.data ?? [];
  const activeUsers = useMemo(() => users.filter((u) => u.isActive).length, [users]);
  const vendorUsers = users.filter((user) => user.isActive && user.roles.includes("VENDOR"));
  const vendors = vendorsQuery.data ?? [];
  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
  const vendorLinks = vendorLinksQuery.data ?? [];
  const linkedUserIds = useMemo(() => new Set(vendorLinks.map((link) => link.userId)), [vendorLinks]);
  const canLink =
    selectedVendorId.length > 0 &&
    selectedVendorUserId.length > 0 &&
    !linkedUserIds.has(selectedVendorUserId) &&
    !linkVendorUser.isPending;

  const getVendorLabel = (vendor: VendorSummary) =>
    vendor.email ? `${vendor.name} (${vendor.email})` : vendor.name;

  const getUserLabel = (user: AdminUser) =>
    user.name ? `${user.name} (${user.email})` : user.email;

  useEffect(() => {
    if (!selectedVendorId && vendors.length > 0) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [selectedVendorId, vendors]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="text-muted-foreground max-w-2xl">
          Logistics 1 administrators onboard users, assign roles, and keep hospital storage operations compliant. Use the
          panel below to create accounts or adjust permissions when teams change.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create user account</CardTitle>
          <CardDescription>Provision an account for staff or vendors. Passwords can be rotated later.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...createForm}>
            <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreate)}>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Maria Santos" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="vendor@example.com" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Temporary password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign roles</FormLabel>
                    <FormMessage />
                    <div className="flex flex-wrap gap-3">
                      {ROLE_OPTIONS.map((role) => {
                        const checked = field.value?.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border"
                              checked={checked}
                              onChange={(evt) => {
                                if (evt.target.checked) {
                                  field.onChange([...(field.value ?? []), role]);
                                } else {
                                  field.onChange((field.value ?? []).filter((r) => r !== role));
                                }
                              }}
                            />
                            {role}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Use VENDOR for supplier accounts.</p>
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={field.value}
                        onChange={(evt) => field.onChange(evt.target.checked)}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium">Allow immediate login</FormLabel>
                      <p className="text-xs text-muted-foreground">Uncheck if onboarding later.</p>
                    </div>
                  </FormItem>
                )}
              />


              <CardFooter className="px-0">
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending && <Spinner className="mr-2 h-4 w-4" />}Create user
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor access mapping</CardTitle>
          <CardDescription>Link vendor users to supplier records so they can see orders and shipment updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Vendor</label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder={vendorsQuery.isLoading ? "Loading vendors..." : "Select vendor"} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {getVendorLabel(vendor)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Vendor user</label>
              <Select value={selectedVendorUserId} onValueChange={setSelectedVendorUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={usersQuery.isLoading ? "Loading users..." : "Select vendor user"} />
                </SelectTrigger>
                <SelectContent>
                  {vendorUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex">
              <Button
                type="button"
                disabled={!canLink}
                onClick={() => linkVendorUser.mutate({ vendorId: selectedVendorId, userId: selectedVendorUserId })}
              >
                {linkVendorUser.isPending ? "Linking..." : "Link vendor access"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Only users with the VENDOR role are shown.</p>

          {selectedVendorId ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Linked users</h3>
              {vendorLinksQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading linked users...</div>
              ) : vendorLinks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No vendor users linked yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Linked</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorLinks.map((link) => {
                      const user = users.find((u) => u.id === link.userId);
                      return (
                        <TableRow key={link.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {selectedVendor ? getVendorLabel(selectedVendor) : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{user ? getUserLabel(user) : "Unknown user"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{link.userId}</TableCell>
                          <TableCell>{new Date(link.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unlinkVendorUser.isPending}
                              onClick={() => unlinkVendorUser.mutate({ vendorId: selectedVendorId, userId: link.userId })}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {vendorsQuery.isLoading ? "Loading vendors..." : "Select a vendor to view linked users."}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment cleanup</CardTitle>
          <CardDescription>Remove accidental shipments for POs that are still awaiting vendor approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">PO number or ID</label>
              <Input
                placeholder="PO-123456 or 25"
                value={cleanupInput}
                onChange={(event) => setCleanupInput(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={cleanupShipments.isPending || cleanupInput.trim().length === 0}
              onClick={() => cleanupShipments.mutate()}
            >
              {cleanupShipments.isPending ? "Cleaning..." : "Remove shipments"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This only deletes shipments when the vendor approval is still pending.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User directory</CardTitle>
          <CardDescription>
            {activeUsers} active user{activeUsers === 1 ? "" : "s"} have access today. Disable accounts when staff rotate out of Logistics 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usersQuery.isLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Spinner className="h-4 w-4" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found. Create accounts above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="w-48">Roles</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.name ?? "Unnamed"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={`${user.id}-${role}`} variant="outline">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => setEditingUser(user)}>Edit roles/status</DropdownMenuItem>
                          {user.isActive ? (
                            <DropdownMenuItem onSelect={() => onDisable(user)}>Disable account</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={async () => {
                                try {
                                  await updateUser.mutateAsync({ id: user.id, isActive: true });
                                  toast({ title: "Account reactivated", description: `${user.name ?? user.email} can log in again.` });
                                } catch (err: any) {
                                  const message = err?.response?.data?.error || err.message || "Failed to reactivate";
                                  toast({ title: "Update failed", description: message, variant: "destructive" });
                                }
                              }}
                            >
                              Reactivate account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => (!open ? setEditingUser(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Adjust roles or temporarily disable the account.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <Form {...editForm}>
              <form className="space-y-4" onSubmit={editForm.handleSubmit(onEdit)}>
                <div>
                  <span className="text-sm font-medium text-foreground">{editingUser.name ?? "Unnamed"}</span>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                  <p className="text-xs text-muted-foreground">User ID: {editingUser.id}</p>
                </div>

                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Maria Santos" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roles</FormLabel>
                      <div className="flex flex-wrap gap-3">
                        {ROLE_OPTIONS.map((role) => {
                          const checked = field.value?.includes(role);
                          return (
                            <label key={`edit-${role}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border"
                                checked={checked}
                                onChange={(evt) => {
                                  if (evt.target.checked) {
                                    field.onChange([...(field.value ?? []), role]);
                                  } else {
                                    field.onChange((field.value ?? []).filter((r) => r !== role));
                                  }
                                }}
                              />
                              {role}
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={field.value}
                          onChange={(evt) => field.onChange(evt.target.checked)}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="text-sm font-medium">Allow login</FormLabel>
                        <p className="text-xs text-muted-foreground">Uncheck to temporarily lock the account.</p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave blank to keep current password" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUser.isPending}>
                    {updateUser.isPending && <Spinner className="mr-2 h-4 w-4" />}Save changes
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}












