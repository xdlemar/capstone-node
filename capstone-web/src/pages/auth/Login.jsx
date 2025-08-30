import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { auth } from "../../api/http";
import useAuth from "../../hooks/useAuth";

export default function Login(){
  const { login } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit } = useForm({
    defaultValues: { email: "admin@hvh.local", password: "admin123" }
  });

  const m = useMutation({
    mutationFn: async (v) => {
      const r = await auth.post("/auth/login", v);
      return r.data;
    },
    onSuccess: (data) => {
      login({ token: data.token, user: data.user });
      nav("/", { replace: true });
    }
  });

  return (
    <div className="centered">
      <div className="card" style={{maxWidth:420, width:"100%"}}>
        <div style={{textAlign:"center", marginBottom:12}}>
          <img src="/logo512.png" alt="logo" width="64" height="64" />
          <h2 style={{marginTop:8}}>Sign in</h2>
        </div>
        <form onSubmit={handleSubmit(v => m.mutate(v))} className="grid">
          <input {...register("email")} placeholder="Email" />
          <input {...register("password")} type="password" placeholder="Password" />
          <button disabled={m.isPending}>Login</button>
          {m.isError && <div style={{color:"red"}}>{String(m.error?.response?.data?.message || m.error?.message || m.error)}</div>}
        </form>
        <div style={{marginTop:8, fontSize:12, color:"#555"}}>
          Try: admin@hvh.local / admin123 • staff@hvh.local / staff123 • it@hvh.local / it123
        </div>
      </div>
    </div>
  );
}
