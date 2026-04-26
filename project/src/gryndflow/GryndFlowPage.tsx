import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { addDays, addMinutes, differenceInMinutes, isSameDay, parseISO, set, startOfWeek } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { SidebarTasks } from "./SidebarTasks";
import { CalendarGrid } from "./CalendarGrid";
import { ContextMenu } from "./ContextMenu";
import { useGryndFlowStore } from "./store";
import type { Task } from "./store";

const HOUR_START = 0;
const HOUR_END = 24;
const BASE_HOUR_HEIGHT = 80;
const MAX_EXTRA_HEIGHT = 60;
const SNAP_MINUTES = 15;

type ViewMode = "week" | "day" | "4day" | "month";

export function GryndFlowPage() {
  const blocks = useGryndFlowStore((state) => state.blocks);
  const addBlock = useGryndFlowStore((state) => state.addBlock);
  const updateBlock = useGryndFlowStore((state) => state.updateBlock);
  const removeBlock = useGryndFlowStore((state) => state.removeBlock);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [ghostTop, setGhostTop] = useState<number | null>(null);
  const [ghostDayIndex, setGhostDayIndex] = useState<number | null>(null);
  const [nowTop, setNowTop] = useState<number | null>(null);
  const [ghostLabel, setGhostLabel] = useState<string | null>(null);
  const [ghostClient, setGhostClient] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<
    | {
        blockId: string;
        x: number;
        y: number;
      }
    | null
  >(null);
  const dragStartClientY = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didScrollRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 2, delay: 0 },
    })
  );

  const startDate = useMemo(
    () =>
      viewMode === "month"
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : new Date(),
    [viewMode]
  );

  const visibleDayCount = viewMode === "day" ? 1 : viewMode === "4day" ? 4 : 7;
  const visibleDays = useMemo(
    () => Array.from({ length: visibleDayCount }, (_, index) => addDays(startDate, index)),
    [startDate, visibleDayCount]
  );

  const activeBlocks = useMemo(
    () =>
      blocks.filter((block) =>
        visibleDays.some((day) => isSameDay(parseISO(block.start_time), day))
      ),
    [blocks, visibleDays]
  );

  const maxOverlap = useMemo(() => {
    const events = activeBlocks
      .flatMap((block) => [
        { time: parseISO(block.start_time), type: "start" as const },
        { time: parseISO(block.end_time), type: "end" as const },
      ])
      .sort((a, b) => a.time.getTime() - b.time.getTime() || (a.type === "end" ? -1 : 1));

    let count = 0;
    let maxCount = 1;
    for (const event of events) {
      if (event.type === "start") {
        count += 1;
        maxCount = Math.max(maxCount, count);
      } else {
        count -= 1;
      }
    }
    return maxCount;
  }, [activeBlocks]);

  const HOUR_HEIGHT = useMemo(
    () => BASE_HOUR_HEIGHT + Math.min(MAX_EXTRA_HEIGHT, Math.max(0, maxOverlap - 1) * 12),
    [maxOverlap]
  );
  const totalMinutes = useMemo(() => (HOUR_END - HOUR_START) * 60, []);
  const pxPerMinute = HOUR_HEIGHT / 60;

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const minutesFromStart =
        now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
      if (minutesFromStart < 0 || minutesFromStart > totalMinutes) {
        setNowTop(null);
        return;
      }
      setNowTop(minutesFromStart * pxPerMinute);
    };

    updateNow();
    const timer = window.setInterval(updateNow, 60000);
    return () => window.clearInterval(timer);
  }, [pxPerMinute, totalMinutes]);

  useEffect(() => {
    // Default to collapsed sidebar on smaller screens to prevent cramped layout.
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) setIsSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    if (!scrollRef.current || nowTop === null || didScrollRef.current) return;
    const target = Math.max(0, nowTop - HOUR_HEIGHT * 2);
    scrollRef.current.scrollTop = target;
    didScrollRef.current = true;
  }, [nowTop, HOUR_HEIGHT]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [contextMenu]);

  const handleDragStart = (event: DragStartEvent) => {
    const activator = event.activatorEvent as MouseEvent | TouchEvent;
    const startClientY =
      "touches" in activator
        ? activator.touches[0]?.clientY
        : activator.clientY;
    dragStartClientY.current =
      typeof startClientY === "number" ? startClientY : null;
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const over = event.over;
    if (!over?.rect || dragStartClientY.current === null) {
      setGhostTop(null);
      setGhostDayIndex(null);
      return;
    }

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const activator = event.activatorEvent as MouseEvent | TouchEvent;
      const currentClientY =
        "touches" in activator
          ? activator.touches[0]?.clientY
          : activator.clientY;
      const currentClientX =
        "touches" in activator
          ? activator.touches[0]?.clientX
          : activator.clientX;
      const baseClientY = dragStartClientY.current ?? 0;
      const liveClientY =
        typeof currentClientY === "number"
          ? currentClientY
          : baseClientY + event.delta.y;
      const liveClientX = typeof currentClientX === "number" ? currentClientX : 0;

      const offsetY = liveClientY - over.rect.top;
      const rawMinutes = offsetY / pxPerMinute;
      const snappedMinutes =
        Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
      const clampedMinutes = Math.max(
        0,
        Math.min(totalMinutes - SNAP_MINUTES, snappedMinutes)
      );

      const top = Math.round(clampedMinutes * pxPerMinute);
      setGhostTop(top);
      const dayIndex = over.data.current?.dayIndex as number | undefined;
      setGhostDayIndex(typeof dayIndex === "number" ? dayIndex : null);
      const total = HOUR_START * 60 + clampedMinutes;
      const hours = Math.floor(total / 60)
        .toString()
        .padStart(2, "0");
      const minutes = Math.round(total % 60)
        .toString()
        .padStart(2, "0");
      setGhostLabel(`${hours}:${minutes}`);
      setGhostClient({ x: liveClientX, y: liveClientY });
    });
  };

  const resetGhost = () => {
    setGhostTop(null);
    setGhostDayIndex(null);
    setGhostLabel(null);
    setGhostClient(null);
    dragStartClientY.current = null;
  };

  const getStartDate = () => startDate;

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | { task?: Task; type?: string; blockId?: string }
      | undefined;
    const task = activeData?.task as Task | undefined;
    const isBlockDrag = activeData?.type === "block";
    const blockId = activeData?.blockId;
    const over = event.over;

    setActiveTask(null);
    resetGhost();

    if ((!task && !isBlockDrag) || !over) return;

    const dayIndex = over.data.current?.dayIndex as number | undefined;
    if (typeof dayIndex !== "number") return;

    const activator = event.activatorEvent as MouseEvent | TouchEvent;
    const startClientY =
      "touches" in activator
        ? activator.touches[0]?.clientY
        : activator.clientY;

    if (typeof startClientY !== "number" || !over.rect) return;

    const dropClientY = startClientY + event.delta.y;
    const offsetY = dropClientY - over.rect.top;

    const duration = task?.duration ?? 60;
    const rawMinutes = offsetY / pxPerMinute;
    const snappedMinutes =
      Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    const clampedMinutes = Math.max(
      0,
      Math.min(totalMinutes - duration, snappedMinutes)
    );

    const startDate = getStartDate();
    const dayDate = addDays(startDate, dayIndex);

    const dayStart = set(dayDate, {
      hours: HOUR_START,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    const startTime = addMinutes(dayStart, clampedMinutes);
    const endTime = addMinutes(startTime, duration);

    if (isBlockDrag && blockId) {
      const existing = blocks.find((block) => block.id === blockId);
      if (!existing) return;
      const blockDuration = Math.max(
        15,
        differenceInMinutes(
          new Date(existing.end_time),
          new Date(existing.start_time)
        )
      );
      const newEnd = addMinutes(startTime, blockDuration);
      updateBlock(blockId, {
        start_time: startTime.toISOString(),
        end_time: newEnd.toISOString(),
      });
      return;
    }

    if (!task) return;

    addBlock({
      id: uuidv4(),
      title: task.title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      subject: task.subject,
      status: "pending",
      origin: "manual",
    });
  };

  return (
    <div className="flex h-full min-h-screen bg-gray-950 text-gray-100">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTask(null);
          resetGhost();
        }}
      >
        <SidebarTasks
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
            <CalendarGrid
          blocks={blocks}
          hourHeight={HOUR_HEIGHT}
          startHour={HOUR_START}
          endHour={HOUR_END}
          ghostDayIndex={ghostDayIndex}
          ghostTop={ghostTop}
          nowTop={nowTop}
          viewMode={viewMode}
          onViewChange={(mode) => {
            didScrollRef.current = false;
            setViewMode(mode);
          }}
          scrollRef={scrollRef}
          isSidebarCollapsed={isSidebarCollapsed}
          startDate={startDate}
          onBlockContextMenu={(event, blockId) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, blockId });
          }}
        />
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            block={blocks.find((block) => block.id === contextMenu.blockId)!}
            onClose={() => setContextMenu(null)}
            onCopy={() => {
              const selectedBlock = blocks.find(
                (block) => block.id === contextMenu.blockId
              );
              if (!selectedBlock) return;
              const duration = differenceInMinutes(
                parseISO(selectedBlock.end_time),
                parseISO(selectedBlock.start_time)
              );
              const newStart = addMinutes(parseISO(selectedBlock.start_time), 15);
              addBlock({
                ...selectedBlock,
                id: uuidv4(),
                start_time: newStart.toISOString(),
                end_time: addMinutes(newStart, duration).toISOString(),
              });
              setContextMenu(null);
            }}
            onDelete={() => {
              const selectedBlock = blocks.find(
                (block) => block.id === contextMenu.blockId
              );
              if (!selectedBlock) return;
              removeBlock(selectedBlock.id);
              setContextMenu(null);
            }}
            onChangeColor={(color) => {
              const selectedBlock = blocks.find(
                (block) => block.id === contextMenu.blockId
              );
              if (!selectedBlock) return;
              updateBlock(selectedBlock.id, { color });
              setContextMenu(null);
            }}
          />
        )}
        {ghostLabel && ghostClient && (
          <div
            className="pointer-events-none fixed z-50"
            style={{
              left: ghostClient.x + 12,
              top: ghostClient.y - 28,
            }}
          >
            <div className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-gray-100 shadow-md">
              {ghostLabel}
            </div>
          </div>
        )}
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 shadow-xl">
              <div className="font-medium">{activeTask.title}</div>
              <div className="mt-1 text-xs text-gray-400">
                {(activeTask.duration ?? 60).toString()} min
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
