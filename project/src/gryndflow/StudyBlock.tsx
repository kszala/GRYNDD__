import { format, addMinutes, differenceInMinutes } from "date-fns";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useGryndFlowStore } from "./store";
import type { StudyBlock as StudyBlockType } from "./store";
import { EditPopover } from "./EditPopover";

type StudyBlockProps = {
  block: StudyBlockType;
  top: number;
  height: number;
  pxPerMinute: number;
  dayStart: Date;
  dayEnd: Date;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
};

const blockPriorityClasses = (priority?: StudyBlockType["priority"]) => {
  switch (priority) {
    case "high":
      return {
        border: "border-rose-500/80",
        accent: "bg-rose-500/10 text-rose-200",
      };
    case "medium":
      return {
        border: "border-amber-500/80",
        accent: "bg-amber-500/10 text-amber-200",
      };
    case "low":
      return {
        border: "border-emerald-500/80",
        accent: "bg-emerald-500/10 text-emerald-200",
      };
    default:
      return {
        border: "border-sky-500/70",
        accent: "bg-sky-500/10 text-sky-200",
      };
  }
};

export function StudyBlock({
  block,
  top,
  height,
  pxPerMinute,
  dayStart,
  dayEnd,
  onContextMenu,
}: StudyBlockProps) {
  const startLabel = format(new Date(block.start_time), "HH:mm");
  const endLabel = format(new Date(block.end_time), "HH:mm");
  const selectedBlockId = useGryndFlowStore((state) => state.selectedBlockId);
  const setSelectedBlockId = useGryndFlowStore(
    (state) => state.setSelectedBlockId
  );
  const updateBlock = useGryndFlowStore((state) => state.updateBlock);
  const removeBlock = useGryndFlowStore((state) => state.removeBlock);
  const isSelected = selectedBlockId === block.id;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.title);
  const [editTags, setEditTags] = useState((block.tags ?? []).join(", "));
  const [editPriority, setEditPriority] = useState(block.priority ?? "medium");
  const [editEstimate, setEditEstimate] = useState(
    block.estimate_minutes ??
      differenceInMinutes(new Date(block.end_time), new Date(block.start_time))
  );
  const [editEarliest, setEditEarliest] = useState(
    block.earliest_start ?? "Anytime"
  );
  const [editDueDate, setEditDueDate] = useState(
    block.due_date ?? new Date().toISOString().slice(0, 10)
  );
  const [editRepeat, setEditRepeat] = useState(block.repeat ?? "No repeat");
  const [editFlexible, setEditFlexible] = useState(block.flexible ?? false);
  const [editNotes, setEditNotes] = useState(block.notes ?? "");

  const [durationValue, setDurationValue] = useState(
    Math.max(
      15,
      differenceInMinutes(new Date(block.end_time), new Date(block.start_time))
    )
  );
  const resizeRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startDurationRef = useRef(durationValue);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `block-${block.id}`,
      data: { type: "block", blockId: block.id },
    });
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const priorityClasses = blockPriorityClasses(block.priority);

  const hexToRgba = (hex: string, alpha = 0.16) => {
    const trimmed = hex.replace("#", "");
    const bigint = parseInt(trimmed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const blockColor = block.color ?? "#0ea5e9";
  const backgroundColor = hexToRgba(blockColor, 0.16);
  const borderShadow = hexToRgba(blockColor, 0.35);

  useEffect(() => {
    setEditValue(block.title);
    setDurationValue(
      Math.max(
        15,
        differenceInMinutes(new Date(block.end_time), new Date(block.start_time))
      )
    );
    setEditTags((block.tags ?? []).join(", "));
    setEditPriority(block.priority ?? "medium");
    setEditEstimate(
      block.estimate_minutes ??
        differenceInMinutes(new Date(block.end_time), new Date(block.start_time))
    );
    setEditEarliest(block.earliest_start ?? "Anytime");
    setEditDueDate(block.due_date ?? new Date().toISOString().slice(0, 10));
    setEditRepeat(block.repeat ?? "No repeat");
    setEditFlexible(block.flexible ?? false);
    setEditNotes(block.notes ?? "");
  }, [block.end_time, block.start_time, block.title]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      const deltaY = event.clientY - startYRef.current;
      const deltaMinutes = Math.round(deltaY / pxPerMinute / 15) * 15;
      const nextDuration = Math.max(15, startDurationRef.current + deltaMinutes);

      const maxDuration = Math.max(
        15,
        differenceInMinutes(dayEnd, new Date(block.start_time))
      );
      const clamped = Math.min(nextDuration, maxDuration);

      setDurationValue(clamped);
      updateBlock(block.id, {
        end_time: addMinutes(new Date(block.start_time), clamped).toISOString(),
      });
    };

    const handleUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [block.id, block.start_time, dayEnd, pxPerMinute, updateBlock]);

  return (
    <>
      <div
        onClick={() => setSelectedBlockId(block.id)}
        onDoubleClick={() => setIsEditing(true)}
        onContextMenu={onContextMenu}
        className={`group absolute left-1 right-1 rounded-lg border-l-4 px-3 py-3 text-xs text-gray-100 shadow-sm transition-all duration-200 ${
          isSelected
            ? "bg-slate-950/95"
            : "bg-[#11131c]"
        } ${isDragging ? "opacity-80" : "hover:shadow-lg hover:border-slate-500"}`}
        style={{
          top,
          height,
          ...dragStyle,
          backgroundColor,
          borderColor: blockColor,
          boxShadow: `0 28px 96px -68px ${borderShadow}`,
        }}
        ref={setNodeRef}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>{startLabel} – {endLabel}</span>
              {block.priority && (
                <span className={`rounded-full px-2 py-1 ${priorityClasses.accent}`}>
                  {block.priority}
                </span>
              )}
            </div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-gray-100">
              {block.title}
            </div>
            {block.subject ? (
              <div className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                <span className="rounded-full border border-slate-700 bg-slate-900/90 px-2 py-1">
                  {block.subject}
                </span>
              </div>
            ) : null}
            {block.tags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {block.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 transition duration-150 group-hover:opacity-100">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsEditing(true);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[12px] text-gray-300 hover:border-gray-600 hover:text-gray-100"
              >
                {"\u270E"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeBlock(block.id);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="rounded-md border border-gray-700 bg-[#111112] px-2 py-1 text-[12px] text-gray-400 hover:border-gray-600 hover:text-rose-300"
              >
                {"\u00D7"}
              </button>
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="mt-2 h-[2px] w-10 rounded-full bg-blue-400/50" />
        )}
        <div
          ref={resizeRef}
          onPointerDown={(event) => {
            event.stopPropagation();
            draggingRef.current = true;
            startYRef.current = event.clientY;
            startDurationRef.current = durationValue;
            (event.currentTarget as HTMLElement).setPointerCapture(
              event.pointerId
            );
          }}
          className="absolute bottom-2 left-1/2 h-2 w-14 -translate-x-1/2 cursor-s-resize rounded-full bg-sky-400/30 touch-none"
        />
      </div>
      {isEditing && (
        <EditPopover
          title="Edit Block"
          onClose={() => setIsEditing(false)}
          onSave={() => {
            updateBlock(block.id, {
              title: editValue.trim() || block.title,
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
            setIsEditing(false);
          }}
          onDelete={() => {
            removeBlock(block.id);
            setIsEditing(false);
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
                className="mt-2 w-full rounded-md border border-gray-700 bg-[#111112] px-3 py-2 text-sm text-gray-100 focus:border-blue-500/60 focus:outline-none"
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
                value={durationValue}
                onChange={(event) =>
                  setDurationValue(Number(event.target.value || 0))
                }
                onBlur={() =>
                  updateBlock(block.id, {
                    end_time: addMinutes(
                      new Date(block.start_time),
                      Math.max(15, durationValue)
                    ).toISOString(),
                  })
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
                  onChange={(event) => setEditEstimate(Number(event.target.value || 0))}
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
    </>
  );
}
