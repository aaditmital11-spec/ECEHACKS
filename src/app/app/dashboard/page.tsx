"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";
import { SessionStatsCard } from "@/components/dashboard/session-stats-card";
import { EmptyState } from "@/components/empty-state";
import { TodoHistoryCard } from "@/components/todo/todo-history-card";
import { LabelChip } from "@/components/timer/label-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardAnalytics } from "@/lib/analytics";
import { modeMeta } from "@/lib/constants";
import { formatClock, formatDurationLabel } from "@/lib/time";
import { useAppStore } from "@/store/app-store";

const chartColors = ["#ff7a52", "#ff9560", "#db5d46", "#ffab73", "#d66d54", "#c95a41"];

export default function DashboardPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const sessions = useAppStore((state) => state.sessions);
  const todos = useAppStore((state) => state.todos);
  const analytics = useMemo(() => getDashboardAnalytics(sessions, todos), [sessions, todos]);

  if (!hydrated) {
    return <div className="h-[460px] rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />;
  }

  if (sessions.length === 0 && todos.length === 0) {
    return (
      <EmptyState
        title="Analytics appear once you save sessions or complete tasks"
        description="Use the timer workspace to save sessions and keep your todo list moving. The dashboard will then calculate focus metrics and task history."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SessionStatsCard
          label="Today's focus"
          value={formatDurationLabel(analytics.overview.todayFocusMs)}
          helper="Completed focus time saved today."
        />
        <SessionStatsCard
          label="Weekly focus"
          value={formatDurationLabel(analytics.overview.weekFocusMs)}
          helper={`${analytics.overview.sessionsThisWeek} sessions ended this week.`}
        />
        <SessionStatsCard
          label="Completion rate"
          value={`${analytics.overview.completionRate}%`}
          helper="Completed sessions divided by all saved sessions."
        />
        <SessionStatsCard
          label="Average session"
          value={formatDurationLabel(analytics.overview.averageSessionMs)}
          helper={`Current streak: ${analytics.overview.streakCount} days.`}
        />
        <SessionStatsCard
          label="Tasks done"
          value={`${analytics.todoSummary.completedToday}`}
          helper={`${analytics.todoSummary.completedThisWeek} tasks completed this week.`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartCard title="Trend by day" description="Completed focus minutes for each day of the current week.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trend}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#8b929c" tickLine={false} axisLine={false} />
                <YAxis stroke="#8b929c" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "#171a1d",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    color: "#f5f7fa",
                  }}
                />
                <Bar dataKey="minutes" radius={[12, 12, 0, 0]} fill="#ff7a52" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Saved sessions that contribute to your current analytics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
              >
                <div className="min-w-0">
                  <LabelChip subjectId={session.subjectId} />
                  <p className="mt-3 text-sm font-medium text-[var(--text)]">{formatDurationLabel(session.actualDurationMs)}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{modeMeta[session.mode].label}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-[var(--text-subtle)]">
                  <p>{formatClock(session.endedAt)}</p>
                  <p className="mt-2">Best day: {analytics.overview.bestDayLabel}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Focus by subject" description="Total completed minutes grouped by subject label.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.subjectBreakdown} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#8b929c" tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" stroke="#8b929c" tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "#171a1d",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    color: "#f5f7fa",
                  }}
                />
                <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                  {analytics.subjectBreakdown.map((entry, index) => (
                    <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Focus by mode" description="Total completed minutes grouped by timer mode.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.modeBreakdown}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#8b929c" tickLine={false} axisLine={false} />
                <YAxis stroke="#8b929c" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    background: "#171a1d",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    color: "#f5f7fa",
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {analytics.modeBreakdown.map((entry, index) => (
                    <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle>Task progress</CardTitle>
            <CardDescription>Todo list momentum alongside your session metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Open tasks</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
                {analytics.todoSummary.openCount}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Tasks still left in the current list.</p>
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-subtle)]">Completed today</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
                {analytics.todoSummary.completedToday}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Finished tasks recorded today.</p>
            </div>
          </CardContent>
        </Card>
        <TodoHistoryCard
          title="Recent completed tasks"
          description="The latest todo items you checked off."
          items={analytics.todoSummary.recentCompleted}
        />
      </div>
    </div>
  );
}
