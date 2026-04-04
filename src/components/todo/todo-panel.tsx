"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatClock } from "@/lib/time";
import type { TodoItem } from "@/types/app";

export function TodoPanel({
  todos,
  onAdd,
  onToggle,
  onDelete,
  onClearCompleted,
}: {
  todos: TodoItem[];
  onAdd: (text: string) => void;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
  onClearCompleted: () => void;
}) {
  const [text, setText] = useState("");
  const openTodos = useMemo(() => todos.filter((todo) => !todo.completedAt), [todos]);
  const completedTodos = useMemo(() => todos.filter((todo) => todo.completedAt), [todos]);

  function submitTodo() {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    onAdd(trimmed);
    setText("");
  }

  return (
    <Card className="rounded-[32px]">
      <CardHeader>
        <CardTitle>To do</CardTitle>
        <CardDescription>Keep the work visible while the timer runs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitTodo();
              }
            }}
            placeholder="Add a task"
          />
          <Button size="icon" onClick={submitTodo}>
            <Plus className="size-4" />
            <span className="sr-only">Add task</span>
          </Button>
        </div>

        <div className="space-y-2">
          {openTodos.length === 0 ? (
            <p className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
              No active tasks. Add a few concrete steps before you start.
            </p>
          ) : (
            openTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
              >
                <button
                  type="button"
                  onClick={() => onToggle(todo.id)}
                  className="focus-ring mt-0.5 rounded-full text-[var(--accent)]"
                >
                  <Circle className="size-4" />
                  <span className="sr-only">Complete task</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">{todo.text}</p>
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">Added {formatClock(todo.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDelete(todo.id)}>
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete task</span>
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Completed</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{completedTodos.length} tasks finished.</p>
            </div>
            <Button variant="ghost" size="sm" disabled={completedTodos.length === 0} onClick={onClearCompleted}>
              Clear completed
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {completedTodos.slice(0, 3).map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                <CheckCircle2 className="size-4 text-[var(--accent)]" />
                <span className="truncate">{todo.text}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

