
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function Login() {
  const { register, handleSubmit } = useForm({
    defaultValues: { email: "", password: "" },
  });
  const { login } = useAuth();
  const nav = useNavigate();

  return (
    <div className="auth-wrap">
      <form
        className="auth-card"
        onSubmit={handleSubmit(async (v) => {
          try { await login(v.email, v.password); nav("/"); }
          catch (e) { alert("Login failed"); console.error(e); }
        })}
      >
        <img src="/logo.png" alt="logo" className="logo" />
        <h2>Sign in</h2>
        <input {...register("email")} placeholder="Email" type="email" required />
        <input {...register("password")} placeholder="Password" type="password" required />
        <button>Login</button>
        <small className="hint">
          Try: admin@hvh.local / admin123 • staff@hvh.local / staff123 • it@hvh.local / it123
        </small>
      </form>
    </div>
  );
}
