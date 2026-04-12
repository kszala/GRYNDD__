import { useDraggable } from "@dnd-kit/core";
import type { Task } from "./store";

type TaskItemProps = {
  task: Task;
  onEditStart: () => void;
  onDelete: () => void;
};

const getPriorityClasses = (priority?: Task["priority"]) => {
  switch (priority) {
    case "high":
      return "bg-rose-500/10 text-rose-300 border border-rose-500/20";
    case "medium":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/20";
    case "low":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
    default:
      return "bg-slate-700/30 text-slate-300 border border-slate-700/40";
  }
};

export function TaskItem({ task, onEditStart, onDelete }: TaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { task },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: "none",
        borderLeftColor: task.color ?? "#0ea5e9",
        borderLeftWidth: 4,
      }}
      {...listeners}
      {...attributes}
      className={`group rounded-lg border border-gray-800 bg-[#15171a] px-3 py-3 text-sm text-gray-100 shadow-sm transition-all duration-150 ${
        isDragging
          ? "opacity-70 cursor-grabbing"
          : "cursor-grab hover:border-gray-700 hover:bg-gray-900"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-1 h-4 w-4 rounded-sm border border-gray-800 bg-[#1b1c1f]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-100">
            {task.title}
          </div>
          {task.subject ? (
            <div className="mt-1 inline-flex items-center gap-2 text-[10px] text-slate-400">
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1">
                {task.subject}
              </span>
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            {task.priority && (
              <span
                className={`rounded-full px-2 py-1 font-semibold uppercase tracking-[0.16em] ${getPriorityClasses(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>
            )}
            {task.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
          {typeof task.duration === "number" && (
            <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-gray-500">
              {task.duration} min
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition duration-150 group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEditStart();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="rounded-md border border-gray-800 bg-[#111112] px-2 py-1 text-[12px] text-gray-300 hover:border-gray-700 hover:text-gray-100"
          >
            {"\u270E"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="rounded-md border border-gray-800 bg-[#111112] px-2 py-1 text-[12px] text-gray-400 hover:border-gray-700 hover:text-rose-300"
          >
            {"\u00D7"}
          </button>
        </div>
      </div>
    </div>
  );
}
