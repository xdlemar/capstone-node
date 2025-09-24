import { useState } from "react";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api.post("/auth/login", { email, password });
    auth.set(res.data.token);
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-[360px] space-y-3">
        <h2 className="text-xl font-semibold">Sign in</h2>
        <Input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <Button type="submit" className="w-full">Login</Button>
      </form>
    </div>
  );
}
