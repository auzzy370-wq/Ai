import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-sm shadow-black/20",
        secondary: "bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-300",
        outline: "border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-800",
        ghost: "hover:bg-slate-100 text-slate-700",
        danger: "bg-rose-600 text-white hover:bg-rose-500",
      },
      size: {
        default: "min-h-11 px-4 py-2 sm:min-h-10",
        sm: "min-h-10 rounded-md px-3 text-xs sm:min-h-8",
        lg: "min-h-12 rounded-md px-6 sm:min-h-11 sm:px-8",
        icon: "h-11 w-11 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
