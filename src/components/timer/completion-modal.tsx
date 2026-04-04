"use client";

import { Coffee, RotateCcw, Save, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isStudyMode, modeMeta } from "@/lib/constants";
import { formatClock, formatDurationLabel } from "@/lib/time";
import type { ActiveTimerSession, CompletionDraft } from "@/types/app";

import { LabelChip } from "./label-chip";

export function CompletionModal({
  draft,
  activeSession,
  onSave,
  onStartAnother,
  onStartBreak,
  onDismiss,
  onNoteChange,
}: {
  draft: CompletionDraft | null;
  activeSession: ActiveTimerSession | null;
  onSave: () => void;
  onStartAnother: () => void;
  onStartBreak: () => void;
  onDismiss: () => void;
  onNoteChange: (note: string) => void;
}) {
  const showBreakAction =
    Boolean(draft && isStudyMode(draft.mode) && activeSession && activeSession.mode === draft.mode && activeSession.pomodoroPhase !== "focus");

  return (
    <Dialog
      open={Boolean(draft)}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss();
        }
      }}
    >
      <DialogContent>
        {draft ? (
          <>
            <DialogHeader>
              <DialogTitle>Session complete</DialogTitle>
              <DialogDescription>
                Save the session, add a quick note if useful, and decide what comes next.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Subject</p>
                  <div className="mt-3">
                    <LabelChip subjectId={draft.subjectId} />
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Mode</p>
                  <p className="mt-3 text-sm font-medium text-[var(--text)]">{modeMeta[draft.mode].label}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Time completed</p>
                  <p className="mt-3 text-sm font-medium text-[var(--text)]">{formatDurationLabel(draft.actualDurationMs)}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Ended</p>
                  <p className="mt-3 text-sm font-medium text-[var(--text)]">{formatClock(draft.endedAt)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Outcome</p>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {draft.completedAsPlanned
                    ? "Completed as planned."
                    : "Stopped before the planned duration. You can still save the progress."}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]" htmlFor="completion-note">
                  Quick note
                </label>
                <Textarea
                  id="completion-note"
                  value={draft.note}
                  onChange={(event) => onNoteChange(event.target.value)}
                  placeholder="What did you cover in this session?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onDismiss()}>
                <X className="size-4" />
                Close
              </Button>
              <Button variant="secondary" onClick={() => onSave()}>
                <Save className="size-4" />
                Save only
              </Button>
              {showBreakAction ? (
                <Button variant="subtle" onClick={() => onStartBreak()}>
                  <Coffee className="size-4" />
                  Start break
                </Button>
              ) : null}
              <Button onClick={() => onStartAnother()}>
                <RotateCcw className="size-4" />
                Start another session
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
