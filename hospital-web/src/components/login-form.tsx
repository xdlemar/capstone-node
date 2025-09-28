import { AlertTriangle, Eye, EyeOff } from "lucide-react"
import { useCallback, useState, type ComponentProps, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

type LoginFormProps = Omit<ComponentProps<"div">, "onSubmit"> & {
  onSubmit?: (payload: { email: string; password: string }) => void
  loading?: boolean
  error?: string | null
}

export function LoginForm({ className, onSubmit, loading = false, error, ...props }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const handleCapsLockState = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"))
  }, [])

  const handlePasswordBlur = useCallback(() => {
    setCapsLockOn(false)
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") || "").trim()
    const password = String(formData.get("password") || "")
    if (!email || !password) return
    onSubmit?.({ email, password })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="relative p-0 overflow-visible md:overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
        <div className="md:hidden absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="h-20 w-20 rounded-full bg-white/95 ring-2 ring-white shadow-[0_10px_25px_rgba(0,0,0,.35)] grid place-items-center">
            <img src="/hvh-logo.png" alt="HVH Hospital" className="h-16 w-16 object-contain" />
          </div>
        </div>

        <CardContent className="grid p-0 pt-16 md:pt-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">Login to your Hospital account</p>
                {error ? (
                  <Alert variant="destructive" className="w-full text-left">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={loading} />
              </div>

              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    className="pr-11"
                    onKeyUp={handleCapsLockState}
                    onKeyDown={handleCapsLockState}
                    onBlur={handlePasswordBlur}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-2 flex h-9 w-9 items-center justify-center text-muted-foreground"
                    onClick={togglePasswordVisibility}
                    disabled={loading}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
                {capsLockOn ? (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 shadow-sm">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Caps Lock is on</span>
                  </div>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>

              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">Or</span>
              </div>

              <div>
                <Button
                  variant="outline"
                  type="button"
                  className="flex w-full items-center justify-center gap-2 border-muted-foreground/30 bg-card/80 text-sm font-medium text-muted-foreground transition hover:bg-card"
                  disabled={loading}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M21.35 11.1H12v2.9h5.35c-.23 1.37-1.5 4.02-5.35 4.02-3.22 0-5.85-2.67-5.85-5.97s2.63-5.97 5.85-5.97c1.83 0 3.07.77 3.77 1.43l2.58-2.5C16.59 3.82 14.53 3 12 3 6.98 3 3 6.92 3 12s3.98 9 9 9c5.2 0 8.63-3.67 8.63-8.84 0-.59-.06-1.04-.16-1.46Z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </div>
          </form>

          <div className="relative hidden md:block rounded-r-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E214A] to-[#0A1836] md:border-l md:border-white/10" />
            <div className="relative z-10 grid min-h-[480px] place-items-center p-8">
              <img
                src="/hvh-logo.png"
                alt="HVH Hospital"
                className="h-[220px] w-[220px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,.35)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
