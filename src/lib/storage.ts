/** Strips path separators and traversal sequences from a single path segment. */
export function sanitizeSegment(segment: string) {
  return segment.replace(/[\\/]/g, "_").replace(/\.\./g, "_");
}

/** Daily db.json backups rotate through one slot per day-of-month (~a month of history, max 31 blobs). */
export const BACKUP_PREFIX = "db-backup-";

export function backupFileName(isoDay: string) {
  return `${BACKUP_PREFIX}day-${isoDay.slice(8, 10)}.json`;
}

/** Snapshot of the db taken right before a restore, so a restore itself can be undone. */
export function preRestoreBackupFileName() {
  return `${BACKUP_PREFIX}before-restore.json`;
}

export function dbFileName() {
  return "db.json";
}

/**
 * Flat Blob store pathname for a KvK snapshot. Filenames already embed the
 * kingdom id (e.g. `2000_2026-09-01_before_stats.json` — the admin still
 * *uploads* a Lilith statsExport.xlsx, but it's parsed to JSON once on
 * upload and only that parsed JSON is what actually gets stored) so this
 * is globally unique within the single flat Blob store namespace without
 * needing per-kingdom folders.
 */
export function kvkFileName(kingdomId: string, fileName: string) {
  return `${sanitizeSegment(kingdomId)}__${sanitizeSegment(fileName)}`;
}
