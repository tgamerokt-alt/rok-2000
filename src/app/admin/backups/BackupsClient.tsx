"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreBackupAction } from "@/lib/actions";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { confirmAction, notifyResult } from "@/lib/confirm";

export default function BackupsClient({
  backups,
  t,
  locale,
}: {
  backups: { pathname: string; uploadedAt: string; size: number }[];
  t: Dictionary;
  locale: string;
}) {
  const tb = t.admin.backups;
  const router = useRouter();
  const [restoring, setRestoring] = useState<string | null>(null);

  async function handleRestore(pathname: string, when: string) {
    const confirmed = await confirmAction({
      title: tb.restoreConfirmTitle,
      text: formatTemplate(tb.restoreConfirmText, { when }),
      confirmLabel: tb.restore,
      cancelLabel: t.common.cancel,
    });
    if (!confirmed) return;
    setRestoring(pathname);
    const result = await restoreBackupAction(pathname);
    setRestoring(null);
    if (result.error) {
      notifyResult({ success: false, message: result.error });
      return;
    }
    notifyResult({
      success: true,
      message: result.droppedMenus
        ? formatTemplate(tb.restoreSuccessDropped, { n: String(result.droppedMenus) })
        : tb.restoreSuccess,
    });
    router.refresh();
  }

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-3xl">
        <PageHeader title={tb.title} subtitle={tb.subtitle} />

        {backups.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{tb.empty}</Card>
        ) : (
          <div className="flex flex-col gap-2">
            {backups.map((b) => {
              const when = new Date(b.uploadedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US");
              const isPreRestore = b.pathname.includes("before-restore");
              return (
                <Card key={b.pathname} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{when}</div>
                    <div className="text-[11px] text-slate-500">
                      {isPreRestore ? tb.preRestoreLabel : tb.dailyLabel} · {(b.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={restoring !== null}
                    onClick={() => handleRestore(b.pathname, when)}
                    className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                  >
                    {restoring === b.pathname ? tb.restoring : tb.restore}
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </main>
  );
}
