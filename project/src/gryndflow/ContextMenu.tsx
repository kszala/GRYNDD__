import { useState } from "react";
import type { StudyBlock } from "./store";
import { SESSION_COLORS } from "./store";

type ContextMenuProps = {
  x: number;
  y: number;
  block: StudyBlock;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onChangeColor: (color: string) => void;
};

export function ContextMenu({
  x,
  y,
  block,
  onClose,
  onCopy,
  onDelete,
  onChangeColor,
}: ContextMenuProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <div
      className="fixed z-50"
      style={{ top: y, left: x, minWidth: 220 }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#091016] text-sm text-gray-100 shadow-2xl ring-1 ring-white/5">
        <div className="space-y-1 p-2">
          <button
            type="button"
            onClick={() => setShowColors((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
          >
            <span>🎨 Change Color</span>
            <span className="text-xs text-gray-400">{showColors ? "▴" : "▾"}</span>
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
          >
            📋 Copy Session
          </button>
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-left text-gray-500 transition hover:bg-white/5"
            onClick={() => {
              /* Placeholder */
            }}
            disabled
          >
            🔁 Reschedule
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-xl px-3 py-2 text-left text-rose-300 transition hover:bg-white/5"
          >
            ❌ Delete
          </button>
        </div>

        {showColors && (
          <div className="border-t border-gray-800 bg-[#081018] p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-gray-500">
              Pick a color
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SESSION_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    onChangeColor(color);
                    setShowColors(false);
                  }}
                  className="h-8 w-8 rounded-full border border-gray-700 transition hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
