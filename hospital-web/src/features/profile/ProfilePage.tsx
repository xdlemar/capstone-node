import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

const ProfileSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange =
      (data.currentPassword && data.currentPassword.length > 0) ||
      (data.newPassword && data.newPassword.length > 0) ||
      (data.confirmPassword && data.confirmPassword.length > 0);

    if (wantsPasswordChange) {
      if (!data.currentPassword) {
        ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "Enter your current password" });
      }
      if (!data.newPassword || data.newPassword.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["newPassword"],
          message: "New password must be at least 8 characters",
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
      }
    }
  });

type ProfileFormValues = z.infer<typeof ProfileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({
        name: profileQuery.data.name ?? "",
        email: profileQuery.data.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [profileQuery.data, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    const payload: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    } = {};

    if (values.name && values.name !== (profileQuery.data?.name ?? "")) {
      payload.name = values.name;
    }

    if (values.newPassword) {
      payload.currentPassword = values.currentPassword;
      payload.newPassword = values.newPassword;
    }

    if (Object.keys(payload).length === 0) {
      toast({ title: "No changes", description: "Update your name or password before saving." });
      return;
    }

    try {
      await updateProfile.mutateAsync(payload);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      form.reset({
        name: payload.name ?? form.getValues("name"),
        email: form.getValues("email"),
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || "Failed to update profile";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load profile</AlertTitle>
        <AlertDescription>Try refreshing the page or contact an administrator.</AlertDescription>
      </Alert>
    );
  }

  const profile = profileQuery.data;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Profile settings</h1>
        <p className="text-muted-foreground max-w-2xl">
          Update your name or password. Email addresses are managed by administrators.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>Summary of who you are in Logistics 1.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-foreground">Email:</span> {profile.email}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">Roles:</span>
              <div className="flex flex-wrap gap-1">
                {profile.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Account created on {new Date(profile.createdAt).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Provide your latest information and rotate your password regularly.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <Input value={field.value} disabled readOnly />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Change password</h2>
                <p className="text-xs text-muted-foreground">
                  Leave these blank if you do not want to change your password.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.reset({
                      name: profile.name ?? "",
                      email: profile.email,
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    })
                  }
                >
                  Reset changes
                </Button>
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending && <Spinner className="mr-2 h-4 w-4" />}
                  Save profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
}
