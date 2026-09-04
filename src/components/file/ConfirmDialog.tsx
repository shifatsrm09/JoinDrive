import Modal from "../ui/Modal";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  danger,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="break-words text-sm leading-relaxed text-zinc-300">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          onClick={onCancel}
          className="min-h-11 rounded-lg px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
        >
          Cancel
        </button>

        <button
          onClick={onConfirm}
          disabled={busy}
          className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
            danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#0E639C] hover:bg-[#1177b8]"
          }`}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
