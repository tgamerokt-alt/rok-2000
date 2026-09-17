function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvField(String(cell))).join(","))
    .join("\r\n");
}

/** Triggers a browser download of the given rows as a CSV file. A leading
 * UTF-8 BOM is included so Excel renders Thai text correctly instead of
 * mojibake. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const blob = new Blob([`﻿${toCsv(headers, rows)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
