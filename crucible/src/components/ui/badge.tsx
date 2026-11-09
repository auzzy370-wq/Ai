import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "brand" | "amber" | "rose" | "emerald" | "violet";
}) {
  const styles = {
    default: "border-slate-300 bg-slate-100 text-slate-700",
    brand: "border-orange-300 bg-orange-50 text-orange-800",
    amber: "border-amber-300 bg-amber-50 text-amber-800",
    rose: "border-rose-300 bg-rose-50 text-rose-800",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-800",
    violet: "border-violet-300 bg-violet-50 text-violet-800",
  }[variant];
  return (
    <div
      className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", styles, className)}
      {...props}
    />
  );
}
