
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="bg-muted min-h-svh flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-[900px]">
        <LoginForm />
      </div>
    </div>
  );
}
