"use client";

import { useState } from "react";
import { fmtCompact } from "@/lib/format";
import { notifyResult } from "@/lib/confirm";

export interface ShareImageData {
  siteTitle: string;
  heading: string;
  subheading: string;
  stats: { label: string; value: string }[];
  topTitle: string;
  top: { name: string; value: number }[];
  footer: string;
}

const W = 1080;
const H = 1350;
// Fixed dark look for the shared image, independent of the viewer's site theme.
const C = {
  bg1: "#0b1220",
  bg2: "#111c33",
  card: "#16223d",
  border: "#24324f",
  text: "#f1f5f9",
  muted: "#94a3b8",
  accent: "#f59e0b",
  bar: "#3987e5",
};
// Thai-capable system fonts first (Windows / macOS / Android), then generic.
const FONT = `"Leelawadee UI", "Segoe UI", Tahoma, "Noto Sans Thai", "Thonburi", sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Sets the largest font size (down to `min`) at which `text` fits `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, min: number, maxWidth: number) {
  for (let s = size; s >= min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) return;
  }
}

/** Shrinks a string with "…" until it fits `maxWidth` at the current font. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = [...text];
  while (chars.length > 1 && ctx.measureText(`${chars.join("")}…`).width > maxWidth) chars.pop();
  return `${chars.join("")}…`;
}

function draw(data: ShareImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const pad = 64;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.accent;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(fit(ctx, data.siteTitle, W - pad * 2), pad, 100);
  ctx.fillStyle = C.text;
  // Shrink a long KvK name before resorting to "…" — the heading is the point of the image.
  fitFont(ctx, data.heading, 800, 56, 36, W - pad * 2);
  ctx.fillText(fit(ctx, data.heading, W - pad * 2), pad, 175);
  ctx.fillStyle = C.muted;
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText(fit(ctx, data.subheading, W - pad * 2), pad, 222);

  // Stat tiles, 2 × 2
  const gap = 24;
  const tileW = (W - pad * 2 - gap) / 2;
  const tileH = 140;
  data.stats.slice(0, 4).forEach((s, i) => {
    const x = pad + (i % 2) * (tileW + gap);
    const y = 270 + Math.floor(i / 2) * (tileH + gap);
    roundRect(ctx, x, y, tileW, tileH, 18);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.muted;
    ctx.font = `400 26px ${FONT}`;
    ctx.fillText(fit(ctx, s.label, tileW - 48), x + 24, y + 48);
    ctx.fillStyle = C.text;
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText(fit(ctx, s.value, tileW - 48), x + 24, y + 112);
  });

  // Top list with bars
  const listY = 270 + 2 * (tileH + gap) + 24;
  ctx.fillStyle = C.text;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(data.topTitle, pad, listY);
  const rowH = 58;
  const nameW = 330;
  const valueW = 150;
  const barX = pad + 56 + nameW;
  const barMax = W - pad - valueW - barX;
  const max = Math.max(1, ...data.top.map((r) => r.value));
  data.top.slice(0, 10).forEach((r, i) => {
    const y = listY + 30 + i * rowH;
    ctx.fillStyle = i < 3 ? C.accent : C.muted;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(`${i + 1}`, pad, y + 36);
    ctx.fillStyle = C.text;
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(fit(ctx, r.name, nameW - 16), pad + 56, y + 36);
    const len = Math.max(4, (r.value / max) * barMax);
    roundRect(ctx, barX, y + 14, len, 28, 6);
    ctx.fillStyle = C.bar;
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(fmtCompact(r.value), barX + len + 12, y + 37);
  });

  ctx.fillStyle = C.muted;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(fit(ctx, data.footer, W - pad * 2), pad, H - 48);
  return canvas;
}

export function ShareImageButtons({
  data,
  fileName,
  labels,
}: {
  data: ShareImageData;
  fileName: string;
  labels: { download: string; copy: string; copied: string; copyFailed: string };
}) {
  const [busy, setBusy] = useState(false);

  function toBlob(): Promise<Blob> {
    return new Promise((resolve, reject) =>
      draw(data).toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  }

  async function download() {
    setBusy(true);
    try {
      const url = URL.createObjectURL(await toBlob());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setBusy(true);
    try {
      // ClipboardItem accepts a Promise<Blob>, which keeps Safari's user-gesture requirement satisfied.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toBlob() })]);
      notifyResult({ success: true, message: labels.copied });
    } catch {
      notifyResult({ success: false, message: labels.copyFailed });
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={download} disabled={busy} className={btn}>
        {labels.download}
      </button>
      <button type="button" onClick={copy} disabled={busy} className={btn}>
        {labels.copy}
      </button>
    </div>
  );
}
