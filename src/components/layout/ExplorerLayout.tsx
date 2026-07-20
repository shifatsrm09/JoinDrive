import { useState } from "react";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import Breadcrumb from "./Breadcrumb";

import FileGrid from "../file/FileGrid";
import ExplorerGrid from "../file/ExplorerGrid";
type HistoryEntry =
  | {
      type: "dashboard";
    }
  | {
      type: "folder";
      id: string;
      name: string;
    };

export default function ExplorerLayout() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: "dashboard" },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const current = history[currentIndex];

  function openDrive() {
    const newHistory = history.slice(0, currentIndex + 1);

    newHistory.push({
      type: "folder",
      id: "root",
      name: "My Drive",
    });

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }

  function openFolder(id: string, name: string) {
    const newHistory = history.slice(0, currentIndex + 1);

    newHistory.push({
      type: "folder",
      id,
      name,
    });

    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }

  function goBack() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function goForward() {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function navigateTo(index: number) {
    setCurrentIndex(index);
  }

  return (
    <div className="flex h-screen bg-[#1B1B1B] text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Toolbar
          canGoBack={currentIndex > 0}
          canGoForward={currentIndex < history.length - 1}
          onBack={goBack}
          onForward={goForward}
        />

        <Breadcrumb
          history={history}
          currentIndex={currentIndex}
          onNavigate={navigateTo}
        />

        {current.type === "dashboard" ? (
          <FileGrid onOpenDrive={openDrive} />
        ) : (
          <ExplorerGrid
            folderId={current.id}
            onOpenFolder={openFolder}
          />
        )}
      </div>
    </div>
  );
}