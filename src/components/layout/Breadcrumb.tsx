type FolderPathSegment = { id: string; name: string };

type HistoryEntry =
  | {
      type: "dashboard";
    }
  | {
      type: "recent";
    }
  | {
      type: "starred";
    }
  | {
      type: "trash";
    }
  | {
      type: "folder";
      accountId: string;
      accountLabel: string;
      path: FolderPathSegment[];
    };

type BreadcrumbProps = {
  
  current: HistoryEntry;
  onNavigateHome: () => void;
  onNavigateToFolder: (
    accountId: string,
    accountLabel: string,
    path: FolderPathSegment[]
  ) => void;
};

const LABELS: Record<Exclude<HistoryEntry["type"], "folder">, string> = {
  dashboard: "root",
  recent: "Recent",
  starred: "Favorites",
  trash: "Trash",
};

type Crumb = {
  label: string;
  isCurrent: boolean;
  onClick: () => void;
};

function buildCrumbs(
  current: HistoryEntry,
  onNavigateHome: () => void,
  onNavigateToFolder: BreadcrumbProps["onNavigateToFolder"]
): Crumb[] {
  if (current.type === "dashboard") {
    return [{ label: LABELS.dashboard, isCurrent: true, onClick: onNavigateHome }];
  }

  if (current.type !== "folder") {
    return [
      { label: LABELS.dashboard, isCurrent: false, onClick: onNavigateHome },
      { label: LABELS[current.type], isCurrent: true, onClick: () => {} },
    ];
  }

  const { accountId, accountLabel, path } = current;

  const crumbs: Crumb[] = [
    { label: LABELS.dashboard, isCurrent: false, onClick: onNavigateHome },
    {
      label: accountLabel,
      isCurrent: path.length === 0,
      onClick: () => onNavigateToFolder(accountId, accountLabel, []),
    },
  ];

  path.forEach((segment, index) => {
    crumbs.push({
      label: segment.name,
      isCurrent: index === path.length - 1,
      onClick: () =>
        onNavigateToFolder(accountId, accountLabel, path.slice(0, index + 1)),
    });
  });

  return crumbs;
}

export default function Breadcrumb({
  current,
  onNavigateHome,
  onNavigateToFolder,
}: BreadcrumbProps) {
  const crumbs = buildCrumbs(current, onNavigateHome, onNavigateToFolder);

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-[#252525] px-6 py-3 text-sm">
      {crumbs.map((crumb, index) => (
        <div
          key={index}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          {index !== 0 && <span className="text-zinc-500">/</span>}

          <button
            onClick={crumb.onClick}
            disabled={crumb.isCurrent}
            className={`rounded px-2 py-1 transition ${
              crumb.isCurrent
                ? "cursor-default bg-[#0E639C] text-white"
                : "text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {crumb.label}
          </button>
        </div>
      ))}
    </div>
  );
}

