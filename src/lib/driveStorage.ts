/**
 * Persistence on Google Drive: every file (db.json, backups, parsed KvK
 * snapshots) lives flat in ONE Drive folder, addressed by file *name* —
 * same "pathname" model the app already used with Vercel Blob, so callers
 * just pass names like `db.json` / `2000__2000_2026-09-01_before_stats.json`.
 *
 * Auth is OAuth as the admin's own Google account (a service account has no
 * storage quota of its own on a personal Drive). Env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   OAuth client (Google Cloud Console)
 *   GOOGLE_REFRESH_TOKEN                     long-lived, scope `drive` or `drive.file`
 *   GOOGLE_DRIVE_FOLDER_ID                   the folder everything is stored in
 * Plain `fetch` against the Drive v3 REST API — no googleapis dependency.
 */

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured (see CLAUDE.md → Storage)`);
  return v;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: env("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) cachedToken = null; // next call re-mints a token
  return res;
}

async function ok(res: Response, what: string): Promise<Response> {
  if (!res.ok) throw new Error(`Google Drive ${what} failed (${res.status}): ${await res.text()}`);
  return res;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

function q(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** name → file id, per server instance; saves the lookup round-trip on repeat reads. */
const idCache = new Map<string, string>();

/** Finds the Drive file id for `name` in the app folder (newest wins if duplicates ever exist). */
async function findId(name: string, opts: { fresh?: boolean } = {}): Promise<string | null> {
  const hit = idCache.get(name);
  if (hit && !opts.fresh) return hit;
  const params = new URLSearchParams({
    q: `name = ${q(name)} and ${q(env("GOOGLE_DRIVE_FOLDER_ID"))} in parents and trashed = false`,
    fields: "files(id)",
    orderBy: "modifiedTime desc",
    pageSize: "1",
  });
  const res = await ok(await driveFetch(`${DRIVE}/files?${params}`), "lookup");
  const { files } = (await res.json()) as { files: { id: string }[] };
  const id = files[0]?.id ?? null;
  if (id) idCache.set(name, id);
  else idCache.delete(name);
  return id;
}

/** Every live file id with this name (normally one; more only if a create race ever slipped through). */
async function findAllIds(name: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `name = ${q(name)} and ${q(env("GOOGLE_DRIVE_FOLDER_ID"))} in parents and trashed = false`,
      fields: "nextPageToken, files(id)",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await ok(await driveFetch(`${DRIVE}/files?${params}`), "lookup");
    const page = (await res.json()) as { files: { id: string }[]; nextPageToken?: string };
    ids.push(...page.files.map((f) => f.id));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return ids;
}

/**
 * Serializes writes/deletes per file name within this server instance. Without it, two concurrent
 * first-writes of the same name (e.g. a page that reads a still-missing db.json several times at
 * once) each see "no file yet" and each create one, leaving duplicates.
 */
const nameLocks = new Map<string, Promise<unknown>>();

function withNameLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const run = (nameLocks.get(name) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => undefined);
  nameLocks.set(name, tail);
  void tail.then(() => {
    if (nameLocks.get(name) === tail) nameLocks.delete(name);
  });
  return run;
}

/** Reads a file by name. Returns null if it doesn't exist. */
export async function readStoredFile(name: string): Promise<Buffer | null> {
  for (const fresh of [false, true]) {
    const id = await findId(name, { fresh });
    if (!id) return null;
    const res = await driveFetch(`${DRIVE}/files/${id}?alt=media`);
    if (res.status === 404) {
      idCache.delete(name); // stale cached id — retry once with a fresh lookup
      continue;
    }
    await ok(res, "download");
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

/** Creates the file, or overwrites its contents in place (same id) if it exists. */
export function writeStoredFile(name: string, data: Buffer | string): Promise<void> {
  return withNameLock(name, () => writeStoredFileUnlocked(name, data));
}

async function writeStoredFileUnlocked(name: string, data: Buffer | string): Promise<void> {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  const id = await findId(name, { fresh: true });

  if (id) {
    await ok(
      await driveFetch(`${UPLOAD}/files/${id}?uploadType=media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(body),
      }),
      "update"
    );
    return;
  }

  const boundary = `rok${Date.now().toString(36)}`;
  const meta = JSON.stringify({ name, parents: [env("GOOGLE_DRIVE_FOLDER_ID")] });
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    body,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await ok(
    await driveFetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: new Uint8Array(multipart),
    }),
    "create"
  );
  idCache.set(name, ((await res.json()) as { id: string }).id);
}

/** Deletes a file by name (every copy, if duplicates ever existed). No-op if it doesn't exist. */
export function deleteStoredFile(name: string): Promise<void> {
  return withNameLock(name, async () => {
    const ids = await findAllIds(name);
    idCache.delete(name);
    for (const id of ids) {
      const res = await driveFetch(`${DRIVE}/files/${id}`, { method: "DELETE" });
      if (res.status !== 404) await ok(res, "delete");
    }
  });
}

/** Lists files in the app folder whose name starts with `prefix`. */
export async function listStoredFiles(prefix: string): Promise<{ pathname: string; uploadedAt: Date; size: number }[]> {
  const out: { pathname: string; uploadedAt: Date; size: number }[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `${q(env("GOOGLE_DRIVE_FOLDER_ID"))} in parents and trashed = false and name contains ${q(prefix)}`,
      fields: "nextPageToken, files(id,name,modifiedTime,size)",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await ok(await driveFetch(`${DRIVE}/files?${params}`), "list");
    const page = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    for (const f of page.files) {
      // `contains` matches word tokens anywhere in the name — enforce a true prefix match.
      if (f.name.startsWith(prefix)) {
        out.push({ pathname: f.name, uploadedAt: new Date(f.modifiedTime), size: Number(f.size ?? 0) });
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}
