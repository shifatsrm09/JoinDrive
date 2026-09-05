import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { getAccounts } from "../api/drive";
import type { DriveAccount } from "../types/drive";

type AccountsState = {
  accounts: DriveAccount[];
  loading: boolean;
  error: string;
  updatedAt: number;
};

const CACHE_TTL = 60_000;
const listeners = new Set<() => void>();

let state: AccountsState = {
  accounts: [],
  loading: false,
  error: "",
  updatedAt: 0,
};

let pendingRequest: Promise<DriveAccount[]> | null = null;

function publish(nextState: AccountsState) {
  state = nextState;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function loadAccounts(force = false) {
  const fresh = state.updatedAt > 0 && Date.now() - state.updatedAt < CACHE_TTL;

  if (!force && fresh) {
    return Promise.resolve(state.accounts);
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  const hasCachedAccounts = state.updatedAt > 0;

  publish({
    ...state,
    loading: !hasCachedAccounts,
    error: "",
  });

  pendingRequest = getAccounts(force)
    .then((response) => {
      const accounts = response.accounts || [];

      publish({
        accounts,
        loading: false,
        error: "",
        updatedAt: Date.now(),
      });

      return accounts;
    })
    .catch((error: unknown) => {
      publish({
        ...state,
        loading: false,
        error:
          state.updatedAt > 0
            ? ""
            : error instanceof Error
            ? error.message
            : "Failed to load connected drives",
      });

      throw error;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export default function useDriveAccounts(refreshKey?: string | null) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const mountedRef = useRef(false);

  useEffect(() => {
    const force = mountedRef.current;

    mountedRef.current = true;
    void loadAccounts(force).catch(() => undefined);
  }, [refreshKey]);

  const reload = useCallback(() => {
    void loadAccounts(true).catch(() => undefined);
  }, []);

  return {
    accounts: snapshot.accounts,
    loading: snapshot.loading,
    error: snapshot.error,
    reload,
  };
}
