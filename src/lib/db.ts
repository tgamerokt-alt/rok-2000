import fs from "node:fs/promises";
import { DbSchema } from "./types";
import { dataDir, dbFilePath, ensureDir } from "./storage";

const EMPTY_DB: DbSchema = {
  kingdoms: [{ id: "2000", name: "Kingdom 2000", isPrimary: true }],
  kvkMenus: [],
  formulas: {},
  campaigns: [],
  manualStats: {},
};

async function readDb(): Promise<DbSchema> {
  try {
    const raw = await fs.readFile(dbFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<DbSchema>;
    return { ...EMPTY_DB, ...parsed };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await writeDb(EMPTY_DB);
      return EMPTY_DB;
    }
    throw err;
  }
}

async function writeDb(db: DbSchema): Promise<void> {
  await ensureDir(dataDir());
  const tmpPath = `${dbFilePath()}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmpPath, dbFilePath());
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
