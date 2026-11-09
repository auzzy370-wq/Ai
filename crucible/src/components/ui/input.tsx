import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex min-h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 sm:min-h-10 sm:text-sm",
        className,
      )}
      ref={ref}
      // Chrome / password managers inject attrs like __gcruniqueid before hydrate.
      suppressHydrationWarning
      {...props}
    />
  ),
);
Input.displayName = "Input";
