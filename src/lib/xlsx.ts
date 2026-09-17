import * as XLSX from "xlsx";
import { MemberStat } from "./types";

/**
 * Column headers as produced by Lilith's official RoK Game Tools export
 * (https://rok-game-tools-global.lilith.com). Mapping was reverse-engineered
 * from a real statsExport.xlsx sample.
 */
const HEADER_MAP: Record<string, keyof MemberStat> = {
  "ID ตัวละคร": "governor_id",
  "ชื่อผู้ใช้": "name",
  "พลัง": "power",
  "พลังสูงสุด": "max_power",
  "ตาย T5": "dead_t5",
  "ตาย T4": "dead_t4",
  "ตาย T3": "dead_t3",
  "ตาย T2": "dead_t2",
  "ตาย T1": "dead_t1",
  "คะแนนฆ่ารวม": "total_kill_points",
  "ฆ่า T5": "kill_t5",
  "ฆ่า T4": "kill_t4",
  "ฆ่า T3": "kill_t3",
  "ฆ่า T2": "kill_t2",
  "ฆ่า T1": "kill_t1",
  "ทรัพยากรที่เก็บ": "resources_gathered",
  "สมาพันธ์ช่วยเหลือ": "alliance_help",
};

const NUMERIC_FIELDS = new Set<keyof MemberStat>([
  "power",
  "max_power",
  "kill_t1",
  "kill_t2",
  "kill_t3",
  "kill_t4",
  "kill_t5",
  "dead_t1",
  "dead_t2",
  "dead_t3",
  "dead_t4",
  "dead_t5",
  "total_kill_points",
  "resources_gathered",
  "alliance_help",
]);

export type XlsxParseErrorCode = "NO_SHEET" | "EMPTY_FILE" | "MISSING_COLUMNS";

export class XlsxParseError extends Error {
  code: XlsxParseErrorCode;
  missingColumns?: string[];

  constructor(code: XlsxParseErrorCode, missingColumns?: string[]) {
    super(code);
    this.code = code;
    this.missingColumns = missingColumns;
  }
}

export function parseStatsExport(buffer: Buffer): MemberStat[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new XlsxParseError("NO_SHEET");
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) throw new XlsxParseError("EMPTY_FILE");

  const firstRow = rows[0];
  const unknownHeaders = Object.keys(firstRow).filter((h) => !(h in HEADER_MAP));
  const missingHeaders = Object.keys(HEADER_MAP).filter(
    (h) => !(h in firstRow)
  );
  if (missingHeaders.length > 0) {
    throw new XlsxParseError("MISSING_COLUMNS", missingHeaders);
  }
  void unknownHeaders; // extra columns are ignored, not an error

  return rows.map((row) => {
    const stat = {} as MemberStat;
    for (const [header, field] of Object.entries(HEADER_MAP)) {
      const rawValue = row[header];
      if (NUMERIC_FIELDS.has(field)) {
        const num = Number(String(rawValue).replace(/,/g, "").trim());
        (stat[field] as number) = Number.isFinite(num) ? num : 0;
      } else {
        (stat[field] as string) = String(rawValue ?? "").trim();
      }
    }
    return stat;
  });
}
