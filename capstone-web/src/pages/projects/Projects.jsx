import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { listProjects, createProject, listProjectTasks, createProjectTask } from "../../api/ops";

export default function Projects(){
  const qc = useQueryClient();
  const q = useQuery({ queryKey:["projects"], queryFn: ()=>listProjects().then(r=>r.data) });

  const { register, handleSubmit, reset } = useForm({
    defaultValues:{ code:"PRJ-001", name:"New Project", ownerDept:"Logistics" }
  });
  const m = useMutation({
    mutationFn: (v)=>createProject(v).then(r=>r.data),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["projects"]}); reset(); }
  });

  return (
    <div>
      <h2>Projects</h2>

      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid">
        <input {...register("code")} placeholder="Code" />
        <input {...register("name")} placeholder="Name" />
        <input {...register("ownerDept")} placeholder="Owner Dept" />
        <button disabled={m.isPending}>Create</button>
      </form>

      {q.data?.map(p => <ProjectCard key={p.id} p={p} />)}
    </div>
  );
}

function ProjectCard({ p }){
  const { data: tasks=[] } = useQuery({
    queryKey:["proj-tasks", p.id],
    queryFn: ()=>listProjectTasks(p.id).then(r=>r.data)
  });
  const { register, handleSubmit, reset } = useForm({ defaultValues:{ title:"Task", dueDate:"" }});
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v)=>createProjectTask(p.id, v).then(r=>r.data),
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["proj-tasks", p.id]}); reset({ title:"", dueDate:"" }); }
  });

  return (
    <section className="card">
      <h3>{p.code} — {p.name}</h3>
      <small>{p.ownerDept || "-"}</small>

      <ul>
        {tasks.map(t => <li key={t.id}>{t.title} — {t.status} {t.dueDate?.slice(0,10) || ""}</li>)}
      </ul>

      <form onSubmit={handleSubmit((v)=>m.mutate(v))} className="grid">
        <input {...register("title")} placeholder="Task title" />
        <input {...register("dueDate")} placeholder="YYYY-MM-DD" />
        <button>Add Task</button>
      </form>
    </section>
  );
}
