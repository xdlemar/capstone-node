import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="hvh-bg flex min-h-[100svh] items-center justify-center px-4 py-6">
      {/* widths that feel right on both mobile and desktop */}
      <LoginForm className="w-full max-w-md md:max-w-4xl" />
    </div>
  )
}


