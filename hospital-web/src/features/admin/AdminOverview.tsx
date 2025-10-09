import { useEffect, useMemo, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser, CreateAdminUserPayload, UpdateAdminUserPayload } from "@/hooks/useAdminUsers";
import { useAdminUsers, useCreateAdminUser, useDisableAdminUser, useUpdateAdminUser } from "@/hooks/useAdminUsers";

const ROLE_OPTIONS = ["STAFF", "MANAGER", "ADMIN"] as const;
const RoleEnum = z.enum(ROLE_OPTIONS);

const CreateUserSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email({ message: "Enter a valid hospital email" }),
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

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="text-muted-foreground max-w-2xl">
          Logistics 1 administrators onboard staff, assign roles, and keep hospital storage operations compliant. Use the
          panel below to invite new users or adjust permissions when teams change.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Invite hospital staff</CardTitle>
          <CardDescription>Provision an account for Logistics 1. Passwords can be rotated later.</CardDescription>
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
                      <FormLabel>Hospital email</FormLabel>
                      <FormControl>
                        <Input placeholder="pharmacy@hvh.logistics" autoComplete="off" {...field} />
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
                  {createUser.isPending && <Spinner className="mr-2 h-4 w-4" />}Invite user
                </Button>
              </CardFooter>
            </form>
          </Form>
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
              <Spinner className="h-4 w-4" /> Loading usersÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found. Invite staff above.</p>
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












