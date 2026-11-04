"use client";
import { useState, useRef } from "react";
import { Button, Dialog, Notice } from "@/components/primitives";
import { Icon } from "@/components/icons";
import type { Snapshot, Task } from "@/lib/domain";
import type { WorkspaceRepository } from "@/lib/repository";

type Editor = {
  id: string;
  title: string;
  tag: string;
  version: number;
  create: boolean;
};
export function TaskStack({
  snapshot,
  repo,
  run,
  busy,
  online,
}: {
  snapshot: Snapshot;
  repo: WorkspaceRepository;
  run: (op: () => Promise<Snapshot>) => Promise<boolean>;
  busy: boolean;
  online: boolean;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const tagInput = useRef<HTMLInputElement>(null);
  const [remove, setRemove] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const active = snapshot.tasks
    .filter((t) => !t.is_completed)
    .sort((a, b) => (a.active_slot ?? 0) - (b.active_slot ?? 0));
  const completed = snapshot.tasks.filter((t) => t.is_completed);
  function add() {
    setError("");
    setEditor({
      id: crypto.randomUUID(),
      title: "",
      tag: "Client Work",
      version: 0,
      create: true,
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;
    if (
      !editor.title.trim() ||
      editor.title.trim().length > 240 ||
      !editor.tag.trim() ||
      editor.tag.trim().length > 40
    ) {
      setError("Add a title of 1–240 characters and a tag of 1–40 characters.");
      if (!editor.title.trim() || editor.title.trim().length > 240)
        titleInput.current?.focus();
      else tagInput.current?.focus();
      return;
    }
    const ok = await run(() =>
      repo.task(
        editor.create ? "create" : "edit",
        editor.id,
        editor.version,
        editor.title,
        editor.tag,
      ),
    );
    if (ok) setEditor(null);
    else
      setError(
        "The task wasn’t saved. Check the workspace message, then try again.",
      );
  }
  return (
    <section className="panel tasks-panel" aria-labelledby="tasks-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tasks-title">Three Must-Wins</h2>
        <span className="count-label">{active.length} / 3 active</span>
      </div>
      <ol className="task-list">
        {[1, 2, 3].map((slot) => {
          const task = active.find((t) => t.active_slot === slot);
          return (
            <li
              key={slot}
              className={
                snapshot.timer.task_id === task?.id &&
                snapshot.timer.state !== "idle"
                  ? "current-task"
                  : ""
              }
            >
              <span className="task-number">
                {String(slot).padStart(2, "0")}
              </span>
              {task ? (
                <>
                  <label className="task-check">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={busy || !online}
                      onChange={() =>
                        void run(() =>
                          repo.task("complete", task.id, task.version),
                        )
                      }
                    />
                    <span>{task.title}</span>
                  </label>
                  <span className="tag">{task.tag}</span>
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label={`Edit ${task.title}`}
                    title={`Edit ${task.title}`}
                    disabled={busy || !online}
                    onClick={() => {
                      setError("");
                      setEditor({
                        id: task.id,
                        title: task.title,
                        tag: task.tag,
                        version: task.version,
                        create: false,
                      });
                    }}
                  >
                    <Icon name="edit" />
                  </Button>
                </>
              ) : (
                <button
                  className="empty-slot"
                  onClick={add}
                  disabled={busy || !online}
                >
                  <Icon name="plus" />
                  <span>Add a priority</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="fine-print text-left">
        {!online
          ? "Reconnect to change your tasks."
          : active.length === 3
            ? "Finish one to make space for the next."
            : "Make space for what matters. Three priorities at most."}
      </p>
      {completed.length > 0 && (
        <details className="completed-list">
          <summary>
            Completed today <span>{completed.length}</span>
          </summary>
          <p className="fine-print text-left">
            Reopen a task when there is an empty priority slot.
          </p>
          <ul>
            {completed.map((t) => (
              <li key={t.id}>
                <span>{t.title}</span>
                <Button
                  variant="ghost"
                  disabled={busy || !online || active.length === 3}
                  onClick={() =>
                    void run(() => repo.task("reopen", t.id, t.version))
                  }
                  aria-label={`Reopen ${t.title}`}
                >
                  Reopen
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <Dialog
        open={!!editor}
        title={
          editor?.create ? "Make room for a priority" : "Edit your priority"
        }
        onClose={() => {
          if (!busy) setEditor(null);
        }}
      >
        <form onSubmit={(e) => void save(e)} noValidate>
          <label className="field">
            <span>Task title</span>
            <input
              name="title"
              ref={titleInput}
              autoFocus
              value={editor?.title ?? ""}
              maxLength={240}
              onChange={(e) =>
                setEditor((v) => (v ? { ...v, title: e.target.value } : v))
              }
              aria-invalid={!!error}
              aria-describedby={error ? "task-editor-error" : undefined}
              placeholder="What will move your day forward?"
            />
          </label>
          <label className="field">
            <span>Tag</span>
            <input
              name="tag"
              ref={tagInput}
              value={editor?.tag ?? ""}
              maxLength={40}
              list="task-tags"
              onChange={(e) =>
                setEditor((v) => (v ? { ...v, tag: e.target.value } : v))
              }
            />
            <datalist id="task-tags">
              <option value="Client Work" />
              <option value="Internal Admin" />
              <option value="Meetings" />
            </datalist>
          </label>
          {error && (
            <div id="task-editor-error">
              <Notice error>{error}</Notice>
            </div>
          )}
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => setEditor(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" busy={busy} disabled={!online}>
              {editor?.create ? "Add priority" : "Save changes"}
            </Button>
          </div>
          {editor && !editor.create && (
            <Button
              variant="ghost"
              className="danger-link"
              disabled={busy}
              onClick={() => {
                setRemove(
                  snapshot.tasks.find((t) => t.id === editor.id) ?? null,
                );
                setEditor(null);
              }}
            >
              <Icon name="trash" />
              Delete task
            </Button>
          )}
        </form>
      </Dialog>
      <Dialog
        open={!!remove}
        title="Delete this task?"
        onClose={() => {
          if (!busy) setRemove(null);
        }}
      >
        <p className="supporting">
          “{remove?.title}” will leave your stack. Past completion and focus
          records remain in your history.
        </p>
        <div className="dialog-actions">
          <Button
            variant="outline"
            autoFocus
            disabled={busy}
            onClick={() => setRemove(null)}
          >
            Keep task
          </Button>
          <Button
            variant="danger"
            busy={busy}
            onClick={async () => {
              if (
                remove &&
                (await run(() =>
                  repo.task("delete", remove.id, remove.version),
                ))
              )
                setRemove(null);
            }}
          >
            Delete task
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
