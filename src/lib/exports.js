import { downloadText } from "./raceUtils.js";
import { csvCell } from "./session.js";
export function exportEntries(participants, csv = false) {
  downloadText(
    csv ? "entries.csv" : "entries.txt",
    csv
      ? [csvCell("entry"), ...participants.map((p) => csvCell(p.name))].join("\n")
      : participants.map((p) => p.name).join("\n"),
    csv ? "text/csv;charset=utf-8" : undefined,
  );
}
export function exportResults(record, xls = false) {
  if (!record) return;
  const ranked = record.order
    .map((id) => record.participants.find((p) => p.id === id))
    .filter(Boolean);
  if (xls) {
    const escape = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    downloadText(
      "results.xls",
      `<html><head><meta charset="UTF-8"></head><body><table><tr><th>rank</th><th>name</th></tr>${ranked.map((p, i) => `<tr><td>${i + 1}</td><td style='mso-number-format:"\\@"'>${escape(p.name)}</td></tr>`).join("")}</table></body></html>`,
      "application/vnd.ms-excel",
    );
  } else
    downloadText(
      "results.csv",
      [["rank", "name"], ...ranked.map((p, i) => [i + 1, p.name])]
        .map((row) => row.map(csvCell).join(","))
        .join("\n"),
      "text/csv;charset=utf-8",
    );
}
export function exportHistory(history, legacyHistory, log = false) {
  downloadText(
    log ? "race-log.json" : "results-history.json",
    JSON.stringify({ version: 3, races: history, legacyHistory }, null, 2),
    "application/json",
  );
}
