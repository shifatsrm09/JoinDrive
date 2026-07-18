import { useEffect } from "react";

import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import Breadcrumb from "./Breadcrumb";
import FileGrid from "../file/FileGrid";

import { getHealth } from "../../api/health";

export default function ExplorerLayout() {
  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await getHealth();
        console.log("✅ Backend Connected:", response);
      } catch (error) {
        console.error("❌ Backend Error:", error);
      }
    }

    checkBackend();
  }, []);

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