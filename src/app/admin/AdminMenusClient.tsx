"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ActionState,
  createKvkMenuAction,
  deleteKvkMenuAction,
  updateKvkMenuFileAction,
} from "@/lib/actions";
import { KvkMenu } from "@/lib/types";
import { Dictionary, formatTemplate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { SnapshotArrow, SnapshotSlot } from "@/components/ui/SnapshotSlot";
import { confirmAction, notifyResult } from "@/lib/confirm";

const initialState: ActionState = {};

function CreateMenuForm({ kingdomId, t }: { kingdomId: string; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(createKvkMenuAction, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) notifyResult({ success: true, message: t.admin.menus.createSuccess });
  }, [state, t]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        {t.admin.menus.addMenu}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/20"
    >
      <input type="hidden" name="kingdomId" value={kingdomId} />

      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          {t.admin.menus.nameLabel}
        </label>
        <input
          name="name"
          placeholder={t.admin.menus.namePlaceholder}
          className="w-full max-w-xs rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      <p className="text-xs leading-snug text-slate-500">{t.admin.menus.fileSourceHint}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <SnapshotSlot
          step={1}
          title={t.admin.menus.beforeSlotTitle}
          description={t.admin.menus.beforeSlotDescription}
          dateInputName="startDate"
          dateCaption={t.admin.menus.startDate}
          fileName="beforeFile"
        />
        <SnapshotArrow />
        <SnapshotSlot
          step={2}
          title={t.admin.menus.afterSlotTitle}
          description={t.admin.menus.afterSlotDescription}
          dateInputName="endDate"
          dateCaption={t.admin.menus.endDate}
          fileName="afterFile"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
        >
          {pending ? t.admin.menus.creating : t.admin.menus.create}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

function MenuNameEditor({ menu, t }: { menu: KvkMenu; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(updateKvkMenuFileAction, initialState);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) {
      notifyResult({ success: true, message: t.admin.menus.updateSuccess });
      setEditing(false);
    }
  }, [state, t]);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-semibold text-slate-900 dark:text-white">{menu.name}</div>
        <button
          onClick={() => setEditing(true)}
          className="text-[11px] text-slate-500 underline hover:text-amber-500 dark:text-slate-400"
        >
          {t.admin.menus.renameMenu}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="menuId" value={menu.id} />
      <input
        name="name"
        defaultValue={menu.name}
        placeholder={t.admin.menus.namePlaceholder}
        autoFocus
        className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? t.common.saving : t.common.save}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {t.common.cancel}
      </button>
    </form>
  );
}

function MenuRow({ menu, t, locale }: { menu: KvkMenu; t: Dictionary; locale: string }) {
  const [state, formAction, pending] = useActionState(updateKvkMenuFileAction, initialState);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) notifyResult({ success: true, message: t.admin.menus.updateSuccess });
  }, [state, t]);

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: t.admin.menus.deleteConfirmTitle,
      text: t.admin.menus.deleteConfirmText,
      confirmLabel: t.common.confirmDelete,
      cancelLabel: t.common.cancel,
    });
    if (!confirmed) return;
    setDeleting(true);
    await deleteKvkMenuAction(menu.id);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <MenuNameEditor menu={menu} t={t} />
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {menu.startDate} — {menu.endDate}
          </div>
          <div className="text-[11px] text-slate-500">
            {t.admin.menus.beforeFile}: {menu.beforeFileName} · {t.admin.menus.afterFile}: {menu.afterFileName}
          </div>
          <div className="text-[11px] text-slate-500">
            {t.admin.menus.lastUpdated}: {new Date(menu.updatedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {editing ? t.common.close : t.admin.menus.updateFile}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            {deleting ? "..." : t.common.delete}
          </button>
        </div>
      </div>

      {editing && (
        <form
          action={formAction}
          className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-800"
        >
          <input type="hidden" name="menuId" value={menu.id} />
          <p className="text-xs text-slate-500">{t.admin.menus.updateHint}</p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <SnapshotSlot
              step={1}
              title={t.admin.menus.beforeSlotTitle}
              description={t.admin.menus.beforeSlotDescription}
              dateInputName="startDate"
              dateCaption={t.admin.menus.startDate}
              dateDefaultValue={menu.startDate}
              fileName="beforeFile"
              fileRequired={false}
            />
            <SnapshotArrow />
            <SnapshotSlot
              step={2}
              title={t.admin.menus.afterSlotTitle}
              description={t.admin.menus.afterSlotDescription}
              dateInputName="endDate"
              dateCaption={t.admin.menus.endDate}
              dateDefaultValue={menu.endDate}
              fileName="afterFile"
              fileRequired={false}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
            >
              {pending ? t.admin.menus.replacing : t.admin.menus.replaceFile}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function AdminMenusClient({
  kingdomId,
  menus,
  t,
  locale,
}: {
  kingdomId: string;
  menus: KvkMenu[];
  t: Dictionary;
  locale: string;
}) {
  return (
    <main className="flex-1">
      <PageContainer>
        <PageHeader
          title={formatTemplate(t.admin.menus.title, { id: kingdomId })}
          subtitle={t.admin.menus.subtitle}
        />

        <CreateMenuForm kingdomId={kingdomId} t={t} />

        <div className="flex flex-col gap-3">
          {menus.length === 0 && (
            <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.admin.menus.empty}</Card>
          )}
          {menus.map((menu) => (
            <MenuRow key={menu.id} menu={menu} t={t} locale={locale} />
          ))}
        </div>
      </PageContainer>
    </main>
  );
}
