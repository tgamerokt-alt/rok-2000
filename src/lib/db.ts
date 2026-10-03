import { cache } from "react";
import { DbSchema } from "./types";
import { backupFileName, dbFileName, preRestoreBackupFileName } from "./storage";
import { readStoredFile, writeStoredFile } from "./driveStorage";

const EMPTY_DB: DbSchema = {
  kingdoms: [{ id: "2000", name: "Kingdom 2000", isPrimary: true }],
  kvkMenus: [],
  formulas: {},
  campaigns: [],
  manualStats: {},
  targets: {},
};

async function readDb(): Promise<DbSchema> {
  const raw = await readStoredFile(dbFileName());
  if (raw === null) {
    await writeDb(EMPTY_DB);
    return EMPTY_DB;
  }
  const parsed = JSON.parse(raw.toString("utf8")) as Partial<DbSchema>;
  return { ...EMPTY_DB, ...parsed };
}

async function writeDb(db: DbSchema): Promise<void> {
  await writeStoredFile(dbFileName(), JSON.stringify(db, null, 2));
}

/** Serializes read-modify-write cycles so concurrent requests never clobber each other. */
let writeQueue: Promise<unknown> = Promise.resolve();

export function withDb<T>(mutator: (db: DbSchema) => T | Promise<T>): Promise<T> {
  const result = writeQueue.then(async () => {
    const db = await readDb();
    // First write of each (UTC) day: keep the pre-mutation state as that day's backup.
    const today = new Date().toISOString().slice(0, 10);
    const backup = db.lastBackupDay !== today ? JSON.stringify(db, null, 2) : null;
    const value = await mutator(db);
    if (backup) {
      await writeStoredFile(backupFileName(today), backup);
      db.lastBackupDay = today;
    }
    await writeDb(db);
    return value;
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

/** Replaces the whole db (restore), saving the current one first so the restore can be undone. */
export function replaceDb(next: DbSchema): Promise<void> {
  const result = writeQueue.then(async () => {
    const current = await readDb();
    await writeStoredFile(preRestoreBackupFileName(), JSON.stringify(current, null, 2));
    await writeDb({ ...EMPTY_DB, ...next, lastBackupDay: current.lastBackupDay });
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

/** Read-only view for pages; deduped per render so a page's many data helpers share one Drive download. */
export const readDbSnapshot = cache(async (): Promise<DbSchema> => readDb());
