import { useDroppable } from "@dnd-kit/core";
import { differenceInMinutes, isSameDay, parseISO, set } from "date-fns";
import { StudyBlock } from "./StudyBlock";
import type { MouseEvent } from "react";
import type { StudyBlock as StudyBlockType } from "./store";

type DayColumnProps = {
  id: string;
  date: Date;
  dayIndex: number;
  blocks: StudyBlockType[];
  hourHeight: number;
  startHour: number;
  totalMinutes: number;
  hours: number[];
  ghostTop: number | null;
  isToday: boolean;
  nowTop: number | null;
  onBlockContextMenu: (
    event: MouseEvent<HTMLDivElement>,
    blockId: string
  ) => void;
};

export function DayColumn({
  id,
  date,
  dayIndex,
  blocks,
  hourHeight,
  startHour,
  totalMinutes,
  hours,
  ghostTop,
  isToday,
  nowTop,
  onBlockContextMenu,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { dayIndex },
  });

  const dayStart = set(date, {
    hours: startHour,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  const dayEnd = set(date, {
    hours: startHour,
    minutes: totalMinutes,
    seconds: 0,
    milliseconds: 0,
  });

  const pxPerMinute = hourHeight / 60;

  const dayBlocks = blocks.filter((block) =>
    isSameDay(parseISO(block.start_time), date)
  );

  return (
    <div className="relative flex-1 border-r border-gray-900">
      <div
        ref={setNodeRef}
        className={`relative h-full w-full ${
          "bg-[#0b0b0c]"
        } ${isOver ? "bg-[#121214]" : ""}`}
        style={{ height: `${totalMinutes * pxPerMinute}px` }}
      >
        {hours.map((hour) => (
          <div
            key={hour}
            className="relative border-b border-gray-900"
            style={{ height: `${hourHeight}px` }}
          >
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 border-t border-gray-900/60" />
          </div>
        ))}

        {dayBlocks.map((block) => {
          const start = parseISO(block.start_time);
          const end = parseISO(block.end_time);
          const minutesFromStart = differenceInMinutes(start, dayStart);
          const duration = Math.max(differenceInMinutes(end, start), 15);
          const top = Math.max(0, minutesFromStart * pxPerMinute);
          const height = Math.max(20, duration * pxPerMinute);

          return (
            <StudyBlock
              key={block.id}
              block={block}
              top={top}
              height={height}
              pxPerMinute={pxPerMinute}
              dayStart={dayStart}
              dayEnd={dayEnd}
              onContextMenu={(event) => onBlockContextMenu(event, block.id)}
            />
          );
        })}

        {nowTop !== null && (
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{ top: nowTop }}
          >
            <div className="h-[2px] w-full bg-rose-400/80 shadow-[0_0_6px_rgba(251,113,133,0.4)]" />
            <div className="absolute -left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
          </div>
        )}

        {ghostTop !== null && (
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{ top: ghostTop }}
          >
            <div className="h-[2px] w-full bg-blue-400/50 shadow-[0_0_8px_rgba(96,165,250,0.25)]" />
          </div>
        )}

        {dayBlocks.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-gray-600/70">
              No sessions scheduled
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
