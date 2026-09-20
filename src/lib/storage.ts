/** Strips path separators and traversal sequences from a single path segment. */
export function sanitizeSegment(segment: string) {
  return segment.replace(/[\\/]/g, "_").replace(/\.\./g, "_");
}

export function dbFileName() {
  return "db.json";
}

/**
 * Flat Blob store pathname for a KvK snapshot. Filenames already embed the
 * kingdom id (e.g. `2000_2026-09-01_before_statsExport.xlsx`) so this is
 * globally unique within the single flat Blob store namespace without
 * needing per-kingdom folders.
 */
export function kvkFileName(kingdomId: string, fileName: string) {
  return `${sanitizeSegment(kingdomId)}__${sanitizeSegment(fileName)}`;
}
