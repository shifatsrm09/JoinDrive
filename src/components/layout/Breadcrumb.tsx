type HistoryEntry =
  | {
      type: "dashboard";
    }
  | {
      type: "folder";
      id: string;
      name: string;
    };

type BreadcrumbProps = {
  history: HistoryEntry[];
  currentIndex: number;
  onNavigate: (index: number) => void;
};

export default function Breadcrumb({
  history,
  currentIndex,
  onNavigate,
}: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-[#252525] px-6 py-3 text-sm">
      {history.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          {index !== 0 && (
            <span className="text-zinc-500">
              /
            </span>
          )}

          <button
            onClick={() => onNavigate(index)}
            className={`rounded px-2 py-1 transition ${
              index === currentIndex
                ? "cursor-default bg-[#0E639C] text-white"
                : "text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {item.type === "dashboard"
              ? "Connected Drives"
              : item.name}
          </button>
        </div>
      ))}
    </div>
  );
}