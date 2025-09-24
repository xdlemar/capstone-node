import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* IMPORTANT: overflow-visible on mobile so the badge can float */}
      <Card className="relative p-0 overflow-visible md:overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
        {/* Mobile top logo (hidden on md+) */}
        <div className="md:hidden absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="h-20 w-20 rounded-full bg-white/95 ring-2 ring-white shadow-[0_10px_25px_rgba(0,0,0,.35)] grid place-items-center">
            <img
              src="/hvh-logo.png"            /* put your logo in /public */
              alt="HVH Hospital"
              className="h-16 w-16 object-contain"
            />
          </div>
        </div>

        {/* Add top padding on mobile so badge won’t overlap form */}
        <CardContent className="grid p-0 pt-16 md:pt-0 md:grid-cols-2">
          {/* LEFT: form */}
          <form className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Hospital account
                </p>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" required />
              </div>

              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </div>

              <Button type="submit" className="w-full">Login</Button>

              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              {/* Only Google (full width) */}
              <div>
                <Button variant="outline" type="button" className="w-full">
                  G <span className="sr-only">Continue with Google</span>
                </Button>
              </div>
            </div>
          </form>

          {/* RIGHT: logo panel (md+) with deeper navy and a soft divider */}
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
