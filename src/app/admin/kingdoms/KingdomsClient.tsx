"use client";

import { ChangeEvent, ClipboardEvent, useActionState, useEffect, useRef, useState } from "react";
import {
  ActionState,
  addCampaignKingdomAction,
  addCampaignKingdomsFromJsonAction,
  addCampaignTeamAction,
  createCampaignAction,
  deleteCampaignAction,
  deleteCampaignTeamAction,
  deleteManualKingdomStatAction,
  removeCampaignKingdomAction,
  setManualKingdomStatAction,
  updateCampaignAction,
} from "@/lib/actions";
import { Campaign, CampaignTeam, ManualKingdomStat } from "@/lib/types";
import { CAMPAIGN_CAMP_PRESETS, styleForTeam } from "@/lib/campaignColors";
import { UNIT_OPTIONS, UnitOption, splitAmountUnit } from "@/lib/units";
import { extractStatsFromImage } from "@/lib/ocr";
import { Dictionary, formatTemplate, Locale } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { ComboBoxInput } from "@/components/ui/ComboBoxInput";
import { confirmAction, notifyResult } from "@/lib/confirm";

const initialState: ActionState = {};

const smallButtonClass =
  "rounded-md border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-60";

/**
 * Runs entirely in the admin's own browser, against Lilith's official overview page
 * (rok-game-tools-global.lilith.com) — never touches Lilith's login/CAPTCHA, never sends
 * any token to our server. Reads the already-authenticated session's `pauth` token fresh
 * from `localStorage["rok-auth-storage"]` (falls back to the `pauth` cookie) each run, so
 * it keeps working across that token's own ~30-day rotation without editing this script.
 * Fires only 2 requests at a time (worker pool below) — deliberately throttled, not maxed
 * out, to keep this looking like normal browsing rather than a burst of bot traffic against
 * Lilith's API and reduce any chance of the account getting rate-limited or flagged.
 * Keys each result by the server_id actually requested, never the response's own `name`
 * field — Lilith's API can return a different internal name than the kingdom number an
 * admin typed in (confirmed: this account's own localStorage has serverId "1000" but
 * displayServerId/serverName "2000" — they're not interchangeable), which silently wrote
 * wrong kingdomIds ("1047" saved as "47") the one time this used `name` instead.
 * Paste as a browser-console snippet (verified working) or save as a bookmarklet.
 */
const LILITH_FETCH_SCRIPT = `(async()=>{let auth;try{auth=JSON.parse(localStorage.getItem("rok-auth-storage")||"{}")?.state?.pauth;}catch(e){}if(!auth){const m=document.cookie.match(/(?:^|;\\s*)pauth=([^;]+)/);auth=m&&decodeURIComponent(m[1]);}if(!auth){alert("Token not found. Reload this page, log in again, then retry.");return;}const saved=localStorage.getItem("__rok_bm_ids")||"1047,1308,1498,1545";const input=prompt("Kingdom IDs (comma separated):",saved);if(!input)return;localStorage.setItem("__rok_bm_ids",input);const ids=[...new Set(input.split(/[,\\s]+/).map(s=>s.trim()).filter(Boolean))];const results=[];let unauthorized=false;let idx=0;async function worker(){while(idx<ids.length){const id=ids[idx++];try{const res=await fetch("https://plat-rok-gametools-global-api.lilithgames.com/api/kindomInformation?server_id="+id,{headers:{accept:"application/json, text/plain, */*",authorization:"Bearer "+auth,lang:"en_US"}});if(res.status===401||res.status===403){unauthorized=true;continue;}const json=await res.json();if(json.code===200&&json.data){const d=json.data;results.push({kingdomId:id,power:d.power,dead_total:d.dead,total_kill_points:d.kill,latest_kvk_kills:d.kvkKillScore});}else{results.push({kingdomId:id,error:json.msg||"failed"});}}catch(e){results.push({kingdomId:id,error:String(e)});}}}await Promise.all(Array.from({length:Math.min(2,ids.length)},worker));if(unauthorized){alert("Token expired or invalid. Reload the Lilith page, log in again, then try again.");return;}const ok=results.filter(r=>!r.error);const failed=results.filter(r=>r.error);const text=JSON.stringify(ok,null,2);let copied=false;try{await navigator.clipboard.writeText(text);copied=true;}catch(e){}if(copied){alert("Copied "+ok.length+"/"+ids.length+" kingdom(s) to clipboard."+(failed.length?("\\nFailed: "+failed.map(f=>f.kingdomId).join(", ")):"")+"\\n\\nGo to the camp on /admin/kingdoms, switch \\"Add kingdom\\" to Auto (paste JSON), and paste it there.");}else{console.log("%c===== COPY THE STRING BELOW (right-click it, choose \\"Copy string contents\\") =====","font-weight:bold;color:orange");console.log(text);alert("Auto-copy blocked. Scroll up in the Console: right-click the printed JSON line just above and choose \\"Copy string contents\\" (or select the text and press Ctrl+C), then paste it into the Auto (paste JSON) box when adding kingdoms to a camp.");}})();`;

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

function CreateCampaignForm({ t }: { t: Dictionary }) {
  const [state, formAction, pending] = useActionState(createCampaignAction, initialState);

  return (
    <form
      action={formAction}
      className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 sm:flex-row sm:flex-wrap sm:items-end dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-black/20"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          {t.admin.campaigns.campaignName}
        </label>
        <input
          name="name"
          required
          placeholder={t.admin.campaigns.campaignNamePlaceholder}
          className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
          {t.admin.campaigns.campaignCode}
        </label>
        <input
          name="code"
          required
          placeholder={t.admin.campaigns.campaignCodePlaceholder}
          className="w-48 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? t.admin.campaigns.creating : t.admin.campaigns.createCampaign}
      </button>
      {state.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">
          {t.admin.campaigns.createSuccess}
        </p>
      )}
    </form>
  );
}

function LilithFetchHelp({ t }: { t: Dictionary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-left text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
      >
        {open ? t.common.close : t.admin.campaigns.lilithFetchToggle}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs leading-snug text-slate-500 dark:text-slate-400 whitespace-pre-line">
            {t.admin.campaigns.lilithFetchHint}
          </p>
          <textarea
            readOnly
            rows={4}
            value={LILITH_FETCH_SCRIPT}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-[10px] text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(LILITH_FETCH_SCRIPT);
              notifyResult({ success: true, message: t.admin.campaigns.lilithFetchCopied });
            }}
            className={`${smallButtonClass} self-start border-sky-400 text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950`}
          >
            {t.admin.campaigns.lilithFetchCopyScript}
          </button>
        </div>
      )}
    </div>
  );
}

function EditCampaignForm({
  campaign,
  onCancel,
  onSaved,
  t,
}: {
  campaign: Campaign;
  onCancel: () => void;
  onSaved: () => void;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(updateCampaignAction, initialState);

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) {
      notifyResult({ success: true, message: t.admin.campaigns.editSuccess });
      onSaved();
    }
  }, [state, t, onSaved]);

  return (
    <form
      action={formAction}
      onClick={(e) => e.stopPropagation()}
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
    >
      <input type="hidden" name="campaignId" value={campaign.id} />
      <input
        name="name"
        required
        defaultValue={campaign.name}
        placeholder={t.admin.campaigns.campaignNamePlaceholder}
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      <input
        name="code"
        required
        defaultValue={campaign.code}
        placeholder={t.admin.campaigns.campaignCodePlaceholder}
        className="w-32 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      <button
        type="submit"
        disabled={pending}
        className={`${smallButtonClass} bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60`}
      >
        {pending ? t.common.saving : t.common.save}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`${smallButtonClass} border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
      >
        {t.common.cancel}
      </button>
    </form>
  );
}

function AddTeamForm({
  campaignId,
  locale,
  t,
}: {
  campaignId: string;
  locale: Locale;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(addCampaignTeamAction, initialState);
  const presets = CAMPAIGN_CAMP_PRESETS[locale];
  // ComboBoxInput is a controlled input, so React's automatic form-reset-after-action
  // (which only applies to uncontrolled fields) doesn't clear it — remount it instead.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) setResetKey((k) => k + 1);
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="campaignId" value={campaignId} />
      <ComboBoxInput
        key={resetKey}
        name="name"
        required
        placeholder={t.admin.campaigns.campNamePlaceholder}
        options={presets}
        className="w-72"
      />
      <button
        type="submit"
        disabled={pending}
        className={`${smallButtonClass} border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950`}
      >
        {t.admin.campaigns.addTeam}
      </button>
    </form>
  );
}

function AddKingdomForm({ campaignId, teamId, t }: { campaignId: string; teamId: string; t: Dictionary }) {
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [manualState, manualAction, manualPending] = useActionState(addCampaignKingdomAction, initialState);
  const [autoState, autoAction, autoPending] = useActionState(addCampaignKingdomsFromJsonAction, initialState);
  const [autoResetKey, setAutoResetKey] = useState(0);

  useEffect(() => {
    if (manualState.error) notifyResult({ success: false, message: manualState.error });
  }, [manualState]);

  useEffect(() => {
    if (autoState.error) notifyResult({ success: false, message: autoState.error });
    else if (autoState.success) {
      notifyResult({ success: true, message: t.admin.campaigns.bulkImportSuccess });
      setAutoResetKey((k) => k + 1);
    }
  }, [autoState, t]);

  const radioName = `addKingdomMode-${teamId}`;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={radioName}
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
          />
          {t.admin.campaigns.addKingdomModeManual}
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name={radioName} checked={mode === "auto"} onChange={() => setMode("auto")} />
          {t.admin.campaigns.addKingdomModeAuto}
        </label>
      </div>

      {mode === "manual" ? (
        <form action={manualAction} className="flex items-center gap-2">
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="teamId" value={teamId} />
          <input
            name="kingdomId"
            required
            placeholder={t.admin.campaigns.addKingdomPlaceholder}
            className="w-56 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            disabled={manualPending}
            className={`${smallButtonClass} border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
          >
            {t.admin.campaigns.addKingdom}
          </button>
        </form>
      ) : (
        <form key={autoResetKey} action={autoAction} className="flex flex-col gap-2">
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="teamId" value={teamId} />
          <textarea
            name="json"
            required
            rows={4}
            placeholder='[{"kingdomId":"1000","power":9369210684,"dead_total":1737283400,"total_kill_points":163410364113,"latest_kvk_kills":32400000000}]'
            className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            disabled={autoPending}
            className={`${smallButtonClass} self-start border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950`}
          >
            {autoPending ? t.admin.campaigns.bulkImportSaving : t.admin.campaigns.bulkImportSave}
          </button>
        </form>
      )}
    </div>
  );
}

type AmountUnit = { amount: string; unit: UnitOption };
type ManualFieldKey = "power" | "dead_total" | "total_kill_points" | "latest_kvk_kills";
const MANUAL_FIELD_KEYS: ManualFieldKey[] = ["power", "dead_total", "total_kill_points", "latest_kvk_kills"];

function AmountUnitField({
  field,
  label,
  value,
  onChange,
  required,
}: {
  field: string;
  label: string;
  value: AmountUnit;
  onChange: (patch: Partial<AmountUnit>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <div className="flex gap-1.5">
        <input
          name={`${field}_amount`}
          type="number"
          step="any"
          min="0"
          required={required}
          value={value.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="9.3"
          className="w-full min-w-0 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <select
          name={`${field}_unit`}
          value={value.unit}
          onChange={(e) => onChange({ unit: e.target.value as UnitOption })}
          className="rounded-md border border-slate-300 bg-slate-100 px-2 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ImagePasteZone({
  loading,
  onImage,
  t,
}: {
  loading: boolean;
  onImage: (image: File | Blob) => void;
  t: Dictionary;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showExample, setShowExample] = useState(false);

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
    const blob = item?.getAsFile();
    if (blob) onImage(blob);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImage(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        tabIndex={0}
        role="button"
        onPaste={handlePaste}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500 transition hover:border-amber-400 hover:bg-amber-50/60 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-amber-600 dark:hover:bg-amber-950/30"
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <span>{loading ? t.admin.campaigns.ocrLoading : t.admin.campaigns.ocrDropzone}</span>
      </div>

      <button
        type="button"
        onClick={() => setShowExample((v) => !v)}
        className="self-start text-[11px] text-amber-600 hover:underline dark:text-amber-400"
      >
        {showExample ? t.admin.campaigns.ocrExampleHide : t.admin.campaigns.ocrExampleShow}
      </button>
      {showExample && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element -- static local asset, no need for next/image here */}
          <img
            src="/examples/stats-overview-example.jpg"
            alt={t.admin.campaigns.ocrExampleShow}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700"
          />
          <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {t.admin.campaigns.ocrExampleCaption}
          </p>
        </div>
      )}
    </div>
  );
}

function ManualStatForm({
  kingdomId,
  stat,
  t,
}: {
  kingdomId: string;
  stat: ManualKingdomStat | undefined;
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(setManualKingdomStatAction, initialState);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [values, setValues] = useState<Record<ManualFieldKey, AmountUnit>>(() => ({
    power: splitAmountUnit(stat?.power ?? 0),
    dead_total: splitAmountUnit(stat?.dead_total ?? 0),
    total_kill_points: splitAmountUnit(stat?.total_kill_points ?? 0),
    latest_kvk_kills: splitAmountUnit(stat?.latest_kvk_kills ?? 0),
  }));

  useEffect(() => {
    if (state.error) notifyResult({ success: false, message: state.error });
    else if (state.success) notifyResult({ success: true, message: t.admin.campaigns.manualSaved });
  }, [state, t]);

  function updateField(key: ManualFieldKey, patch: Partial<AmountUnit>) {
    setValues((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleImage(image: File | Blob) {
    setOcrLoading(true);
    try {
      const extracted = await extractStatsFromImage(image);

      if (extracted.detectedKingdomId && extracted.detectedKingdomId !== kingdomId) {
        notifyResult({
          success: false,
          message: formatTemplate(t.admin.campaigns.ocrKingdomMismatch, {
            imageKd: extracted.detectedKingdomId,
            rowKd: kingdomId,
          }),
        });
        return;
      }

      const keys = MANUAL_FIELD_KEYS.filter((key) => extracted[key] !== undefined);
      if (keys.length === 0) {
        notifyResult({ success: false, message: t.admin.campaigns.ocrNotFound });
        return;
      }
      setValues((prev) => {
        const next = { ...prev };
        for (const key of keys) {
          const value = extracted[key];
          if (value !== undefined) next[key] = splitAmountUnit(value);
        }
        return next;
      });
      notifyResult({
        success: true,
        message: formatTemplate(t.admin.campaigns.ocrFound, { count: String(keys.length) }),
      });
    } catch {
      notifyResult({ success: false, message: t.admin.campaigns.ocrError });
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <form
      action={formAction}
      className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <input type="hidden" name="kingdomId" value={kingdomId} />
      <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">{t.admin.campaigns.manualHint}</p>
      <ImagePasteZone loading={ocrLoading} onImage={handleImage} t={t} />
      <div className="grid grid-cols-2 gap-3">
        <AmountUnitField
          field="power"
          label={t.admin.campaigns.manualPower}
          value={values.power}
          onChange={(patch) => updateField("power", patch)}
          required
        />
        <AmountUnitField
          field="dead_total"
          label={t.admin.campaigns.manualDeadTotal}
          value={values.dead_total}
          onChange={(patch) => updateField("dead_total", patch)}
        />
        <AmountUnitField
          field="total_kill_points"
          label={t.admin.campaigns.manualTotalKillPoints}
          value={values.total_kill_points}
          onChange={(patch) => updateField("total_kill_points", patch)}
        />
        <AmountUnitField
          field="latest_kvk_kills"
          label={t.admin.campaigns.manualLatestKvkKills}
          value={values.latest_kvk_kills}
          onChange={(patch) => updateField("latest_kvk_kills", patch)}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "..." : t.admin.campaigns.manualSave}
      </button>
    </form>
  );
}

function KingdomDataRow({
  campaignId,
  teamId,
  kingdomId,
  manualStat,
  hasXlsx,
  xlsxWins,
  t,
}: {
  campaignId: string;
  teamId: string;
  kingdomId: string;
  manualStat: ManualKingdomStat | undefined;
  hasXlsx: boolean;
  xlsxWins: boolean;
  t: Dictionary;
}) {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-900 dark:text-white">
          {t.common.kingdom} {kingdomId}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => setManualOpen((v) => !v)}
            className={`${smallButtonClass} ${
              manualOpen
                ? "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                : "border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
            }`}
          >
            {manualOpen
              ? t.common.close
              : manualStat
                ? t.admin.campaigns.manualEntryEdit
                : t.admin.campaigns.manualEntry}
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirmAction({
                title: t.admin.campaigns.removeConfirmTitle,
                text: t.admin.campaigns.removeConfirmText,
                confirmLabel: t.common.confirmDelete,
                cancelLabel: t.common.cancel,
              });
              if (confirmed) await removeCampaignKingdomAction(campaignId, teamId, kingdomId);
            }}
            className={`${smallButtonClass} border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950`}
          >
            {t.common.delete}
          </button>
        </div>
      </div>

      {hasXlsx && manualStat && (
        <p
          className={`mt-1.5 text-xs ${xlsxWins ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"}`}
        >
          {xlsxWins ? t.admin.campaigns.hasXlsxWarning : t.admin.campaigns.manualIsNewerNotice}
        </p>
      )}

      {manualStat && !manualOpen && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t.admin.campaigns.manualSummary
            .replace("{power}", fmt(manualStat.power))
            .replace("{dead}", fmt(manualStat.dead_total))
            .replace("{kp}", fmt(manualStat.total_kill_points))
            .replace("{latest}", fmt(manualStat.latest_kvk_kills))}
        </p>
      )}

      {manualOpen && (
        <>
          <ManualStatForm kingdomId={kingdomId} stat={manualStat} t={t} />
          {manualStat && (
            <button
              onClick={async () => {
                const confirmed = await confirmAction({
                  title: t.admin.campaigns.manualDeleteConfirmTitle,
                  text: t.admin.campaigns.manualDeleteConfirmText,
                  confirmLabel: t.common.confirmDelete,
                  cancelLabel: t.common.cancel,
                });
                if (confirmed) {
                  await deleteManualKingdomStatAction(kingdomId);
                  setManualOpen(false);
                }
              }}
              className="mt-2 text-xs text-red-600 hover:underline dark:text-red-400"
            >
              {t.admin.campaigns.manualDelete}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function TeamColumn({
  campaignId,
  team,
  index,
  manualStats,
  hasXlsxData,
  xlsxWins,
  t,
}: {
  campaignId: string;
  team: CampaignTeam;
  index: number;
  manualStats: Record<string, ManualKingdomStat>;
  hasXlsxData: Record<string, boolean>;
  xlsxWins: Record<string, boolean>;
  t: Dictionary;
}) {
  const styles = styleForTeam(team.name, index);
  return (
    <div className={`rounded-xl border ${styles.border} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 ${styles.header}`}>
        <span className={`text-base font-semibold ${styles.text}`}>{team.name}</span>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
            {team.kingdomIds.length}
          </span>
          {team.kingdomIds.length > 0 && (
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(team.kingdomIds.join(","));
                notifyResult({ success: true, message: t.admin.campaigns.copyKingdomIdsDone });
              }}
              title={t.admin.campaigns.copyKingdomIdsHint}
              className="text-xs text-slate-500 hover:text-amber-600 hover:underline dark:text-slate-400 dark:hover:text-amber-400"
            >
              {t.admin.campaigns.copyKingdomIds}
            </button>
          )}
          <button
            onClick={async () => {
              const confirmed = await confirmAction({
                title: t.admin.campaigns.deleteTeamConfirmTitle,
                text: t.admin.campaigns.deleteTeamConfirmText,
                confirmLabel: t.common.confirmDelete,
                cancelLabel: t.common.cancel,
              });
              if (confirmed) await deleteCampaignTeamAction(campaignId, team.id);
            }}
            className="text-xs text-slate-500 hover:text-red-600 hover:underline dark:text-slate-400 dark:hover:text-red-400"
          >
            {t.admin.campaigns.deleteTeam}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {team.kingdomIds.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.admin.campaigns.noKingdoms}</p>
        )}
        {team.kingdomIds.map((kingdomId) => (
          <KingdomDataRow
            key={kingdomId}
            campaignId={campaignId}
            teamId={team.id}
            kingdomId={kingdomId}
            manualStat={manualStats[kingdomId]}
            hasXlsx={hasXlsxData[kingdomId] ?? false}
            xlsxWins={xlsxWins[kingdomId] ?? false}
            t={t}
          />
        ))}
        <AddKingdomForm campaignId={campaignId} teamId={team.id} t={t} />
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  defaultCollapsed,
  manualStats,
  hasXlsxData,
  xlsxWins,
  t,
  locale,
}: {
  campaign: Campaign;
  defaultCollapsed: boolean;
  manualStats: Record<string, ManualKingdomStat>;
  hasXlsxData: Record<string, boolean>;
  xlsxWins: Record<string, boolean>;
  t: Dictionary;
  locale: Locale;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editing, setEditing] = useState(false);

  return (
    <Card className="p-5">
      <div className={collapsed ? "flex items-center justify-between gap-2" : "mb-4 flex items-center justify-between gap-2"}>
        {editing ? (
          <EditCampaignForm
            campaign={campaign}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
            t={t}
          />
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="min-w-0 truncate text-left text-lg font-semibold text-slate-900 dark:text-white"
          >
            {campaign.name}
            {campaign.code && (
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">{campaign.code}</span>
            )}
          </button>
        )}
        {!editing && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className={`${smallButtonClass} border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
            >
              {t.common.edit}
            </button>
            <button
              onClick={async () => {
                const confirmed = await confirmAction({
                  title: t.admin.campaigns.deleteConfirmTitle,
                  text: t.admin.campaigns.deleteConfirmText,
                  confirmLabel: t.common.confirmDelete,
                  cancelLabel: t.common.cancel,
                });
                if (confirmed) await deleteCampaignAction(campaign.id);
              }}
              className={`${smallButtonClass} border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950`}
            >
              {t.admin.campaigns.deleteCampaign}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? t.admin.campaigns.expand : t.admin.campaigns.collapse}
              title={collapsed ? t.admin.campaigns.expand : t.admin.campaigns.collapse}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-amber-600 dark:hover:text-amber-400"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          {campaign.teams.length === 0 && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t.admin.campaigns.noTeams}</p>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {campaign.teams.map((team, index) => (
              <TeamColumn
                key={team.id}
                campaignId={campaign.id}
                team={team}
                index={index}
                manualStats={manualStats}
                hasXlsxData={hasXlsxData}
                xlsxWins={xlsxWins}
                t={t}
              />
            ))}
          </div>

          <AddTeamForm campaignId={campaign.id} locale={locale} t={t} />
        </>
      )}
    </Card>
  );
}

export default function KingdomsClient({
  campaigns,
  manualStats,
  hasXlsxData,
  xlsxWins,
  t,
  locale,
}: {
  campaigns: Campaign[];
  manualStats: Record<string, ManualKingdomStat>;
  hasXlsxData: Record<string, boolean>;
  xlsxWins: Record<string, boolean>;
  t: Dictionary;
  locale: Locale;
}) {
  // Newest first — only the newest campaign is expanded by default, older
  // ones collapse to keep the page manageable as campaigns pile up.
  const sortedCampaigns = [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="flex-1">
      <PageContainer maxWidth="max-w-7xl">
        <PageHeader title={t.admin.campaigns.title} subtitle={t.admin.campaigns.subtitle} />

        <CreateCampaignForm t={t} />
        <LilithFetchHelp t={t} />

        <div className="flex flex-col gap-6">
          {campaigns.length === 0 && (
            <Card className="p-8 text-center text-slate-500 dark:text-slate-400">{t.admin.campaigns.empty}</Card>
          )}
          {sortedCampaigns.map((campaign, index) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              defaultCollapsed={index !== 0}
              manualStats={manualStats}
              hasXlsxData={hasXlsxData}
              xlsxWins={xlsxWins}
              t={t}
              locale={locale}
            />
          ))}
        </div>
      </PageContainer>
    </main>
  );
}
