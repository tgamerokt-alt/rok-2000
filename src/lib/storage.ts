import path from "node:path";
import fs from "node:fs/promises";

const DATA_DIR = path.join(process.cwd(), "data");

export function dataDir() {
  return DATA_DIR;
}

export function dbFilePath() {
  return path.join(DATA_DIR, "db.json");
}

export function kingdomDir(kingdomId: string) {
  return path.join(DATA_DIR, "kingdoms", sanitizeSegment(kingdomId));
}

export function kvkFilePath(kingdomId: string, fileName: string) {
  return path.join(kingdomDir(kingdomId), sanitizeSegment(fileName));
}

/** Strips path separators and traversal sequences from a single path segment. */
export function sanitizeSegment(segment: string) {
  return segment.replace(/[\\/]/g, "_").replace(/\.\./g, "_");
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}
