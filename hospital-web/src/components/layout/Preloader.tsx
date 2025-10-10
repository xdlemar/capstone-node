import { hvhLogoUrl } from "@/lib/branding";
import { cn } from "@/lib/utils";

type PreloaderProps = {
  label?: string;
  className?: string;
};

export function FullScreenPreloader({ label, className }: PreloaderProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-gradient-to-br from-[#0F2540] via-[#112a45] to-[#061229]",
        "text-white",
        className,
      )}
    >
      <div role="status" aria-live="polite" className="relative flex flex-col items-center gap-5">
        <div className="relative grid place-items-center rounded-full bg-white/10 p-9 shadow-[0_25px_60px_rgba(6,18,41,0.55)]">
          <div className="absolute inset-0 rounded-full border border-white/25" />
          <div className="absolute -inset-3 rounded-full border border-white/10 animate-[ping_2.8s_ease-out_infinite]" />
          <img
            src={hvhLogoUrl}
            alt="HVH Hospital"
            className="relative h-28 w-28 object-contain drop-shadow-[0_12px_25px_rgba(0,0,0,0.35)]"
          />
        </div>
        <div className="flex flex-col items-center gap-1 text-sm font-medium text-white/90">
          <span>{label || "Preparing HVH Hospital systems"}</span>
          <span className="text-xs text-white/60">Please wait a moment...</span>
        </div>
      </div>
    </div>
  );
}

