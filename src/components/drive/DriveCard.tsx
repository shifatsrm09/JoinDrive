import { HardDrive, CheckCircle2, MoreVertical } from "lucide-react";
import type { Drive } from "../../types/drive";

type DriveCardProps = Drive;

export default function DriveCard({
  name,
  email,
  used,
  total,
  connected,
}: DriveCardProps) {
  const percentage = (used / total) * 100;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#252525] p-5 transition hover:border-[#0E639C] hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#0E639C]/20 p-3">
            <HardDrive className="text-[#4DA3FF]" size={24} />
          </div>

          <div>
            <h2 className="font-semibold text-white">{name}</h2>
            <p className="text-sm text-zinc-400">{email}</p>
          </div>
        </div>

        <button className="rounded-lg p-2 hover:bg-zinc-700">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span>Storage</span>
          <span>
            {used} GB / {total} GB
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
          <div
            className="h-full rounded-full bg-[#0E639C]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div
        className={`mt-5 flex items-center gap-2 text-sm ${
          connected ? "text-green-400" : "text-red-400"
        }`}
      >
        <CheckCircle2 size={16} />
        {connected ? "Connected" : "Disconnected"}
      </div>
    </div>
  );
}