import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (v) => {
    setServerError("");
    try {
      await login(v.email, v.password);
      nav("/");
    } catch {
      setServerError("Invalid email or password.");
      setError("email", { type: "server" });
      setError("password", { type: "server" });
    }
  };

  return (
    // one soft shadow
    <div className="mx-auto overflow-hidden rounded-2xl bg-card text-card-foreground shadow-[0_6px_10px_-2px_rgba(0,0,0,0.08),0_2px_6px_-2px_rgba(0,0,0,0.05),6px_0_14px_rgba(0,0,0,0.08),0_-2px_6px_rgba(0,0,0,0.04)]">
      {/* shared height so both sides align; form centered vertically */}
      <div className="grid md:grid-cols-[480px_1fr] md:min-h-[460px]">
        {/* LEFT: form */}
        <div className="flex items-center p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-[700px] mx-auto">
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Login to your hospital account</p>
              </div>

              {serverError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {serverError}
                </div>
              )}

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="username"
                  className="h-11 text-m  placeholder:text-muted-foreground/70"
                  aria-invalid={!!errors.email || undefined}
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                  })}
                />
                {errors.email && <small className="text-red-600">{errors.email.message}</small>}
              </div>

              {/* Password + forgot link under field */}
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 text-m placeholder:text-muted-foreground/70"
                  aria-invalid={!!errors.password || undefined}
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "At least 6 characters" },
                  })}
                />
                {errors.password && <small className="text-red-600">{errors.password.message}</small>}
              </div>
               <div className="mt-1 text-right">
                  <Link to="/forgot" className="text-s text-muted-foreground underline-offset-2 hover:underline">
                    Forgot your password?
                  </Link>
                </div>
             
              <Button
                type="submit"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in…" : "Login"}
              </Button>

        
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="#" className="underline underline-offset-4">Sign up</a>
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT: darker gray panel + centered logo */}
        <div className="relative hidden md:flex items-center justify-center bg-gray-300">
          <img
            src={logo}
            alt="Hospital logo"
            className="max-h-44 w-auto object-contain drop-shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}
