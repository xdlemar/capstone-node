import { Suspense, lazy, useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { hvhLogoUrl } from "@/lib/branding";

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
  GoogleFailed: "Google sign-in failed. Please try again.",
  ResetGeneric: "We couldn't process that request. Please try again.",
  ResetInvalid: "Invalid code or email. Please request a new one.",
  ResetExpired: "That code expired. Request a new code.",
  ResetPassword: "Password must be at least 8 characters.",
  ResetMismatch: "Passwords do not match.",
  ResetNotFound: "That account is not registered.",
} as const;

type LoginErrorMessage = string;

type LoginStep = "credentials" | "otp" | "forgot" | "reset";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [resetInfo, setResetInfo] = useState<{ email: string; expiresIn: number } | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<LoginErrorMessage | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const handleSubmit = async ({ email, password }: LoginPayload) => {
    setLoading(true);
    setError(null);
    setOtpError(null);
    setNotice(null);
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
      const retryAfter = err?.response?.data?.retryAfterSeconds;
      let message: LoginErrorMessage;

      if (status === 404) {
        message = LOGIN_ERROR.ResetNotFound;
      } else if (status === 401) {
        message = LOGIN_ERROR.InvalidCredentials;
      } else if (status === 429) {
        if (retryAfter) {
          const mins = Math.ceil(Number(retryAfter) / 60);
          message = `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
        } else {
          message = LOGIN_ERROR.RateLimited;
        }
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

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      if (!credential) {
        setError(LOGIN_ERROR.GoogleFailed);
        return;
      }
      setGoogleLoading(true);
      setError(null);
      setNotice(null);
      try {
        const { data } = await api.post("/auth/login/google", { credential });
        const token = data?.access_token;
        if (!token) throw new Error("Missing access token");
        login(token);
        setRedirecting(true);
        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401) setError(LOGIN_ERROR.GoogleFailed);
        else if (status === 403) setError("Account disabled");
        else if (status === 429) setError(LOGIN_ERROR.RateLimited);
        else setError(LOGIN_ERROR.Generic);
      } finally {
        setGoogleLoading(false);
      }
    },
    [login, navigate]
  );

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

  const startForgotFlow = () => {
    setStep("forgot");
    setNotice(null);
    setError(null);
    setOtpError(null);
    setResetError(null);
    setForgotEmail("");
    setResetCode("");
    setResetPassword("");
    setResetPasswordConfirm("");
    setResetInfo(null);
  };

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!forgotEmail) {
      setResetError(LOGIN_ERROR.ResetGeneric);
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setNotice(null);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: forgotEmail });
      setResetInfo({ email: forgotEmail, expiresIn: data?.expiresIn ?? 600 });
      setStep("reset");
      setResetCode("");
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) setResetError(LOGIN_ERROR.ResetNotFound);
      else if (status === 429) setResetError(LOGIN_ERROR.RateLimited);
      else setResetError(LOGIN_ERROR.ResetGeneric);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetInfo?.email) {
      setResetError(LOGIN_ERROR.ResetGeneric);
      return;
    }
    if (!resetCode) {
      setResetError(LOGIN_ERROR.ResetInvalid);
      return;
    }
    if (!resetPassword || resetPassword.length < 8) {
      setResetError(LOGIN_ERROR.ResetPassword);
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setResetError(LOGIN_ERROR.ResetMismatch);
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      await api.post("/auth/forgot-password/verify", {
        email: resetInfo.email,
        code: resetCode,
        newPassword: resetPassword,
      });
      setNotice("Password updated. Sign in with your new password.");
      setStep("credentials");
      setResetInfo(null);
      setResetCode("");
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (err: any) {
      const status = err?.response?.status;
      const backendError = err?.response?.data?.error;
      if (backendError === "Invalid or expired code") setResetError(LOGIN_ERROR.ResetInvalid);
      else if (backendError === "Invalid code") setResetError(LOGIN_ERROR.ResetInvalid);
      else if (backendError === "OTP expired") setResetError(LOGIN_ERROR.ResetExpired);
      else if (status === 429) setResetError(LOGIN_ERROR.RateLimited);
      else setResetError(LOGIN_ERROR.ResetGeneric);
    } finally {
      setResetLoading(false);
    }
  };

  if (redirecting) {
    return <FullScreenPreloader label="Loading dashboard..." />;
  }

  const backgroundStyle = { "--hvh-logo-url": `url(${hvhLogoUrl})` } as CSSProperties;

  if (step === "forgot") {
    return (
      <div className="hvh-bg flex min-h-[100svh] items-center justify-center px-4 py-6" style={backgroundStyle}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border-border/40 dark:bg-slate-900/90">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">Enter the email associated with your account.</p>
              {resetError ? (
                <Alert variant="destructive">
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleForgotSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reset-email">
                  Email
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  disabled={resetLoading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading || !forgotEmail}>
                {resetLoading ? "Sending code..." : "Send reset code"}
              </Button>
              <button
                type="button"
                className="text-sm underline underline-offset-4 text-primary"
                onClick={() => setStep("credentials")}
                disabled={resetLoading}
              >
                Back to login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === "reset" && resetInfo) {
    const minutes = Math.max(1, Math.floor((resetInfo.expiresIn ?? 600) / 60));
    return (
      <div className="hvh-bg flex min-h-[100svh] items-center justify-center px-4 py-6" style={backgroundStyle}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border-border/40 dark:bg-slate-900/90">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{resetInfo.email}</span>.
              </p>
              {resetError ? (
                <Alert variant="destructive">
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleResetSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reset-code">
                  Verification code
                </label>
                <Input
                  id="reset-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]*"
                  placeholder="123456"
                  value={resetCode}
                  onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={resetLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reset-password">
                  New password
                </label>
                <Input
                  id="reset-password"
                  type="password"
                  minLength={8}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  disabled={resetLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reset-password-confirm">
                  Confirm new password
                </label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  minLength={8}
                  value={resetPasswordConfirm}
                  onChange={(event) => setResetPasswordConfirm(event.target.value)}
                  disabled={resetLoading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Updating password..." : "Update password"}
              </Button>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <span>Codes expire after {minutes} minute(s).</span>
                <button
                  type="button"
                  className="text-left text-sm underline underline-offset-4 text-primary"
                  onClick={() => setStep("credentials")}
                  disabled={resetLoading}
                >
                  Back to login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === "otp" && otpInfo) {
    return (
      <div className="hvh-bg flex min-h-[100svh] items-center justify-center px-4 py-6" style={backgroundStyle}>
        <div className="flex w-full max-w-md flex-col gap-6">
          <div
            className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:border-border/40 dark:bg-slate-900/90"
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
    <div className="hvh-bg flex min-h-[100svh] items-center justify-center px-4 py-6" style={backgroundStyle}>
      <Suspense fallback={<FullScreenPreloader label="Loading login..." />}>
        <LoginForm
          className="w-full max-w-md md:max-w-4xl"
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          notice={notice}
          onForgotPassword={startForgotFlow}
          onGoogleCredential={googleClientId ? handleGoogleCredential : undefined}
          googleClientId={googleClientId}
          googleLoading={googleLoading}
        />
      </Suspense>
    </div>
  );
}
