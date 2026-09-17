"use client";

export interface ExtractedStats {
  power?: number;
  dead_total?: number;
  total_kill_points?: number;
  latest_kvk_kills?: number;
  /** The kingdom number read from the page's own "Search Kingdom" box, if
   * legible — lets callers warn when it doesn't match the KD being edited
   * (e.g. someone pasted a screenshot of the wrong kingdom). */
  detectedKingdomId?: string;
}

type FieldKey = "power" | "dead_total" | "total_kill_points" | "latest_kvk_kills";

/**
 * Tesseract's Thai model consistently renders the precomposed ำ (U+0E33) as
 * its decomposed form ํ (U+0E4D) + า (U+0E32) on this page's font — normalize
 * both sides so label matching isn't broken by that.
 */
function normalizeThai(s: string): string {
  return s.replace(/ำ/g, "ํา");
}

// Short, distinctive substrings of each stat card's label, in both Thai and
// English (the page is fully translated at ?locale=en/th) — kept short
// (rather than the full label) since OCR occasionally drops/inserts a
// character in the middle of longer phrases; validated against real
// screenshots of Lilith's statsExport/total overview page in both locales.
// English candidates have no spaces since word tokens are joined with none
// (see `fullText` below) and are matched case-insensitively.
const LABELS: { key: FieldKey; texts: string[] }[] = [
  { key: "power", texts: [normalizeThai("พลังรวม"), "totalpower"] },
  { key: "dead_total", texts: [normalizeThai("ตายรวม"), "totaldeaths"] },
  { key: "total_kill_points", texts: [normalizeThai("คะแนน"), "totalkillpoints"] },
  { key: "latest_kvk_kills", texts: [normalizeThai("จำนวน"), "latestkills"] },
];

const VALUE_RE = /^(\d+(?:\.\d+)?)([KMBTkmbt])$/;
/**
 * Tesseract consistently misreads a trailing "B" as the digit "8" in this
 * UI's font at this size. Lilith's totals always show exactly one decimal
 * digit + a unit letter, so a clean two-decimal-digit number ending in 8
 * with no unit letter is that misread, not a genuine value.
 */
const MISREAD_B_RE = /^(\d+\.\d)8$/;

function unitMultiplier(unit: string): number {
  switch (unit.toUpperCase()) {
    case "K":
      return 1e3;
    case "M":
      return 1e6;
    case "B":
      return 1e9;
    case "T":
      return 1e12;
    default:
      return 1;
  }
}

// Anchors for the page's "Search Kingdom" / "ค้นหาอาณาจักร" box, whose value
// (e.g. "Server2000" / "เซิร์ฟเวอร์2000") is the kingdom this screenshot is for.
const KD_ANCHORS = [normalizeThai("ค้นหาอาณาจักร"), "searchkingdom"];

function parseValueToken(text: string): number | undefined {
  const clean = text.match(VALUE_RE);
  if (clean) return Number(clean[1]) * unitMultiplier(clean[2]);
  const misread = text.match(MISREAD_B_RE);
  if (misread) return Number(misread[1]) * 1e9;
  return undefined;
}

interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Finds the first digit run shortly after a "Search Kingdom" anchor — the
 * label text itself ("Server"/"เซิร์ฟเวอร์") doesn't matter, just the number
 * after it, so this tolerates it being misread. Matches directly against the
 * concatenated text (not per-word) since Tesseract can split a single number
 * like "1904" across two word tokens ("Server1" + "904") — matching word by
 * word would then only see the "904" half. */
function detectKingdomId(fullText: string): string | undefined {
  for (const anchor of KD_ANCHORS) {
    const idx = fullText.indexOf(anchor.toLowerCase());
    if (idx === -1) continue;
    const window = fullText.slice(idx, idx + anchor.length + 40);
    const match = window.match(/(\d{3,6})/);
    if (match) return match[1];
  }
  return undefined;
}

/** In-place 3x3 sharpen convolution ([0,-1,0, -1,5,-1, 0,-1,0]) — this UI's
 * small text otherwise gets mis-segmented/misread (notably B <-> 8). */
function sharpen(imageData: ImageData) {
  const { width, height, data } = imageData;
  const src = Uint8ClampedArray.from(data);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * width + (x + kx)) * 4 + c] * kernel[k++];
          }
        }
        data[(y * width + x) * 4 + c] = sum;
      }
    }
  }
}

/** Upscales 2x and sharpens before handing off to Tesseract. */
async function preprocessImage(image: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  sharpen(imageData);
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), "image/png");
  });
}

/**
 * Best-effort extraction from a screenshot of Lilith's overview page
 * (statsExport/total) — runs fully client-side via tesseract.js, no server
 * call or API key. Each stat card on that page renders a label, then (on
 * the SAME line) a small +/- change badge, then (on the line below) the
 * big total value — so "the nearest value token below-and-right of a
 * label" is the total we want, regardless of whether the change was +/-.
 *
 * This is a layout heuristic tuned to this one specific game UI (validated
 * against real screenshots), not general-purpose OCR understanding —
 * callers should let the admin review the extracted numbers before saving,
 * not auto-submit them.
 */
export async function extractStatsFromImage(image: File | Blob): Promise<ExtractedStats> {
  const processed = await preprocessImage(image);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["tha", "eng"]);
  try {
    const { data } = await worker.recognize(processed, {}, { blocks: true });
    const words: OcrWord[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const word of line.words) {
            words.push({ text: word.text, ...word.bbox });
          }
        }
      }
    }

    const values = words
      .map((w) => ({ ...w, value: parseValueToken(w.text) }))
      .filter((w): w is OcrWord & { value: number } => w.value !== undefined);

    // Lowercased for case-insensitive English matching; length-preserving (Thai
    // has no case) so the offset-to-word mapping below stays valid either way.
    const fullText = normalizeThai(words.map((w) => w.text).join("")).toLowerCase();
    const offsets: number[] = [];
    let acc = 0;
    for (const w of words) {
      offsets.push(acc);
      acc += w.text.length;
    }

    const pageWidth = Math.max(1, ...words.map((w) => w.x1));
    const anchors: Partial<Record<FieldKey, Pick<OcrWord, "x0" | "y1">>> = {};
    for (const { key, texts } of LABELS) {
      const idx = texts.map((label) => fullText.indexOf(label.toLowerCase())).find((i) => i !== -1);
      if (idx === undefined) continue;
      const wordIndex = offsets.findIndex((o, i) => o <= idx && (offsets[i + 1] ?? Infinity) > idx);
      const labelWord = words[wordIndex];
      if (labelWord) anchors[key] = labelWord;
    }

    // "total_kill_points" is the flakiest label to OCR correctly (it contains a
    // tone mark Tesseract sometimes swaps for a different diacritic). Its card
    // sits in the same row as power/dead_total on an evenly-spaced grid, so if
    // those two (reliable) anchors were found but this one wasn't, infer its
    // position from the grid spacing instead of requiring its own text to match.
    if (!anchors.total_kill_points && anchors.power && anchors.dead_total) {
      const spacing = anchors.dead_total.x0 - anchors.power.x0;
      if (spacing > 0) {
        anchors.total_kill_points = {
          x0: anchors.dead_total.x0 + spacing,
          y1: anchors.dead_total.y1,
        };
      }
    }

    const result: ExtractedStats = {};
    for (const key of Object.keys(anchors) as FieldKey[]) {
      const labelWord = anchors[key];
      if (!labelWord) continue;

      // Below the label there are up to two matching rows: the small +/-
      // change badge (closer to the label) and the big total (farther down).
      // The badge usually fails to parse as a value (its arrow icon merges
      // into the OCR text), but when it doesn't — typically for increases,
      // which have no leading "-" — picking the CLOSEST match grabs the
      // badge instead of the total. The total is always the farther of the
      // two, so prefer the largest y0 within a tight window (tight enough
      // to not reach into the next card/row below).
      let best: { value: number; y0: number } | null = null;
      for (const v of values) {
        if (v.y0 <= labelWord.y1) continue; // must be below the label's own line
        if (v.y0 - labelWord.y1 > pageWidth * 0.06) continue; // not too far below (skip other cards/rows)
        if (v.x0 < labelWord.x0 - pageWidth * 0.03) continue; // roughly same card column...
        if (v.x0 > labelWord.x0 + pageWidth * 0.22) continue; // ...allowing for the value's right-shift within the card
        if (!best || v.y0 > best.y0) best = { value: v.value, y0: v.y0 };
      }
      if (best) result[key] = best.value;
    }

    const detectedKingdomId = detectKingdomId(fullText);
    if (detectedKingdomId) result.detectedKingdomId = detectedKingdomId;

    return result;
  } finally {
    await worker.terminate();
  }
}
