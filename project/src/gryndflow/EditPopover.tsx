import { ReactNode } from "react";

type EditPopoverProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
};

export function EditPopover({
  title,
  children,
  onClose,
  onSave,
  onDelete,
}: EditPopoverProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0f0f10] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="text-sm font-semibold text-gray-100">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-800 bg-[#141415] px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-gray-200">{children}</div>
        <div className="flex items-center justify-between border-t border-gray-800 px-5 py-4">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-semibold text-rose-300 hover:text-rose-200"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-800 px-3 py-1 text-xs text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-md bg-blue-500/80 px-3 py-1 text-xs text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
