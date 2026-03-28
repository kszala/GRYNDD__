import { useState, useEffect } from 'react';
import { formatSeconds } from '../../utils/time';

interface RangeCalculatorProps {
  totalItems: number;
  items: Array<{ durationSeconds: number }>;
  onRangeChange: (startIndex: number, endIndex: number, duration: number) => void;
}

const clampRange = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function RangeCalculator({ totalItems, items, onRangeChange }: RangeCalculatorProps) {
  const [startIndex, setStartIndex] = useState(1);
  const [endIndex, setEndIndex] = useState(totalItems || 1);

  useEffect(() => {
    setStartIndex(1);
    setEndIndex(totalItems || 1);
  }, [totalItems]);

  const rangeDuration = (() => {
    if (!items || items.length === 0) {
      return 0;
    }

    const safeStart = clampRange(startIndex, 1, items.length);
    const safeEnd = clampRange(endIndex, safeStart, items.length);

    return items
      .slice(safeStart - 1, safeEnd)
      .reduce((total, item) => total + item.durationSeconds, 0);
  })();

  useEffect(() => {
    onRangeChange(startIndex, endIndex, rangeDuration);
  }, [startIndex, endIndex, rangeDuration, onRangeChange]);

  const handlePreset = (preset: '1-5' | '1-10' | 'all') => {
    switch (preset) {
      case '1-5':
        setStartIndex(1);
        setEndIndex(Math.min(5, totalItems));
        break;
      case '1-10':
        setStartIndex(1);
        setEndIndex(Math.min(10, totalItems));
        break;
      case 'all':
        setStartIndex(1);
        setEndIndex(totalItems);
        break;
    }
  };

  return (
    <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gt-muted)] font-mono">Range</p>

      {/* Quick presets */}
      <div className="mt-3 flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => handlePreset('1-5')}
          className="px-3 py-1 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-panel)] text-[12px] text-[var(--gt-soft)] hover:border-[var(--grynd-border-2)] transition"
        >
          1-5
        </button>
        <button
          type="button"
          onClick={() => handlePreset('1-10')}
          className="px-3 py-1 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-panel)] text-[12px] text-[var(--gt-soft)] hover:border-[var(--grynd-border-2)] transition"
        >
          1-10
        </button>
        <button
          type="button"
          onClick={() => handlePreset('all')}
          className="px-3 py-1 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-panel)] text-[12px] text-[var(--gt-soft)] hover:border-[var(--grynd-border-2)] transition"
        >
          All
        </button>
      </div>

      {/* Custom range inputs */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={Math.max(totalItems, 1)}
          value={startIndex}
          onChange={(event) => {
            const nextStart = clampRange(Number(event.target.value), 1, Math.max(totalItems, 1));
            setStartIndex(nextStart);
            if (nextStart > endIndex) {
              setEndIndex(nextStart);
            }
          }}
          className="w-13 bg-[var(--gt-panel)] border border-[var(--gt-border)] rounded-lg px-2 py-1 text-[13px] text-center text-white outline-none font-mono"
        />
        <span className="text-[13px] text-[var(--gt-muted)]">-</span>
        <input
          type="number"
          min={1}
          max={Math.max(totalItems, 1)}
          value={endIndex}
          onChange={(event) => {
            const nextEnd = clampRange(
              Math.max(Number(event.target.value), startIndex),
              1,
              Math.max(totalItems, 1)
            );
            setEndIndex(nextEnd);
          }}
          className="w-13 bg-[var(--gt-panel)] border border-[var(--gt-border)] rounded-lg px-2 py-1 text-[13px] text-center text-white outline-none font-mono"
        />
        <div className="ml-auto px-2.5 py-1 rounded-lg border border-[var(--gt-border)]">
          <span className="text-[12px] font-mono text-[var(--grynd-accent)]">
            {formatSeconds(rangeDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
