import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { login } from "../../api/auth";

export default function Login(){
  const nav = useNavigate();
  const setLogin = useAuthStore(s=>s.login);
  const [email, setEmail] = useState("admin@hvh.local");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  const submit = async (e)=>{
    e.preventDefault();
    setErr("");
    try {
      const r = await login(email, password);
      setLogin({ token: r.data.token, user: r.data.user });
      nav("/");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="centered">
      <h2>Sign in to Logistics 1</h2>
      <form onSubmit={submit} className="card">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" />
        <button>Login</button>
        {err && <p style={{color:"red"}}>{err}</p>}
      </form>
    </div>
  );
}
