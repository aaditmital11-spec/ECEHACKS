"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { modeMeta } from "@/lib/constants";
import { formatClock, formatDate, formatDurationLabel } from "@/lib/time";
import type { SessionRecord } from "@/types/app";

import { LabelChip } from "@/components/timer/label-chip";

export function HistoryTable({
  sessions,
  onDelete,
}: {
  sessions: SessionRecord[];
  onDelete: (sessionId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-[var(--border)] text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            <tr>
              <th className="px-5 py-4 font-medium">Date</th>
              <th className="px-5 py-4 font-medium">Subject</th>
              <th className="px-5 py-4 font-medium">Mode</th>
              <th className="px-5 py-4 font-medium">Planned</th>
              <th className="px-5 py-4 font-medium">Actual</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Note</th>
              <th className="px-5 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-[var(--border)] last:border-none">
                <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                  <div>{formatDate(session.endedAt)}</div>
                  <div className="mt-1 text-xs text-[var(--text-subtle)]">{formatClock(session.endedAt)}</div>
                </td>
                <td className="px-5 py-4">
                  <LabelChip subjectId={session.subjectId} />
                </td>
                <td className="px-5 py-4 text-sm text-[var(--text)]">{modeMeta[session.mode].label}</td>
                <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                  {session.plannedDurationMs ? formatDurationLabel(session.plannedDurationMs) : "Open-ended"}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--text)]">{formatDurationLabel(session.actualDurationMs)}</td>
                <td className="px-5 py-4 text-sm">
                  <span
                    className={
                      session.status === "completed" ? "text-[#c8f2e3]" : "text-[var(--warning)]"
                    }
                  >
                    {session.status}
                  </span>
                </td>
                <td className="max-w-[260px] px-5 py-4 text-sm text-[var(--text-muted)]">
                  {session.note?.trim() || "No note"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(session.id)}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete session</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 p-4 lg:hidden">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <LabelChip subjectId={session.subjectId} />
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{formatDurationLabel(session.actualDurationMs)}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDate(session.endedAt)} at {formatClock(session.endedAt)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDelete(session.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">{session.note?.trim() || "No note recorded."}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
