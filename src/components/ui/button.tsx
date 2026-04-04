import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[#111315] hover:brightness-110 shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        secondary:
          "border border-[var(--border-strong)] bg-[var(--bg-panel-strong)] text-[var(--text)] hover:border-[var(--accent)]/35 hover:bg-[var(--bg-panel)]",
        ghost: "text-[var(--text-muted)] hover:bg-white/4 hover:text-[var(--text)]",
        subtle:
          "bg-[var(--accent-soft)] text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--accent-soft)_88%,white_12%)]",
        danger:
          "border border-[rgba(245,139,139,0.32)] bg-[rgba(245,139,139,0.1)] text-[#ffd9d9] hover:bg-[rgba(245,139,139,0.16)]",
      },
      size: {
        sm: "h-9 px-3.5",
        default: "h-11 px-4.5",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

