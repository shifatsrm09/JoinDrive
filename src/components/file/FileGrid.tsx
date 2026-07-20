import DriveCard from "../drive/DriveCard";
import useDrive from "../../hooks/useDrive";

type FileGridProps = {
  onOpenDrive: () => void;
};

export default function FileGrid({
  onOpenDrive,
}: FileGridProps) {
  const { drive, loading, error } = useDrive();

  return (
    <main className="flex-1 overflow-auto bg-[#1B1B1B] p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Connected Drives
      </h1>

      {loading && (
        <p className="text-zinc-400">
          Loading drive...
        </p>
      )}

      {error && (
        <p className="text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && drive && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <DriveCard
            id={drive.id}
            name={drive.name}
            email={drive.email}
            used={
              +(
                Number(drive.storage.usage) /
                1024 /
                1024 /
                1024
              ).toFixed(2)
            }
            total={
              +(
                Number(drive.storage.limit) /
                1024 /
                1024 /
                1024
              ).toFixed(2)
            }
            connected={drive.connected}
            onOpen={onOpenDrive}
          />
        </div>
      )}
    </main>
  );
}