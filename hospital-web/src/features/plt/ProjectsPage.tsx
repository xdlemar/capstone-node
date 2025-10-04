import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { usePltProjects, usePltSummary } from "@/hooks/usePltData";

const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

const projectSchema = z.object({
  code: z.string().min(3, "Project code required"),
  name: z.string().min(3, "Project name required"),
  status: z.enum(PROJECT_STATUSES).default("PLANNING"),
  managerId: z.string().optional(),
  budget: z.string().optional(),
  description: z.string().optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isManager = roles.includes("MANAGER") || roles.includes("ADMIN");

  const projectsQuery = usePltProjects();
  const summaryQuery = usePltSummary({ enabled: isManager });

  if (!isManager) {
    return (
      <Alert className="border-dashed">
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Only managers and administrators can manage project allocations.</AlertDescription>
      </Alert>
    );
  }

  const projects = projectsQuery.data ?? [];
  const loading = projectsQuery.isLoading;
  const summary = summaryQuery.data;

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Project allocations</h1>
            <p className="text-muted-foreground max-w-3xl">
              Track budgets, logistics costs, and delivery cadence per project.
            </p>
          </div>
          <CreateProjectDialog trigger={<Button>Add project</Button>} onCreated={() => projectsQuery.refetch()} />
        </div>
      </header>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Projects list</CardTitle>
          <CardDescription>Newest projects appear first. Click a row to inspect last delivery details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48" />
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects recorded yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Last delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="max-w-[220px]">
                        <div className="flex flex-col">
                          <span className="font-medium">{project.code}</span>
                          <span className="text-xs text-muted-foreground truncate">{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                          {project.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{project.budget != null ? `₱${project.budget.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>{project.deliveriesCount}</TableCell>
                      <TableCell>{project.materialsCount}</TableCell>
                      <TableCell>
                        {project.lastDelivery ? (
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {project.lastDelivery.trackingNo ?? `Delivery ${project.lastDelivery.id}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(project.lastDelivery.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No deliveries</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Delivery spend by project</CardTitle>
          <CardDescription>Top spenders based on delivery-linked costs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summaryQuery.isLoading ? (
            <Skeleton className="h-24" />
          ) : summary?.deliveryCosts.perProject?.length ? (
            summary.deliveryCosts.perProject.map((row) => (
              <div key={row.projectId} className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="flex flex-col">
                  <span className="font-medium">{row.code}</span>
                  <span className="text-xs text-muted-foreground">{row.name}</span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">₱{row.deliveryCost.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Budget: {row.budget != null ? `₱${row.budget.toLocaleString()}` : "n/a"}</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No delivery cost entries yet.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

interface CreateProjectDialogProps {
  trigger: React.ReactNode;
  onCreated?: () => void;
}

function CreateProjectDialog({ trigger, onCreated }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      code: "",
      name: "",
      status: "PLANNING",
      managerId: "",
      budget: "",
      description: "",
      startsOn: "",
      endsOn: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      await api.post("/plt/projects", {
        code: values.code,
        name: values.name,
        status: values.status,
        managerId: values.managerId || undefined,
        budget: values.budget ? Number(values.budget) : undefined,
        description: values.description || undefined,
        startsOn: values.startsOn ? new Date(values.startsOn).toISOString() : undefined,
        endsOn: values.endsOn ? new Date(values.endsOn).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Project created" });
      qc.invalidateQueries({ queryKey: ["plt", "projects"] });
      qc.invalidateQueries({ queryKey: ["plt", "summary"] });
      form.reset({
        code: "",
        name: "",
        status: "PLANNING",
        managerId: "",
        budget: "",
        description: "",
        startsOn: "",
        endsOn: "",
      });
      setOpen(false);
      onCreated?.();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create project",
        description: err?.response?.data?.error ?? err.message ?? "Unexpected error",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register new project</DialogTitle>
          <DialogDescription>Define project code, owner, and high-level schedule.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="PRJ-001" {...field} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STATUSES.map((status) => (
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
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Project description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional overview" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager id (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Numeric user id" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 250000" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts on</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends on</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}