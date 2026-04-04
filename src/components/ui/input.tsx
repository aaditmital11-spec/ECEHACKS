import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "focus-ring flex h-11 w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

