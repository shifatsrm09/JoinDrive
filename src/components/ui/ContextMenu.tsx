import { useEffect, useLayoutEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";

export type MenuItem =
  | { kind: "separator" }
  | {
      kind: "item";
      label: string;
      icon?: LucideIcon;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      onSelect: () => void;
    };

type ContextMenuProps = {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

const MENU_MARGIN = 8;

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const { width, height } = el.getBoundingClientRect();

    const left = Math.max(
      MENU_MARGIN,
      Math.min(x, window.innerWidth - width - MENU_MARGIN)
    );

    const top = Math.max(
      MENU_MARGIN,
      Math.min(y, window.innerHeight - height - MENU_MARGIN)
    );

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = "visible";
  }, [x, y]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);

    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y, visibility: "hidden" }}
      onContextMenu={(event) => event.preventDefault()}
      className="fixed z-50 max-h-[calc(100dvh-1rem)] w-[min(220px,calc(100vw-1rem))] select-none overflow-y-auto rounded-xl border border-zinc-700 bg-[#2B2B2B] py-1.5 shadow-2xl sm:w-auto sm:min-w-[220px]"
    >
      {items.map((item, index) => {
        if (item.kind === "separator") {
          return (
            <div
              key={`separator-${index}`}
              className="my-1.5 h-px bg-zinc-700"
            />
          );
        }

        const Icon = item.icon;

        return (
          <button
            key={item.label}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) {
                return;
              }

              onClose();
              item.onSelect();
            }}
            className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm transition sm:min-h-0 ${
              item.disabled
                ? "cursor-not-allowed text-zinc-600"
                : item.danger
                ? "text-red-400 hover:bg-red-500/10"
                : "text-zinc-200 hover:bg-[#0E639C]"
            }`}
          >
            {Icon && <Icon size={16} className="shrink-0" />}

            <span className="flex-1 truncate">{item.label}</span>

            {item.shortcut && (
              <span className="shrink-0 text-xs text-zinc-500">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
