import { useEffect, useState } from "react";
import { getDriveInfo } from "../api/drive";
import type { DriveAccount } from "../types/drive";

export default function useDrive() {
  const [drive, setDrive] = useState<DriveAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDrive() {
      try {
        const response = await getDriveInfo();
        setDrive(response.drive);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load drive");
      } finally {
        setLoading(false);
      }
    }

    loadDrive();
  }, []);

  return {
    drive,
    loading,
    error,
  };
}
