@AGENTS.md

# RoK Kingdom Stats — Project Notes

A self-hosted KvK stats dashboard for Rise of Kingdoms, modeled after
statsmasterdatahub.com (Statsmaster). Next.js 16 (App Router, TypeScript,
Tailwind v4). No external database — everything is stored as local files
under `data/` (gitignored).

## Why this project exists / key decisions

- The original ask was to auto-login to Lilith's official RoK web tool
  (`rok-game-tools-global.lilith.com`) and scrape kingdom stats automatically.
  **We deliberately do not do this.** That tool's login goes through Lilith's
  central SSO (`passport-global.lilith.com`) which has CAPTCHA — automating it
  would mean building a CAPTCHA/bot-detection bypass, which is out of scope.
- Instead, an admin manually exports `statsExport.xlsx` from that Lilith tool
  in their own browser and **uploads it** to this app. Each KvK menu needs
  **two** point-in-time snapshots — one from the start date (each governor's
  *starting* power) and one from during/end of the KvK (used to compute DKP
  gains and how much power changed) — and this app diffs them itself (see
  `diffSnapshots` in `dkp.ts`). We went back and forth on this (single
  "range" file vs. two snapshots) before landing here — two snapshots is
  correct because Lilith's export is a point-in-time dump, not a range
  delta, and we need the *starting* power specifically, not just current.
- The real export's columns (Thai headers) do **not** include Healed or
  Acclaim — those columns were dropped from the UI. If a data source for them
  ever turns up, add fields to `MemberStat` (`src/lib/types.ts`) and the
  header map in `src/lib/xlsx.ts`.
- `npm`'s registry build of the `xlsx` package has known CVEs (ReDoS +
  prototype pollution) with no fix on npm. We install the patched build
  directly from SheetJS's own CDN instead:
  `npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`.
  Do **not** `npm install xlsx` from the registry — re-run the CDN install if
  it ever needs updating.
- For the manual-entry stats (kingdoms the admin doesn't administer, used on
  `/admin/kingdoms`), there's a semi-automated alternative to typing/OCR:
  `LILITH_FETCH_SCRIPT` in `KingdomsClient.tsx` (surfaced in the UI behind
  "❓ How to fetch this from Lilith automatically" under the Bulk import
  section) is a **browser-console snippet the admin runs themselves**, in
  their own already-logged-in tab on `rok-game-tools-global.lilith.com`. It
  reads that session's `pauth` token fresh from
  `localStorage["rok-auth-storage"].state.pauth` (falls back to the `pauth`
  cookie) each run — never hardcoded, never sent to our server — and calls
  Lilith's own `GET https://plat-rok-gametools-global-api.lilithgames.com/api/kindomInformation?server_id=<id>`
  (same cross-origin call the page itself makes) for each kingdom ID, mapping
  its JSON response to `ManualKingdomStat` as `power→power`, `dead→dead_total`,
  `kill→total_kill_points`, `kvkKillScore→latest_kvk_kills`. It copies the
  resulting JSON array to the clipboard (falling back to a `console.log`'d
  string with a "right-click → Copy string contents" hint if the clipboard
  API is blocked, e.g. when run from DevTools instead of a real click) for
  the admin to paste into the "Bulk import (paste JSON)" box, which calls
  `bulkImportManualKingdomStatsAction` (`actions.ts`). This is **not** the
  CAPTCHA-bypass auto-login the previous bullet rules out — it never touches
  Lilith's login, runs entirely client-side in the admin's own session, and
  this app's server never sees or stores any Lilith credential/token.

## Directory map

```
src/lib/
  types.ts          MemberStat, DkpFormula, KvkMenu, Kingdom, KingdomGroup, DbSchema
  xlsx.ts           parses statsExport.xlsx -> MemberStat[] (Thai header map lives here)
  dkp.ts            diffSnapshots (before/after -> per-KvK gains + power_start) + scoreMember(s) (derives kp_t4t5 / dead_total / dead_t4t5 / power_change / dkp)
  storage.ts        path helpers for data/ (kingdom dirs, xlsx file paths)
  db.ts             tiny JSON-file "database" (data/db.json) with a write queue
  data.ts           read-only server helpers used by pages (listKvkMenus, getScoredMembers, ...)
  actions.ts        ALL server actions (login, create/update/delete KvK menu, formula, groups)
  session.ts        JWT (jose) session token create/verify, cookie name rok_session
  auth.ts           getSession() — reads + verifies the session cookie
  require-admin.ts  requireAdmin() throws if not logged in — call at the top of any mutating action
  i18n/
    dictionaries.ts EN + TH strings, defaultLocale = "en"
    locale.ts       getLocale()/getDictionary() — reads the `locale` cookie

src/components/
  Sidebar.tsx       server component: builds nav items from session + dictionary, renders SidebarNav
  SidebarNav.tsx     client: the actual sidebar UI (icons, active-link highlight, mobile drawer, EN/ไทย toggle, logout)
  ui/                PageHeader / PageContainer / Card — shared layout primitives; SnapshotSlot + SnapshotArrow (co-located, see below) pair a date with the file it belongs to

src/middleware.ts   protects /admin/** — redirects to /login if no valid session cookie

src/app/
  page.tsx                          public home (kingdom 2000 card)
  kingdom/[kingdomId]/page.tsx       public: list of KvK menus for a kingdom
  kingdom/[kingdomId]/kvk/[kvkId]/   public: simple stats table
  dashboard/[kvkId]/                 public: full sortable/searchable dashboard (Statsmaster-style)
  compare/page.tsx                   public: cross-kingdom power/KP/DKP comparison
  login/                             hidden (no nav link) — admin-only sign-in
  admin/                             protected by middleware
    page.tsx + AdminMenusClient.tsx  create/update/delete KvK menus (kingdom 2000)
    formula/                         DKP weight editor
    kingdoms/                        multi-kingdom groups + per-kingdom snapshot upload

data/                (gitignored, created at runtime)
  db.json            kingdoms, kvkMenus, formulas, groups
  kingdoms/<id>/<id>_<startDate>_before_statsExport.xlsx
  kingdoms/<id>/<id>_<endDate>_after_statsExport.xlsx
```

## Data model quick reference

Raw columns from Lilith's export (`src/lib/xlsx.ts` `HEADER_MAP`):
`governor_id, name, power, max_power, kill_t1..t5, dead_t1..t5,
total_kill_points, resources_gathered, alliance_help`.

Every render, `getScoredMembers` (`data.ts`) reads both files for a menu and
runs `diffSnapshots(before, after)` (`dkp.ts`): cumulative counters (kills,
deaths, `total_kill_points`, `resources_gathered`, `alliance_help`) become
`after - before` (clamped to ≥ 0), while `power`/`max_power` stay as the
*after* snapshot's value, with `power_start` (the *before* snapshot's power)
carried alongside. A governor_id found in only one of the two files (joined
mid-KvK, or left before the *after* export) has no baseline/end point to
diff against — their row is still included (using whichever snapshot has
their name), but every stat field is zeroed and `incomplete: true` is set on
`DiffedStat`, which the UI tables (`DashboardClient.tsx`,
`KvkSummaryClient.tsx`) render as `-` instead of a misleading `0`.
`scoreMembers` then
derives, never stored: `kp_t4t5 = kill_t4 + kill_t5`,
`kp_weighted_all = sum(kill_tX * KILL_POINT_WEIGHTS[tX])` for T1..T5 (fixed
weights `1/2/4/10/20`, matching RoK's own per-tier kill point ratio and this
project's default DKP kill weights — independent of whatever the admin has
configured in the DKP formula), `dead_total = sum(dead_t1..t5)`,
`dead_t4t5 = dead_t4 + dead_t5`,
`power_change = power - power_start` (negative = power was lost during the
KvK — shown in red in the UI, green if it grew). `total_kill_points`
("KP (Total)") is the raw `คะแนนฆ่ารวม` field — the game's own tier-weighted
kill score (diffed like the other counters), not a plain sum of
`kill_t1..t5`, so don't confuse it with `kp_t4t5`.

DKP formula (`DkpFormula` in `types.ts`) is per-kingdom, stored in
`db.json` under `formulas[kingdomId]`, editable at `/admin/formula`:
- both kills and dead troops are weighted **per tier** (`kill_t1..t5`,
  `dead_t1..t5`), each its own `{ weight, enabled }` — no lump-sum/override
  special case; T4 and T5 (kill or dead) can simply carry different weights.
- Defaults: T4/T5 kills ×10/×20, T4/T5 dead ×10/×20, everything else off.
- `dead_total` / `dead_t4t5` on `ScoredMember` (`dkp.ts`) are still computed
  as fixed display aggregates (sum of all tiers / T4+T5 only) for the public
  tables — they're independent of the formula weights above.

## KvK menu semantics

- "Menu" = one `KvkMenu` record (`kingdomId, name, startDate, endDate,
  beforeFileName, afterFileName`) + **two** xlsx files on disk.
- Creating a menu ("add menu") requires both files up front and always
  makes a new record + two new files. "Update files" on an existing row
  replaces whichever of the two files were attached (either or both) and/or
  the menu's `name` (all three are optional/independent — the action accepts
  partial updates, at least one of the three must be present), keeping the
  same id/dates. See `createKvkMenuAction` / `updateKvkMenuFileAction` in
  `actions.ts`.
- `getLatestMenuForKingdom` (used by `/compare`) just takes the menu with
  the newest `startDate` — there's no explicit "current KvK" flag.
- A governor who isn't present in one of the two files (joined mid-KvK, or
  left before the *after* export) still shows up in that menu's scored
  members, but with `incomplete: true` and every stat blanked to `-` in the
  UI — see `diffSnapshots`.
- Each date is paired with its own file in one visual box (`SnapshotSlot` +
  `SnapshotArrow` in `src/components/ui/SnapshotSlot.tsx`), used twice side
  by side (before → after) in both `AdminMenusClient.tsx` and
  `KingdomsClient.tsx`.
- Deletes/edits must never leave orphaned xlsx bytes on disk. `updateKvkMenuFileAction`
  deletes the old file before writing the replacement (`replaceFile` in
  `actions.ts`), and `deleteKvkMenuAction` deletes both files. This cascades:
  removing a kingdom from a campaign team, deleting a team, or deleting a
  campaign (`removeCampaignKingdomAction` / `deleteCampaignTeamAction` /
  `deleteCampaignAction`) also permanently deletes every `KvkMenu` (and its
  before/after xlsx files) for each affected kingdom — by explicit admin
  request, even though the same kingdom could in principle belong to another
  campaign. The confirm dialogs for these three actions say so; don't revert
  to a "stays in place" message without also reverting the deletion logic.

## Auth

Single hardcoded admin account from `.env` (`ADMIN_EMAIL`,
`ADMIN_PASSWORD`) — not a user table. Session is a JWT signed with
`SESSION_SECRET`, stored in an httpOnly cookie (`rok_session`, 12h TTL).
`src/middleware.ts` gates `/admin/**`. There is intentionally no link to
`/login` anywhere in the UI — the admin must type the URL.

## i18n

Adding a new string: add it to **both** `en` and `th` in
`src/lib/i18n/dictionaries.ts`, then read it via `const { t } = await
getDictionary()` in a server component (or receive `t: Dictionary` as a
prop in a client component — client components can't call `getDictionary`
directly since it reads cookies). Locale is a plain cookie
(`locale=en|th`, no path prefix), switched via `setLocaleAction` in
`actions.ts`, called from the EN/ไทย toggle built into `SidebarNav.tsx`
(top of the sidebar, above the nav links — there is no separate
LocaleSwitcher component).

## Destructive actions need a SweetAlert2 confirm

Any button that deletes something (KvK menu, group, etc.) must show a
`confirmAction()` (`src/lib/confirm.ts`, wraps `sweetalert2`) before calling
the delete server action — never wire a delete button straight to a
`<form action={deleteXAction.bind(...)}>` with no confirmation. Pattern:
call the server action as a plain async function (`await deleteXAction(id)`)
from the `onClick` handler after `confirmAction()` resolves `true`, the same
way `resetFormulaAction` is already invoked directly from a button.

## Common tasks

- **Add a new export column**: update `MemberStat` (`types.ts`),
  `HEADER_MAP` + `NUMERIC_FIELDS` (`xlsx.ts`), and if it affects DKP, wire
  it into `DkpFormula` + `scoreMember` (`dkp.ts`) and the formula editor
  (`admin/formula/FormulaForm.tsx`).
- **Add a new admin action**: put it in `actions.ts`, start with
  `await requireAdmin()`, call `revalidatePath(...)` on anything it
  changed, return `{ error }` or `{ success: true }` (the `ActionState`
  shape all forms expect).
- **Run locally**: `npm run dev` (or `npm run build && npm start`). Data
  lives in `./data` next to the project — delete it to reset to a clean
  state.
- **Deploying (production server, avoiding port collisions)**: `next
  start` reads the `PORT` env var (default 3000) — it can't be set via
  `.env` since the HTTP server boots before `.env` loads (Next's own
  docs, `node_modules/next/dist/docs/.../next.md`). `ecosystem.config.js`
  at the repo root runs it under PM2 pinned to `PORT: 3001` — check
  that port is actually free on the target server first (`netstat -ano |
  findstr :3001` on Windows, `lsof -i :3001` on Linux) and edit the value
  if it's taken, especially if this server already hosts other apps.
- **Test file**: a real sample export used during development is at
  `C:\Users\windows\Downloads\4180_20260912_20260912_statsExport.xlsx` (also
  `2000_20260501_20260501_statsExport (1).xlsx`).

