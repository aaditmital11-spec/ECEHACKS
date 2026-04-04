import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClock } from "@/lib/time";
import type { TodoItem } from "@/types/app";

export function TodoHistoryCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: TodoItem[];
}) {
  return (
    <Card className="rounded-[30px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
            No completed tasks yet. Your finished items will show up here.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
            >
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <CheckCircle2 className="size-4 text-[var(--accent)]" />
                  <span className="truncate">{item.text}</span>
                </div>
              </div>
              <span className="shrink-0 text-xs text-[var(--text-subtle)]">
                {item.completedAt ? formatClock(item.completedAt) : ""}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
