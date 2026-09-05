import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { getFiles } from "../api/drive";
import type { DriveFile } from "../types/drive";

type FolderCacheEntry = {
  files: DriveFile[];
  nextPageToken: string | null;
  updatedAt: number;
};

const CACHE_TTL = 60_000;
const PAGE_SIZE = 50;
const folderCache = new Map<string, FolderCacheEntry>();
const pendingPages = new Map<string, ReturnType<typeof getFiles>>();

function folderKey(accountId: string, folderId: string) {
  return `${accountId}:${folderId}`;
}

function mergeFiles(current: DriveFile[], incoming: DriveFile[]) {
  const files = new Map(current.map((file) => [file.id, file]));

  incoming.forEach((file) => files.set(file.id, file));

  return Array.from(files.values());
}

function requestPage(
  accountId: string,
  folderId: string,
  pageToken?: string
) {
  const key = `${folderKey(accountId, folderId)}:${pageToken || "first"}`;
  const pending = pendingPages.get(key);

  if (pending) {
    return pending;
  }

  const request = getFiles(folderId, accountId, pageToken, PAGE_SIZE).finally(
    () => pendingPages.delete(key)
  );

  pendingPages.set(key, request);

  return request;
}

export function invalidateFolderContents(accountId: string, folderId: string) {
  folderCache.delete(folderKey(accountId, folderId));
}

export default function useFolderContents(
  accountId: string,
  folderId: string
) {
  const key = folderKey(accountId, folderId);
  const initial = folderCache.get(key);
  const [files, setFilesState] = useState<DriveFile[]>(initial?.files || []);
  const [nextPageToken, setNextPageToken] = useState<string | null>(
    initial?.nextPageToken || null
  );
  const [loading, setLoading] = useState(!initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const cached = folderCache.get(key);
    const fresh =
      cached && Date.now() - cached.updatedAt < CACHE_TTL;

    if (fresh) {
      return () => {
        active = false;
      };
    }

    void requestPage(accountId, folderId)
      .then((response) => {
        const entry = {
          files: response.files || [],
          nextPageToken: response.nextPageToken || null,
          updatedAt: Date.now(),
        };

        folderCache.set(key, entry);

        if (!active) {
          return;
        }

        setFilesState(entry.files);
        setNextPageToken(entry.nextPageToken);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (active && !cached) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load files"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [accountId, folderId, key, version]);

  const setFiles = useCallback<Dispatch<SetStateAction<DriveFile[]>>>(
    (action) => {
      setFilesState((current) => {
        const next =
          typeof action === "function" ? action(current) : action;
        const cached = folderCache.get(key);

        folderCache.set(key, {
          files: next,
          nextPageToken: cached?.nextPageToken || nextPageToken,
          updatedAt: Date.now(),
        });

        return next;
      });
    },
    [key, nextPageToken]
  );

  const reload = useCallback(() => {
    folderCache.delete(key);
    setFilesState([]);
    setNextPageToken(null);
    setLoading(true);
    setError("");
    setLoadMoreError("");
    setVersion((value) => value + 1);
  }, [key]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);
      setLoadMoreError("");

      const response = await requestPage(
        accountId,
        folderId,
        nextPageToken
      );

      setFilesState((current) => {
        const merged = mergeFiles(current, response.files || []);

        folderCache.set(key, {
          files: merged,
          nextPageToken: response.nextPageToken || null,
          updatedAt: Date.now(),
        });

        return merged;
      });
      setNextPageToken(response.nextPageToken || null);
      setLoadMoreError("");
    } catch (requestError: unknown) {
      setLoadMoreError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load more files"
      );
    } finally {
      setLoadingMore(false);
    }
  }, [accountId, folderId, key, loadingMore, nextPageToken]);

  return {
    files,
    setFiles,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore: !!nextPageToken,
    loadMore,
    reload,
  };
}
