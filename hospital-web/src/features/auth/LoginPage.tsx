import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type LoginPayload = { email: string; password: string };

const LoginForm = lazy(() =>
  import("@/components/login-form").then((mod) => ({ default: mod.LoginForm }))
);

const LOGIN_ERROR = {
  InvalidCredentials: "Check your email and password and try again.",
  RateLimited: "Too many attempts. Please wait a moment and try again.",
  Generic: "We couldn't sign you in. Please try again shortly.",
  InvalidOtp: "The code you entered is incorrect. Try again.",
  OtpExpired: "This code has expired. Request a new one.",
  OtpSendFailed: "We couldn't send the verification code. Please try again.",
} as const;

type LoginErrorMessage = (typeof LOGIN_ERROR)[keyof typeof LOGIN_ERROR];

type LoginStep = "credentials" | "otp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginErrorMessage | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [otpError, setOtpError] = useState<LoginErrorMessage | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpInfo, setOtpInfo] = useState<{ otpId: string; email: string; expiresIn: number } | null>(null);
  const [credentialsCache, setCredentialsCache] = useState<LoginPayload | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [otpValue, setOtpValue] = useState("");

  const handleSubmit = async ({ email, password }: LoginPayload) => {
    setLoading(true);
    setError(null);
    setOtpError(null);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const token = data?.access_token;
      if (!token) {
        if (data?.otpId) {
          setCredentialsCache({ email, password });
          setOtpInfo({ otpId: data.otpId, email, expiresIn: data.expiresIn ?? 300 });
          setStep("otp");
          setResendCountdown(30);
          setOtpValue("");
          setLoading(false);
          return;
        }
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
    setLoading(false);
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otpInfo) return;
    const code = otpValue.trim();
    if (!code) {
      setOtpError(LOGIN_ERROR.InvalidOtp);
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const { data } = await api.post("/auth/login/otp", { otpId: otpInfo.otpId, code });
      const token = data?.access_token;
      if (!token) {
        throw new Error("Missing access token");
      }
      login(token);
      setRedirecting(true);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const backendError = err?.response?.data?.error;
      let message: LoginErrorMessage;

      if (backendError === "OTP expired") message = LOGIN_ERROR.OtpExpired;
      else if (backendError === "OTP already used") message = LOGIN_ERROR.OtpExpired;
      else if (backendError === "Invalid code") message = LOGIN_ERROR.InvalidOtp;
      else if (status === 429) message = LOGIN_ERROR.RateLimited;
      else message = LOGIN_ERROR.Generic;

      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!credentialsCache) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      const { data } = await api.post("/auth/login", credentialsCache);
      if (data?.otpId) {
        setOtpInfo({ otpId: data.otpId, email: credentialsCache.email, expiresIn: data.expiresIn ?? 300 });
        setResendCountdown(30);
        setOtpValue("");
        return;
      }
      const token = data?.access_token;
      if (token) {
        login(token);
        setRedirecting(true);
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const backendError = err?.response?.data?.error;
      let message: LoginErrorMessage;
      if (backendError === "Failed to send OTP email") message = LOGIN_ERROR.OtpSendFailed;
      else if (status === 429) message = LOGIN_ERROR.RateLimited;
      else message = LOGIN_ERROR.Generic;
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const resetToLogin = () => {
    setStep("credentials");
    setOtpInfo(null);
    setCredentialsCache(null);
    setOtpError(null);
    setError(null);
    setOtpValue("");
  };

  useEffect(() => {
    if (step !== "otp") return;
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCountdown]);

  if (redirecting) {
    return <FullScreenPreloader label="Loading dashboard..." />;
  }

  if (step === "otp" && otpInfo) {
    return (
      <div className=" flex min-h-[100svh] items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div
            className="rounded-2xl border border-border/60 bg-white p-6 shadow-xl ring-1 ring-black/5 dark:border-border/40 dark:bg-slate-900"
            style={{ backgroundColor: "#ffffff", opacity: 1 }}
          >
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent to <span className="font-medium text-foreground">{otpInfo.email}</span>.
              </p>
              {otpError ? (
                <Alert variant="destructive">
                  <AlertDescription>{otpError}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="otp-code">
                  Verification code
                </label>
                <Input
                  id="otp-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={otpValue}
                  onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={otpLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={otpLoading || otpValue.length < 4}>
                {otpLoading ? "Verifying..." : "Verify code"}
              </Button>
            </form>

            <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                className="text-left text-sm font-medium text-primary hover:underline disabled:text-muted-foreground"
                onClick={handleResendOtp}
                disabled={otpLoading || resendCountdown > 0}
              >
                Resend code {resendCountdown > 0 ? `(${resendCountdown})` : ""}
              </button>
              <button type="button" className="text-left text-sm underline underline-offset-4" onClick={resetToLogin}>
                Back to login
              </button>
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Codes expire after {Math.floor(otpInfo.expiresIn / 60)} minute(s).</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
