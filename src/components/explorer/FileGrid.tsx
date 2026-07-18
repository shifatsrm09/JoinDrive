import DriveCard from "./DriveCard";

export default function FileGrid() {
  return (
    <main className="flex-1 overflow-auto bg-[#1B1B1B] p-6">
      <div className="grid grid-cols-2 gap-6">
        <DriveCard />
        <DriveCard />
      </div>
    </main>
  );
}