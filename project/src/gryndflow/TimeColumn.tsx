type TimeColumnProps = {
  hours: number[];
  hourHeight: number;
  endHour: number;
};

export function TimeColumn({ hours, hourHeight, endHour }: TimeColumnProps) {
  return (
    <div className="relative w-16 border-r border-gray-800/70 bg-gray-950">
      <div>
        {hours.map((hour) => (
          <div
            key={hour}
            className="flex items-start justify-end pr-2 text-[11px] text-gray-500"
            style={{ height: `${hourHeight}px` }}
          >
            <span className="mt-[-6px] rounded-md bg-gray-950 px-1.5 py-0.5">
              {hour.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-1 right-3 text-xs text-gray-500">
        {endHour.toString().padStart(2, "0")}:00
      </div>
    </div>
  );
}
