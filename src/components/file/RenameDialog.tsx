import { useCallback, useState } from "react";
import type { FormEvent } from "react";

import Modal from "../ui/Modal";
import type { DriveFile } from "../../types/drive";
import { isFolder } from "../../types/drive";

type RenameDialogProps = {
  file: DriveFile;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

export default function RenameDialog({
  file,
  busy,
  onCancel,
  onSubmit,
}: RenameDialogProps) {
  const [name, setName] = useState(file.name);

  const focusInput = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) {
        return;
      }

      input.focus();

      const dot = file.name.lastIndexOf(".");

      if (isFolder(file) || dot <= 0) {
        input.select();
      } else {
        input.setSelectionRange(0, dot);
      }
    },
    [file]
  );

  const trimmed = name.trim();
  const unchanged = trimmed === file.name;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!trimmed || unchanged || busy) {
      return;
    }

    onSubmit(trimmed);
  }

  return (
    <Modal title="Rename" onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <input
          ref={focusInput}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-zinc-600 bg-[#1B1B1B] px-3 py-2 text-sm text-white outline-none focus:border-[#0E639C]"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!trimmed || unchanged || busy}
            className="rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Renaming..." : "Rename"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
