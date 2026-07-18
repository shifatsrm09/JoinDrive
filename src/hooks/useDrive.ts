import { useEffect, useState } from "react";
import { getDriveInfo } from "../api/drive";

export default function useDrive() {
  const [drive, setDrive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDrive() {
      try {
        const response = await getDriveInfo();
        setDrive(response.drive);
      } catch (err: any) {
        setError(err.message || "Failed to load drive");
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