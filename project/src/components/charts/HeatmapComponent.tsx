import React from 'react';

interface HeatmapDataPoint {
  hour: number; // 0-23
  day: string; // Mon, Tue, etc.
  value?: number; // focus score 0-100
  focusScore?: number; // alternate property name
  dayIndex: number; // 0-6 for sorting
}

interface HeatmapProps {
  data: HeatmapDataPoint[];
  title: string;
  height?: number;
}

const getColor = (value: number): string => {
  if (value === 0) return 'bg-gray-800';
  if (value < 20) return 'bg-blue-900';
  if (value < 40) return 'bg-blue-700';
  if (value < 60) return 'bg-blue-500';
  if (value < 80) return 'bg-emerald-500';
  return 'bg-emerald-400';
};

export const HeatmapComponent: React.FC<HeatmapProps> = ({ data, title, height = 400 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Sort data by day index then hour
  const sortedData = [...data].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.hour - b.hour;
  });

  // Group by day
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const groupedByDay = new Map<string, HeatmapDataPoint[]>();

  dayOrder.forEach((day) => {
    groupedByDay.set(day, []);
  });

  sortedData.forEach((point) => {
    const arr = groupedByDay.get(point.day) || [];
    arr.push(point);
    groupedByDay.set(point.day, arr);
  });

  // Create max value for color scale
  const maxValue = Math.max(...data.map((p) => p.value || p.focusScore || 0), 1);

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <div style={{ height }}>
          <div className="flex flex-col gap-1">
            {/* Hour labels + heatmap */}
            <div className="flex">
              {/* Day labels column */}
              <div className="w-20 flex-shrink-0 flex flex-col pr-2">
                <div className="h-8" /> {/* Empty space for hour header */}
                {dayOrder.map((day) => (
                  <div
                    key={day}
                    className="text-xs font-medium text-gray-400 flex items-center h-8"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Hour columns */}
              <div className="flex gap-1 overflow-x-auto pb-4">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div key={hour} className="flex flex-col gap-1 flex-shrink-0">
                    <div className="text-xs text-gray-400 text-center w-8 h-8 flex items-center justify-center">
                      {hour}
                    </div>
                    {dayOrder.map((day, dayIdx) => {
                      const point = sortedData.find((p) => p.hour === hour && p.day === day);
                      const pointValue = point?.value || point?.focusScore || 0;
                      const normalizedValue = (pointValue / maxValue) * 100;

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`w-8 h-8 rounded cursor-pointer transition-all ${getColor(normalizedValue)} hover:ring-2 hover:ring-offset-1 hover:ring-offset-gray-900 hover:ring-blue-400`}
                          title={`${day} ${hour}:00 - Focus: ${pointValue.toFixed(0)}%`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-2 text-xs">
        <span className="text-gray-400">Low focus:</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-800 rounded" />
          <div className="w-4 h-4 bg-blue-900 rounded" />
          <div className="w-4 h-4 bg-blue-700 rounded" />
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <div className="w-4 h-4 bg-emerald-500 rounded" />
          <div className="w-4 h-4 bg-emerald-400 rounded" />
        </div>
        <span className="text-gray-400">High focus</span>
      </div>
    </div>
  );
};
