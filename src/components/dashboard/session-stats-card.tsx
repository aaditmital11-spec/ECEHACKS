import { Card, CardContent } from "@/components/ui/card";

export function SessionStatsCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="rounded-[28px]">
      <CardContent className="px-6 py-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">{label}</p>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">{value}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{helper}</p>
      </CardContent>
    </Card>
  );
}

