import * as React from "react";

import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "range", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "focus-ring h-2 w-full cursor-pointer appearance-none rounded-full bg-white/8 accent-[var(--accent)]",
        className,
      )}
      {...props}
    />
  ),
);

Slider.displayName = "Slider";

