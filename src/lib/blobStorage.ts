import { put, del, get, BlobNotFoundError } from "@vercel/blob";

/**
 * Persistence lives in a private Vercel Blob store (the read-write token
 * comes from `BLOB_READ_WRITE_TOKEN`, auto-injected when a Blob store is
 * attached to the Vercel project; set it manually in `.env` for local dev).
 * `access: "private"` keeps blobs from being fetchable by a guessed/leaked
 * URL — reads/writes always go through this server-side token, same trust
 * model as the Google Drive shared-folder setup this replaced.
 *
 * `addRandomSuffix: false` + `allowOverwrite: true` keeps a stable pathname
 * per file name (like a normal filesystem) instead of Vercel Blob's default
 * of minting a new URL per upload.
 */

/**
 * Reads a file by pathname from the Blob store. Returns null if it doesn't exist.
 *
 * `useCache: false` is required — `db.json` gets overwritten on every
 * mutation, and `get()` defaults to serving from Vercel's CDN cache, which
 * can return the pre-write version for a bit after a `put()`. Without this,
 * a fresh save can appear to "disappear" on the very next read.
 */
export async function readBlobFile(name: string): Promise<Buffer | null> {
  try {
    const result = await get(name, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

/** Creates or overwrites (in place) a file by pathname in the Blob store. */
export async function writeBlobFile(name: string, data: Buffer | string): Promise<void> {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  await put(name, body, { access: "private", addRandomSuffix: false, allowOverwrite: true });
}

/** Deletes a file by pathname from the Blob store. No-op if it doesn't exist. */
export async function deleteBlobFile(name: string): Promise<void> {
  try {
    await del(name);
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) throw err;
  }
}
