import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import Breadcrumb from "./Breadcrumb";
import FileGrid from "./FileGrid";

export default function ExplorerLayout() {
  return (
    <div className="flex h-screen bg-[#1B1B1B] text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Toolbar />
        <Breadcrumb />
        <FileGrid />
      </div>
    </div>
  );
}