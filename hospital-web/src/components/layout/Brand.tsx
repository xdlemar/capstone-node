import { hvhLogoUrl } from "@/lib/branding";

export function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      {/* Logo */}
      <img
        src={hvhLogoUrl}
        alt="HVH Hospital"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/20 shadow-md object-contain"
        style={{ imageRendering: "auto" }}
      />
      {/* Text */}
      <div className="leading-tight">
        <div className="text-white font-semibold tracking-wide drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
          HVH HOSPITAL
        </div>
        <div className="text-white/70 text-xs">Logistics 1</div>
      </div>
    </div>
  )
}
