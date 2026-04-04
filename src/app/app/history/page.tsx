"use client";

import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { HistoryTable } from "@/components/history/history-table";
import { TodoHistoryCard } from "@/components/todo/todo-history-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getDashboardAnalytics } from "@/lib/analytics";
import { subjects } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";

export default function HistoryPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const sessions = useAppStore((state) => state.sessions);
  const todos = useAppStore((state) => state.todos);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const clearSessions = useAppStore((state) => state.clearSessions);
  const [modeFilter, setModeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesMode = modeFilter === "all" || session.mode === modeFilter;
      const matchesSubject = subjectFilter === "all" || session.subjectId === subjectFilter;
      const matchesStatus = statusFilter === "all" || session.status === statusFilter;
      const search = query.trim().toLowerCase();
      const matchesQuery =
        search.length === 0 ||
        session.note?.toLowerCase().includes(search) ||
        session.subjectLabel.toLowerCase().includes(search);

      return matchesMode && matchesSubject && matchesStatus && Boolean(matchesQuery);
    });
  }, [modeFilter, query, sessions, statusFilter, subjectFilter]);
  const analytics = useMemo(() => getDashboardAnalytics(sessions, todos), [sessions, todos]);

  if (!hydrated) {
    return <div className="h-[420px] rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)]" />;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-[30px]">
        <CardContent className="grid gap-3 px-6 py-6 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
          <Select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
            <option value="all">All modes</option>
            <option value="pomodoro">Pomodoro</option>
            <option value="countdown">Countdown</option>
            <option value="stopwatch">Stopwatch</option>
            <option value="deep-focus">Deep Focus</option>
          </Select>
          <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="interrupted">Interrupted</option>
          </Select>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes or subjects" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="danger" disabled={sessions.length === 0}>
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every saved session from local storage. The action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="danger" onClick={() => clearSessions()}>
                    Clear history
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          {filteredSessions.length === 0 ? (
            <EmptyState
              title="No matching sessions"
              description="Adjust the filters or start saving sessions from the timer workspace."
            />
          ) : (
            <HistoryTable sessions={filteredSessions} onDelete={deleteSession} />
          )}
        </div>
        <TodoHistoryCard
          title="Task history"
          description="Recently completed todo items alongside your session log."
          items={analytics.todoSummary.recentCompleted}
        />
      </div>
    </div>
  );
}
