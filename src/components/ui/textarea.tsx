import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring min-h-[112px] w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

