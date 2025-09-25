import { Suspense, lazy, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type LoginPayload = { email: string; password: string };

const LoginForm = lazy(() =>
  import("@/components/login-form").then((mod) => ({ default: mod.LoginForm }))
);

const LOGIN_ERROR = {
  InvalidCredentials: "Check your email and password and try again.",
  RateLimited: "Too many attempts. Please wait a moment and try again.",
  Generic: "We couldn't sign you in. Please try again shortly.",
} as const;

type LoginErrorMessage = (typeof LOGIN_ERROR)[keyof typeof LOGIN_ERROR];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginErrorMessage | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async ({ email, password }: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      const token = data?.access_token;
      if (!token) {
        throw new Error("Missing access token");
      }
      login(token);
      setRedirecting(true);
      navigate("/dashboard", { replace: true });
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      let message: LoginErrorMessage;

      if (status === 401) {
        message = LOGIN_ERROR.InvalidCredentials;
      } else if (status === 429) {
        message = LOGIN_ERROR.RateLimited;
      } else if (status) {
        message = LOGIN_ERROR.Generic;
      } else {
        message = (err?.message as LoginErrorMessage) || LOGIN_ERROR.Generic;
      }

      setError(message);
      setLoading(false);
    }
  };

  if (redirecting) {
    return <FullScreenPreloader label="Loading dashboard..." />;
  }

  return (
    <div className="hvh-bg flex min-h-[100svh] items-center justify-center px-4 py-6">
      <Suspense fallback={<FullScreenPreloader label="Loading login..." />}>
        <LoginForm
          className="w-full max-w-md md:max-w-4xl"
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </Suspense>
    </div>
  );
}
