import { useEffect, useState } from "react";
import type { Task } from "./store";
import { SESSION_COLORS } from "./store";

type TaskEditorPanelProps = {
  open: boolean;
  initialTask?: Task | null;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: () => void;
};

export function TaskEditorPanel({
  open,
  initialTask,
  onClose,
  onSave,
  onDelete,
}: TaskEditorPanelProps) {
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [notes, setNotes] = useState(initialTask?.notes ?? "");
  const [tags, setTags] = useState((initialTask?.tags ?? []).join(", "));
  const [priority, setPriority] = useState<Task["priority"]>(
    initialTask?.priority ?? "medium"
  );
  const [duration, setDuration] = useState(initialTask?.duration ?? 60);
  const [earliestStart, setEarliestStart] = useState(
    initialTask?.earliest_start ?? ""
  );
  const [dueDate, setDueDate] = useState(
    initialTask?.due_date ?? new Date().toISOString().slice(0, 10)
  );
  const [color, setColor] = useState(initialTask?.color ?? SESSION_COLORS[0]);

  useEffect(() => {
    setTitle(initialTask?.title ?? "");
    setNotes(initialTask?.notes ?? "");
    setTags((initialTask?.tags ?? []).join(", "));
    setPriority(initialTask?.priority ?? "medium");
    setDuration(initialTask?.duration ?? 60);
    setEarliestStart(initialTask?.earliest_start ?? "");
    setDueDate(initialTask?.due_date ?? new Date().toISOString().slice(0, 10));
    setColor(initialTask?.color ?? SESSION_COLORS[0]);
  }, [initialTask, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-gray-100">
              {initialTask ? "Edit task" : "Create task"}
            </div>
            <div className="mt-1 text-sm text-gray-400">
              Add clear details, tags, and schedule intent.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-800 bg-[#12131a] px-3 py-2 text-sm text-gray-300 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 px-6 py-5 text-sm text-gray-200">
          <div className="space-y-3 rounded-3xl border border-gray-800 bg-[#11131c] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
              Task details
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <div className="text-gray-300">Task name</div>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Physics practice"
                />
              </label>
              <label className="space-y-2">
                <div className="text-gray-300">Estimated duration (minutes)</div>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="space-y-2 rounded-3xl border border-gray-800 bg-[#11131c] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Priority</div>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as Task["priority"])
                }
                className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="low">Low</option>
                <option value="medium">Normal</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="space-y-2 rounded-3xl border border-gray-800 bg-[#11131c] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Earliest start</div>
              <input
                type="time"
                value={earliestStart}
                onChange={(event) => setEarliestStart(event.target.value)}
                className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>

            <label className="space-y-2 rounded-3xl border border-gray-800 bg-[#11131c] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Due date</div>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-[#11131c] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
              Notes & tags
            </div>
            <div className="mt-4 space-y-4">
              <label className="space-y-2">
                <div className="text-gray-300">Notes</div>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-3 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Add any context, subtask details, or objectives."
                />
              </label>
              <label className="space-y-2">
                <div className="text-gray-300">Tags</div>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="w-full rounded-2xl border border-gray-800 bg-[#0b0c12] px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="e.g. physics, revision"
                />
              </label>
              <div className="space-y-2">
                <div className="text-gray-300">Color</div>
                <div className="flex flex-wrap gap-2">
                  {SESSION_COLORS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className={`h-9 w-9 rounded-full border transition ${
                        color === option
                          ? "border-white shadow-lg shadow-white/10"
                          : "border-gray-800"
                      }`}
                      style={{ backgroundColor: option }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-800 px-4 py-2 text-sm text-gray-300 hover:border-white/20"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {initialTask && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-white/5"
              >
                Delete
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                onSave({
                  title: title.trim() || "Untitled task",
                  notes,
                  tags: tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  priority,
                  duration,
                  earliest_start: earliestStart,
                  due_date: dueDate,
                  color,
                })
              }
              className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
            >
              Save task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
