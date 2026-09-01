import { useState } from "react";
import { Check, Copy, Globe, TriangleAlert, UserPlus } from "lucide-react";

import Modal from "../ui/Modal";
import { shareFile } from "../../api/drive";
import type { DriveFile } from "../../types/drive";

type ShareDialogProps = {
  accountId: string;
  file: DriveFile;
  onClose: () => void;
  onShared: (message: string) => void;
};

type ShareType = "anyone" | "user";

const ROLES = [
  { value: "reader", label: "Viewer" },
  { value: "commenter", label: "Commenter" },
  { value: "writer", label: "Editor" },
];

export default function ShareDialog({
  accountId,
  file,
  onClose,
  onShared,
}: ShareDialogProps) {
  const [type, setType] = useState<ShareType>("anyone");
  const [role, setRole] = useState("reader");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState(file.webViewLink || "");
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);

  async function handleShare() {
    if (type === "user" && !email.trim()) {
      setError("Enter an email address");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const response = await shareFile(accountId, file.id, {
        type,
        role,
        email: type === "user" ? email.trim() : undefined,
      });

      setLink(response.file.webViewLink || "");
      setDone(true);

      onShared(
        type === "anyone"
          ? `"${file.name}" is now shared with anyone who has the link`
          : `"${file.name}" shared with ${email.trim()}`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not share this file"
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Select and copy it manually.");
    }
  }

  return (
    <Modal title={`Share "${file.name}"`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("anyone")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              type === "anyone"
                ? "border-[#0E639C] bg-[#0E639C]/15 text-white"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <Globe size={16} />
            Anyone with link
          </button>

          <button
            onClick={() => setType("user")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              type === "user"
                ? "border-[#0E639C] bg-[#0E639C]/15 text-white"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <UserPlus size={16} />
            Specific person
          </button>
        </div>

        {type === "user" && (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-lg border border-zinc-600 bg-[#1B1B1B] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#0E639C]"
          />
        )}

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-500">
            Permission
          </label>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-lg border border-zinc-600 bg-[#1B1B1B] px-3 py-2 text-sm text-white outline-none focus:border-[#0E639C]"
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {type === "anyone" && (
          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />

            <span>
              Anyone who has the link will be able to open this file,
              including people outside your organisation.
            </span>
          </div>
        )}

        {type === "user" && (
          <p className="text-xs text-zinc-500">
            No notification email is sent. Share the link below yourself.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {done && link && (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-[#1B1B1B] px-3 py-2">
            <span className="flex-1 truncate text-xs text-zinc-300">
              {link}
            </span>

            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
          >
            {done ? "Done" : "Cancel"}
          </button>

          <button
            onClick={handleShare}
            disabled={busy}
            className="rounded-lg bg-[#0E639C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1177b8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Sharing..." : done ? "Update sharing" : "Share"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
