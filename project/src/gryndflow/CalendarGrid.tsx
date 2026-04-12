import { useState, type MouseEvent, type RefObject } from "react";
import { format, startOfMonth, startOfWeek, addDays, isToday } from "date-fns";
import { DayColumn } from "./DayColumn";
import { TimeColumn } from "./TimeColumn";
import type { StudyBlock } from "./store";

type CalendarGridProps = {
  blocks: StudyBlock[];
  hourHeight: number;
  startHour: number;
  endHour: number;
  ghostDayIndex: number | null;
  ghostTop: number | null;
  nowTop: number | null;
  viewMode: "week" | "day" | "4day" | "month";
  onViewChange: (mode: "week" | "day" | "4day" | "month") => void;
  scrollRef: RefObject<HTMLDivElement>;
  isSidebarCollapsed: boolean;
  startDate: Date;
  onBlockContextMenu: (
    event: MouseEvent<HTMLDivElement>,
    blockId: string
  ) => void;
};

export function CalendarGrid({
  blocks,
  hourHeight,
  startHour,
  endHour,
  ghostDayIndex,
  ghostTop,
  nowTop,
  viewMode,
  onViewChange,
  scrollRef,
  isSidebarCollapsed,
  startDate,
  onBlockContextMenu,
}: CalendarGridProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  const days =
    viewMode === "day"
      ? [startDate]
      : viewMode === "4day"
      ? Array.from({ length: 4 }, (_, index) => addDays(startDate, index))
      : viewMode === "month"
      ? Array.from({ length: 7 }, (_, index) =>
          addDays(startOfWeek(monthStart, { weekStartsOn: 1 }), index)
        )
      : Array.from({ length: 7 }, (_, index) => addDays(startDate, index));

  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index
  );

  const totalMinutes = (endHour - startHour) * 60;

  return (
    <section className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-gray-900 bg-[#090a11] px-4 py-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-gray-800 bg-[#111318] px-3 py-1.5 text-xs text-gray-200"
          >
            {viewMode === "week"
              ? "Week"
              : viewMode === "day"
              ? "Day"
              : viewMode === "4day"
              ? "4 days"
              : "Month"}
            <span className="text-[10px] text-gray-400">▾</span>
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-10 z-20 w-36 rounded-xl border border-gray-800 bg-[#0f0f10] p-1 text-xs shadow-lg">
              {["day", "week", "4day", "month"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onViewChange(mode as "day" | "week" | "4day" | "month");
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
                    viewMode === mode
                      ? "bg-[#1a1a1c] text-gray-100"
                      : "text-gray-400 hover:bg-[#1a1a1c] hover:text-gray-200"
                  }`}
                >
                  {mode === "day"
                    ? "Day"
                    : mode === "week"
                    ? "Week"
                    : mode === "4day"
                    ? "4 days"
                    : "Month"}
                  {viewMode === mode && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-[13px] font-semibold text-gray-100 tracking-wide">
          {viewMode === "day"
            ? format(startDate, "EEEE, MMM d, yyyy")
            : viewMode === "month"
            ? format(new Date(), "MMMM yyyy")
            : `${format(startDate, "MMM d")} - ${format(
                addDays(startDate, viewMode === "4day" ? 3 : 6),
                "MMM d, yyyy"
              )}`}
        </div>
      </div>

      <div
        className={`grid border-b border-gray-900 bg-[#0b0b0c] ${
          viewMode === "day"
            ? "grid-cols-[5rem_1fr]"
            : viewMode === "4day"
            ? "grid-cols-[5rem_repeat(4,minmax(0,1fr))]"
            : "grid-cols-[5rem_repeat(7,minmax(0,1fr))]"
        }`}
      >
        <div className="border-r border-gray-900" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`rounded-3xl px-3 py-3 ${
              isToday(day) ? "bg-sky-500/10" : "bg-[#090a11]"
            }`}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
              {format(day, "EEE")}
            </div>
            <div
              className={`text-[13px] font-semibold ${
                isToday(day) ? "text-blue-200" : "text-gray-100"
              }`}
            >
              {format(day, "dd MMM")}
            </div>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="relative flex flex-1 overflow-y-auto bg-[#090a11]">
        <TimeColumn hours={hours} hourHeight={hourHeight} endHour={endHour} />
        <div className="flex flex-1 gap-px">
          {days.map((day, index) => (
            <DayColumn
              key={day.toISOString()}
              id={`day-${index}`}
              date={day}
              dayIndex={index}
              blocks={blocks}
              hourHeight={hourHeight}
              startHour={startHour}
              totalMinutes={totalMinutes}
              hours={hours}
              ghostTop={ghostDayIndex === index ? ghostTop : null}
              isToday={isToday(day)}
              nowTop={nowTop}
              onBlockContextMenu={onBlockContextMenu}
            />
          ))}
        </div>
        {blocks.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-3xl border border-dashed border-gray-700 bg-slate-950/70 px-6 py-4 text-sm text-gray-400 shadow-lg">
              No sessions scheduled
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
