import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addMinutes, set } from "date-fns";
import { useGryndFlowStore, type Task } from "./store";
import { TaskItem } from "./TaskItem";
import { EditPopover } from "./EditPopover";
import { TaskEditorPanel } from "./TaskEditorPanel";
import { SESSION_COLORS } from "./store";

type SidebarTasksProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export function SidebarTasks({ isCollapsed, onToggleCollapse }: SidebarTasksProps) {
  const tasks = useGryndFlowStore((state) => state.tasks);
  const addTask = useGryndFlowStore((state) => state.addTask);
  const removeTask = useGryndFlowStore((state) => state.removeTask);
  const updateTask = useGryndFlowStore((state) => state.updateTask);
  const addBlock = useGryndFlowStore((state) => state.addBlock);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editTags, setEditTags] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [editEstimate, setEditEstimate] = useState<number>(60);
  const [editEarliest, setEditEarliest] = useState("Anytime");
  const [editDueDate, setEditDueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [editRepeat, setEditRepeat] = useState("No repeat");
  const [editFlexible, setEditFlexible] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isInboxOpen, setIsInboxOpen] = useState(true);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editorTask, setEditorTask] = useState<Task | null>(null);

  const parseDuration = (value: string) => {
    const hourMatch = value.match(/(\d+)\s*h/i);
    const minuteMatch = value.match(/(\d+)\s*m/i);
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
    return hours > 0 || minutes > 0 ? hours * 60 + minutes : 60;
  };

  const stripDuration = (value: string) =>
    value
      .replace(/(\d+)\s*h/gi, "")
      .replace(/(\d+)\s*m/gi, "")
      .trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    const rangeMatch = raw.match(
      /^(.*?)\s*(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i
    );

    if (rangeMatch) {
      const [, titleRaw, sh, sm, sMer, eh, em, eMer] = rangeMatch;
      const sMerClean = sMer?.toLowerCase().replace(/\./g, "").trim() || "am";
      const eMerClean = eMer.toLowerCase().replace(/\./g, "").trim();
      const startHour =
        (parseInt(sh, 10) % 12) + (sMerClean === "pm" ? 12 : 0);
      const endHour =
        (parseInt(eh, 10) % 12) + (eMerClean === "pm" ? 12 : 0);
      const startMinute = sm ? parseInt(sm, 10) : 0;
      const endMinute = em ? parseInt(em, 10) : 0;

      const today = new Date();
      const startTime = set(today, {
        hours: startHour,
        minutes: startMinute,
        seconds: 0,
        milliseconds: 0,
      });
      let endTime = set(today, {
        hours: endHour,
        minutes: endMinute,
        seconds: 0,
        milliseconds: 0,
      });

      if (endTime <= startTime) {
        endTime = addMinutes(endTime, 12 * 60);
      }

      const durationMinutes =
        (endTime.getTime() - startTime.getTime()) / 60000;
      const taskId = uuidv4();

      addTask({
        id: taskId,
        title: titleRaw.trim(),
        duration: Math.max(15, Math.round(durationMinutes)),
        created_at: new Date().toISOString(),
        color: SESSION_COLORS[0],
      });

      addBlock({
        id: uuidv4(),
        title: titleRaw.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "pending",
        origin: "manual",
        color: SESSION_COLORS[0],
      });

      setInput("");
      inputRef.current?.focus();
      return;
    }

    const duration = parseDuration(raw);
    const title = stripDuration(raw);

    addTask({
      id: uuidv4(),
      title: title || raw,
      duration,
      created_at: new Date().toISOString(),
      color: SESSION_COLORS[0],
    });

    setInput("");
    inputRef.current?.focus();
  };

  const handleSaveTask = (task: Partial<Task>) => {
    addTask({
      id: uuidv4(),
      title: task.title?.trim() || "Untitled task",
      duration: task.duration ?? 60,
      created_at: new Date().toISOString(),
      tags: task.tags,
      priority: task.priority,
      earliest_start: task.earliest_start,
      due_date: task.due_date,
      notes: task.notes,
      color: task.color ?? SESSION_COLORS[0],
    });
    setTaskEditorOpen(false);
  };

  const startEdit = (taskId: string, title: string, duration?: number) => {
    const durationText =
      typeof duration === "number" ? ` ${Math.round(duration)}m` : "";
    setEditingId(taskId);
    setEditValue(`${title}${durationText}`);
    setEditDuration(duration ?? 60);
    const existing = tasks.find((task) => task.id === taskId);
    setEditTags((existing?.tags ?? []).join(", "));
    setEditPriority(existing?.priority ?? "medium");
    setEditEstimate(existing?.estimate_minutes ?? duration ?? 60);
    setEditEarliest(existing?.earliest_start ?? "Anytime");
    setEditDueDate(
      existing?.due_date ?? new Date().toISOString().slice(0, 10)
    );
    setEditRepeat(existing?.repeat ?? "No repeat");
    setEditFlexible(existing?.flexible ?? false);
    setEditNotes(existing?.notes ?? "");
  };

  const submitEdit = (taskId: string) => {
    const rawEdit = editValue.trim();
    if (!rawEdit) {
      setEditingId(null);
      return;
    }
    const duration = parseDuration(rawEdit);
    const title = stripDuration(rawEdit) || rawEdit;
    updateTask(taskId, {
      title,
      duration,
      tags: editTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      priority: editPriority,
      estimate_minutes: editEstimate,
      earliest_start: editEarliest,
      due_date: editDueDate,
      repeat: editRepeat,
      flexible: editFlexible,
      notes: editNotes,
    });

    setEditingId(null);
  };

  return (
    <aside
      className={`flex h-full flex-col gap-4 border-r border-gray-900 bg-[#0b0b0c] px-4 py-6 transition-all duration-200 ${
        isCollapsed ? "w-16" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              GryndFlow
            </div>
            <div className="mt-2 flex items-center justify-between text-lg font-semibold text-gray-100">
              <span>Inbox ({tasks.length})</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Drag a task into the timeline to schedule.
            </p>
          </div>
        )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full border border-gray-800 bg-[#141415] px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
          >
            {isCollapsed ? "›" : "‹"}
          </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTaskEditorOpen(true)}
            className="w-full rounded-2xl border border-gray-800 bg-[#111215] px-3 py-2 text-left text-sm font-semibold text-gray-100 transition hover:border-sky-500/50 hover:bg-[#13161f]"
          >
            + New task with details
          </button>
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              + Quick add
            </label>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Physics from 9am to 11am"
              className="w-full rounded-xl border border-gray-800 bg-[#111112] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </form>
        </div>
      )}

      {!isCollapsed && isInboxOpen && (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <TaskItem
                task={task}
                onEditStart={() => startEdit(task.id, task.title, task.duration)}
                onDelete={() => removeTask(task.id)}
              />
            </div>
          ))}
        </div>
      )}
      <TaskEditorPanel
        open={taskEditorOpen}
        initialTask={editorTask}
        onClose={() => setTaskEditorOpen(false)}
        onSave={handleSaveTask}
      />

      {editingId && (
        <EditPopover
          title="Edit Task"
          onClose={() => setEditingId(null)}
          onSave={() => submitEdit(editingId)}
          onDelete={() => {
            removeTask(editingId);
            setEditingId(null);
          }}
        >
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Title
              </div>
              <input
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                className="mt-2 w-full rounded-md border border-gray-700 bg-[#111112] px-3 py-2 text-sm text-gray-100 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Tags
              </div>
              <input
                value={editTags}
                onChange={(event) => setEditTags(event.target.value)}
                placeholder="tag1, tag2"
                className="mt-2 w-full rounded-md border border-gray-700 bg-[#111112] px-3 py-2 text-sm text-gray-100 focus:border-blue-500/60 focus:outline-none"
              />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Duration (min)
              </div>
              <input
                value={editDuration}
                onChange={(event) =>
                  setEditDuration(Number(event.target.value || 0))
                }
                onBlur={() =>
                  setEditValue(`${stripDuration(editValue)} ${editDuration}m`)
                }
                className="mt-2 w-28 rounded-md border border-gray-700 bg-[#111112] px-3 py-2 text-sm text-gray-100 focus:border-blue-500/60 focus:outline-none"
              />
            </div>
            <div className="space-y-2 rounded-xl border border-gray-800 bg-[#111112] px-3 py-2 text-[11px] text-gray-300">
              <div className="flex items-center justify-between">
                <span>Task list</span>
                <span className="text-blue-200">Inbox</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Importance</span>
                <select
                  value={editPriority}
                  onChange={(event) =>
                    setEditPriority(event.target.value as "low" | "medium" | "high")
                  }
                  className="rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[11px] text-gray-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimate</span>
                <input
                  value={editEstimate}
                  onChange={(event) =>
                    setEditEstimate(Number(event.target.value || 0))
                  }
                  className="w-16 rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[11px] text-gray-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Earliest start</span>
                <input
                  value={editEarliest}
                  onChange={(event) => setEditEarliest(event.target.value)}
                  className="w-24 rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[11px] text-gray-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Due date</span>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(event) => setEditDueDate(event.target.value)}
                  className="rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[11px] text-gray-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Repeat</span>
                <input
                  value={editRepeat}
                  onChange={(event) => setEditRepeat(event.target.value)}
                  className="w-24 rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[11px] text-gray-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Flexible</span>
                <input
                  type="checkbox"
                  checked={editFlexible}
                  onChange={(event) => setEditFlexible(event.target.checked)}
                />
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Notes
              </div>
              <textarea
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                className="mt-2 h-20 w-full rounded-md border border-gray-700 bg-[#111112] px-3 py-2 text-sm text-gray-100 focus:border-blue-500/60 focus:outline-none"
              />
            </div>
          </div>
        </EditPopover>
      )}
    </aside>
  );
}
