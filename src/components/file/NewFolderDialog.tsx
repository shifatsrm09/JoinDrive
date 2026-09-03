import { useState } from "react";
import type { FormEvent } from "react";

import Modal from "../ui/Modal";

type NewFolderDialogProps = {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

export default function NewFolderDialog({
  busy,
  onCancel,
  onSubmit,
}: NewFolderDialogProps) {
  const [name, setName] = useState("New Folder");

  const trimmed = name.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!trimmed || busy) {
      return;
    }

    onSubmit(trimmed);
  }

  return (
    <Modal title="New folder" onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onFocus={(event) => event.target.select()}
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
            disabled={!trimmed || busy}
            className="rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
