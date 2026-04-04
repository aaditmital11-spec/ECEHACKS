import { subjects } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LabelChip({ subjectId, className }: { subjectId: string; className?: string }) {
  const subject = subjects.find((item) => item.id === subjectId) ?? subjects[subjects.length - 1];

  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium", className)}
      style={{ backgroundColor: subject.color, color: subject.textColor }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: subject.textColor }} />
      {subject.label}
    </span>
  );
}

