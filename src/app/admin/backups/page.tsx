import { listBlobFiles } from "@/lib/blobStorage";
import { BACKUP_PREFIX } from "@/lib/storage";
import { getDictionary } from "@/lib/i18n/locale";
import BackupsClient from "./BackupsClient";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const [files, { t, locale }] = await Promise.all([listBlobFiles(BACKUP_PREFIX), getDictionary()]);
  const backups = files
    .map((f) => ({ pathname: f.pathname, uploadedAt: f.uploadedAt.toISOString(), size: f.size }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return <BackupsClient backups={backups} t={t} locale={locale} />;
}
