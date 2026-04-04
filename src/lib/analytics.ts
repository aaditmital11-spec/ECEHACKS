import { modeMeta, subjects } from "@/lib/constants";
import { addDays, endOfDay, formatDate, startOfDay, startOfWeek } from "@/lib/time";
import type { SessionRecord, TimerMode, TodoItem } from "@/types/app";

export interface OverviewMetrics {
  todayFocusMs: number;
  weekFocusMs: number;
  sessionsThisWeek: number;
  averageSessionMs: number;
  completionRate: number;
  streakCount: number;
  bestDayLabel: string;
}

export interface BreakdownItem {
  label: string;
  value: number;
}

export interface TrendPoint {
  day: string;
  minutes: number;
}

export interface DashboardAnalytics {
  overview: OverviewMetrics;
  recentSessions: SessionRecord[];
  subjectBreakdown: BreakdownItem[];
  modeBreakdown: BreakdownItem[];
  trend: TrendPoint[];
  todoSummary: {
    openCount: number;
    completedToday: number;
    completedThisWeek: number;
    recentCompleted: TodoItem[];
  };
}

function sumDuration(sessions: SessionRecord[]) {
  return sessions.reduce((total, session) => total + session.actualDurationMs, 0);
}

function percentage(completed: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export function getDashboardAnalytics(sessions: SessionRecord[], todos: TodoItem[] = [], now = Date.now()): DashboardAnalytics {
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const completedSessions = sessions.filter((session) => session.status === "completed");
  const todaySessions = completedSessions.filter(
    (session) => session.endedAt >= todayStart && session.endedAt <= endOfDay(now),
  );
  const weekSessions = sessions.filter((session) => session.endedAt >= weekStart && session.endedAt <= weekEnd);

  const trend = Array.from({ length: 7 }, (_, index) => {
    const dayStart = addDays(weekStart, index);
    const dayEnd = endOfDay(dayStart);
    const daySessions = completedSessions.filter(
      (session) => session.endedAt >= dayStart && session.endedAt <= dayEnd,
    );

    return {
      day: formatDate(dayStart),
      minutes: Math.round(sumDuration(daySessions) / 60000),
    };
  });

  const bestDay = trend.reduce((best, current) => (current.minutes > best.minutes ? current : best), trend[0] ?? {
    day: "None",
    minutes: 0,
  });

  const subjectBreakdown = subjects
    .map((subject) => ({
      label: subject.label,
      value: Math.round(
        sumDuration(completedSessions.filter((session) => session.subjectId === subject.id)) / 60000,
      ),
    }))
    .filter((item) => item.value > 0);

  const modeBreakdown = (Object.keys(modeMeta) as TimerMode[])
    .map((mode) => ({
      label: modeMeta[mode].label,
      value: Math.round(sumDuration(completedSessions.filter((session) => session.mode === mode)) / 60000),
    }))
    .filter((item) => item.value > 0);

  const completedTodos = todos.filter((todo) => todo.completedAt);
  const completedToday = completedTodos.filter((todo) => {
    const completedAt = todo.completedAt ?? 0;
    return completedAt >= todayStart && completedAt <= endOfDay(now);
  });
  const completedThisWeek = completedTodos.filter((todo) => {
    const completedAt = todo.completedAt ?? 0;
    return completedAt >= weekStart && completedAt <= weekEnd;
  });

  return {
    overview: {
      todayFocusMs: sumDuration(todaySessions),
      weekFocusMs: sumDuration(weekSessions.filter((session) => session.status === "completed")),
      sessionsThisWeek: weekSessions.length,
      averageSessionMs: completedSessions.length ? Math.round(sumDuration(completedSessions) / completedSessions.length) : 0,
      completionRate: percentage(
        sessions.filter((session) => session.status === "completed").length,
        sessions.length,
      ),
      streakCount: getCurrentStreak(completedSessions, now),
      bestDayLabel: bestDay.day,
    },
    recentSessions: [...sessions].sort((a, b) => b.endedAt - a.endedAt).slice(0, 6),
    subjectBreakdown,
    modeBreakdown,
    trend,
    todoSummary: {
      openCount: todos.filter((todo) => !todo.completedAt).length,
      completedToday: completedToday.length,
      completedThisWeek: completedThisWeek.length,
      recentCompleted: [...completedTodos]
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        .slice(0, 6),
    },
  };
}

export function getCurrentStreak(sessions: SessionRecord[], now = Date.now()) {
  const completed = sessions
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.endedAt - a.endedAt);

  if (completed.length === 0) {
    return 0;
  }

  const uniqueDays = Array.from(new Set(completed.map((session) => startOfDay(session.endedAt))));
  const today = startOfDay(now);
  let cursor = uniqueDays[0] === today ? today : today - 86400000;
  let streak = 0;

  while (uniqueDays.includes(cursor)) {
    streak += 1;
    cursor -= 86400000;
  }

  return streak;
}
