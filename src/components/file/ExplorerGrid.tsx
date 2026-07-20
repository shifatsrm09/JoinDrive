import { useEffect, useState } from "react";
import {
  Folder,
  FileText,
  Image,
  FileSpreadsheet,
  FileVideo,
  FileArchive,
} from "lucide-react";
import { getFiles } from "../../api/drive";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  iconLink?: string;
  thumbnailLink?: string;
};

type ExplorerGridProps = {
  folderId: string;
  onOpenFolder: (id: string, name: string) => void;
};

export default function ExplorerGrid({
  folderId,
  onOpenFolder,
}: ExplorerGridProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFolder(folderId);
  }, [folderId]);

  async function loadFolder(id: string) {
    try {
      setLoading(true);

      const res = await getFiles(id);

      if (res.success) {
        setFiles(res.files);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getIcon(type: string) {
    if (type === "application/vnd.google-apps.folder") {
      return <Folder size={44} className="text-blue-400" />;
    }

    if (type.startsWith("image/")) {
      return <Image size={44} className="text-green-400" />;
    }

    if (type.includes("spreadsheet")) {
      return (
        <FileSpreadsheet
          size={44}
          className="text-emerald-400"
        />
      );
    }

    if (type.startsWith("video/")) {
      return (
        <FileVideo
          size={44}
          className="text-purple-400"
        />
      );
    }

    if (
      type.includes("zip") ||
      type.includes("rar")
    ) {
      return (
        <FileArchive
          size={44}
          className="text-yellow-400"
        />
      );
    }

    return (
      <FileText
        size={44}
        className="text-zinc-300"
      />
    );
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">
          Loading files...
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-[#1B1B1B] p-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {files.map((file) => (
          <div
            key={file.id}
            onDoubleClick={() => {
              if (
                file.mimeType ===
                "application/vnd.google-apps.folder"
              ) {
                onOpenFolder(
                  file.id,
                  file.name
                );
              }
            }}
            className="cursor-pointer rounded-xl border border-zinc-800 bg-[#252525] p-5 transition-all duration-200 hover:border-[#0E639C] hover:shadow-lg"
          >
            <div className="mb-4 flex justify-center">
              {getIcon(file.mimeType)}
            </div>

            <h2 className="truncate text-center font-medium">
              {file.name}
            </h2>

            <p className="mt-2 text-center text-xs text-zinc-500">
              {new Date(
                file.modifiedTime
              ).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}