import { useCallback, useEffect, useState } from "react";

import { getAccounts } from "../api/drive";
import type { DriveAccount } from "../types/drive";

function toMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function useDriveAccounts(refreshKey?: string | null) {
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await getAccounts();

        if (!cancelled) {
          setAccounts(response.accounts || []);
          setError("");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(toMessage(err, "Failed to load connected drives"));
          setAccounts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, version]);

  return {
    accounts,
    loading,
    error,
    reload,
  };
}
