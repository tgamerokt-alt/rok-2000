import { DbSchema } from "./types";
import { dbFileName } from "./storage";
import { readBlobFile, writeBlobFile } from "./blobStorage";

const EMPTY_DB: DbSchema = {
  kingdoms: [{ id: "2000", name: "Kingdom 2000", isPrimary: true }],
  kvkMenus: [],
  formulas: {},
  campaigns: [],
  manualStats: {},
};

async function readDb(): Promise<DbSchema> {
  const raw = await readBlobFile(dbFileName());
  if (raw === null) {
    await writeDb(EMPTY_DB);
    return EMPTY_DB;
  }
  const parsed = JSON.parse(raw.toString("utf8")) as Partial<DbSchema>;
  return { ...EMPTY_DB, ...parsed };
}

async function writeDb(db: DbSchema): Promise<void> {
  await writeBlobFile(dbFileName(), JSON.stringify(db, null, 2));
}

/** Serializes read-modify-write cycles so concurrent requests never clobber each other. */
let writeQueue: Promise<unknown> = Promise.resolve();

export function withDb<T>(mutator: (db: DbSchema) => T | Promise<T>): Promise<T> {
  const result = writeQueue.then(async () => {
    const db = await readDb();
    const value = await mutator(db);
    await writeDb(db);
    return value;
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function readDbSnapshot(): Promise<DbSchema> {
  return readDb();
}
