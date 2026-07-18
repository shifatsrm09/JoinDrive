import DriveCard from "../drive/DriveCard";
import { drives } from "../../data/drives";

export default function FileGrid() {
  return (
    <main className="flex-1 overflow-auto bg-[#1B1B1B] p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Connected Drives
      </h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {drives.map((drive) => (
          <DriveCard
            key={drive.id}
            {...drive}
          />
        ))}
      </div>
    </main>
  );
}