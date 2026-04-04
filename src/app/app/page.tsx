"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, Clock3, History } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SessionStatsCard } from "@/components/dashboard/session-stats-card";
import { TodoHistoryCard } from "@/components/todo/todo-history-card";
import { LabelChip } from "@/components/timer/label-chip";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardAnalytics } from "@/lib/analytics";
import { modeMeta } from "@/lib/constants";
import { formatClock, formatDurationLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function AppOverviewPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const sessions = useAppStore((state) => state.sessions);
  const todos = useAppStore((state) => state.todos);
  const activeSession = useAppStore((state) => state.activeSession);
  const analytics = useMemo(() => getDashboardAnalytics(sessions, todos), [sessions, todos]);

  if (!hydrated) {
    return <div className="h-[420px] rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="rounded-[32px]">
          <CardContent className="px-6 py-8 md:px-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-subtle)]">Today’s system</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-tight">Keep the session in front of you.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Start a focus block, let the timer stay honest, and use the dashboard later to review what actually got
              done.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <SessionStatsCard
                label="Today"
                value={formatDurationLabel(analytics.overview.todayFocusMs)}
                helper="Completed focus time saved today."
              />
              <SessionStatsCard
                label="This week"
                value={formatDurationLabel(analytics.overview.weekFocusMs)}
                helper={`${analytics.overview.sessionsThisWeek} sessions logged this week.`}
              />
              <SessionStatsCard
                label="Streak"
                value={`${analytics.overview.streakCount} days`}
                helper={`Best day this week: ${analytics.overview.bestDayLabel}.`}
              />
              <SessionStatsCard
                label="Tasks"
                value={`${analytics.todoSummary.completedToday}`}
                helper={`${analytics.todoSummary.openCount} still open right now.`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Current status</CardTitle>
            <CardDescription>Return to the timer or review your broader focus trends.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Active workspace</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--text)]">
                {activeSession ? "A session is in progress." : "No active session right now."}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {activeSession
                  ? "Pick up where you left off or step into Deep Focus if you want a cleaner workspace."
                  : "Choose a mode, set a subject, and start a session when you are ready."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className={cn(buttonVariants({ size: "default" }))}>
                <Clock3 className="size-4" />
                Open workspace
              </Link>
              <Link href="/app/dashboard" className={cn(buttonVariants({ variant: "secondary", size: "default" }))}>
                <BarChart3 className="size-4" />
                View dashboard
              </Link>
              <Link href="/app/history" className={cn(buttonVariants({ variant: "secondary", size: "default" }))}>
                <History className="size-4" />
                Review history
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.recentSessions.length === 0 && analytics.todoSummary.recentCompleted.length === 0 ? (
        <EmptyState
          title="No session or task history yet"
          description="Start with the timer workspace and add a few tasks. Your saved focus blocks and completed tasks will show up here."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[32px]">
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>The latest saved focus blocks, sorted by completion time.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {analytics.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <LabelChip subjectId={session.subjectId} />
                    <span className="text-xs text-[var(--text-subtle)]">{formatClock(session.endedAt)}</span>
                  </div>
                  <p className="mt-4 text-lg font-semibold tracking-tight text-[var(--text)]">
                    {formatDurationLabel(session.actualDurationMs)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{modeMeta[session.mode].label}</p>
                  <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{session.note?.trim() || "No note saved."}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <TodoHistoryCard
            title="Task history"
            description="Recently completed tasks from your study plan."
            items={analytics.todoSummary.recentCompleted.slice(0, 4)}
          />
        </div>
      )}
    </div>
  );
}
