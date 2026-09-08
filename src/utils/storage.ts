import type { DriveAccount } from "../types/drive";

function bytes(value?: string): number | null {
  if (value === undefined || value.trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

export function getAccountStorage(account: DriveAccount) {
  const storage = account.connected ? account.storage : null;
  const personal = /@(gmail|googlemail)\.com$/i.test(account.email.trim());
  const driveUsed = bytes(storage?.usageInDrive);
  const used = personal ? bytes(storage?.usage) : driveUsed;
  const reportedLimit = personal ? bytes(storage?.limit) : null;
  const limit = reportedLimit !== null && reportedLimit > 0 ? reportedLimit : null;
  const percentage = used !== null && limit !== null
    ? Math.min(100, (used / limit) * 100)
    : null;

  return { used, driveUsed, limit, percentage, personal };
}

export function getStorageSummary(accounts: DriveAccount[]) {
  const values = accounts.map(getAccountStorage);
  const completeQuota = values.length > 0 && values.every(value =>
    value.used !== null && value.limit !== null
  );
  const available = values.flatMap(value => {
    const used = completeQuota ? value.used : value.driveUsed;
    return used === null ? [] : [used];
  });
  const used = available.length ? available.reduce((sum, value) => sum + value, 0) : null;
  const limit = completeQuota ? values.reduce((sum, value) => sum + value.limit!, 0) : null;
  const percentage = used !== null && limit !== null
    ? Math.min(100, (used / limit) * 100)
    : null;

  return { used, limit, percentage, partial: available.length < values.length };
}

export function formatStorage(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ${units[unit]}`;
}
