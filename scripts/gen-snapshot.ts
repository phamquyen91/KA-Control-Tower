/**
 * Sinh bản chụp dữ liệu (lib/snapshot/*) từ một file JSON dump của workbook.
 *
 * Cách dùng:
 *   npx tsx --conditions=react-server scripts/gen-snapshot.ts <workbook.json> <YYYY-MM-DD>
 *
 * workbook.json có dạng { vol: Cell[][], dd: Cell[][], opr: Cell[][] } — ma trận
 * ô đúng như sheet, dòng đầu là tiêu đề. Ngày là ngày lấy dữ liệu.
 *
 * Bản chụp đi qua ĐÚNG parser mà đường live dùng (lib/sheetParse.ts), nên hai
 * nguồn không thể hiểu cột khác nhau. Tab DD được gom trước khi ghi vì bản thô
 * ~20.000 dòng quá nặng cho repo; vol và OPR nhỏ nên giữ nguyên dạng thô.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { aggregateDd, type SheetRows } from "../lib/sheetParse";

const [, , input, date] = process.argv;
if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  console.error("Cách dùng: gen-snapshot.ts <workbook.json> <YYYY-MM-DD>");
  process.exit(1);
}

const wb = JSON.parse(readFileSync(input, "utf8")) as {
  vol: SheetRows;
  dd: SheetRows;
  opr: SheetRows;
};

const trim = (rows: SheetRows) =>
  rows.filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));

const banner = (tab: string, n: number) => `// SỐ LIỆU NỘI BỘ — server-only. Sinh tự động bởi scripts/gen-snapshot.ts,
// KHÔNG SỬA TAY. Nguồn: Google Sheet "tower control raw", tab \`${tab}\`
// (${n} dòng), lấy ngày ${date}.
//
// Đây là bản dự phòng khi không đọc được sheet trực tiếp (thiếu GOOGLE_SA_KEY
// hoặc API lỗi). Cách cập nhật: xem README mục "Cập nhật bản chụp".
`;

const rowsLiteral = (rows: SheetRows) =>
  rows.map((r) => `  ${JSON.stringify(r)},`).join("\n");

const vol = trim(wb.vol);
writeFileSync(
  "lib/snapshot/biz.ts",
  `import "server-only";

import type { SheetRows } from "../sheetParse";

${banner("vol", vol.length - 1)}
/** Ngày lấy bản chụp — dùng chung cho mọi tab vì cùng một lần xuất. */
export const SNAPSHOT_AT = "${date}";

export const VOL_SNAPSHOT: SheetRows = [
${rowsLiteral(vol)}
];
`,
);

const dd = trim(wb.dd);
const agg = aggregateDd(dd);
const opr = trim(wb.opr);
writeFileSync(
  "lib/snapshot/campaign.ts",
  `import "server-only";

import type { CampaignAgg, SheetRows } from "../sheetParse";

${banner("DD", dd.length - 1)}
// Đã gom bằng aggregateDd(): ${agg.totals.length} tổng, ${agg.teams.length} theo đội,
// ${agg.provinces.length} theo tỉnh × đội. baselinePerDay=${agg.baselinePerDay}.
export const CAMPAIGN_SNAPSHOT: CampaignAgg = ${JSON.stringify(agg, null, 0)
    .replace(/\{"campaign"/g, '\n  {"campaign"')
    .replace(/\]\}$/, "]\n}")};

${banner("DD OPR", opr.length - 1)}
export const OPR_SNAPSHOT: SheetRows = [
${rowsLiteral(opr)}
];
`,
);

console.log(
  `vol ${vol.length - 1} dòng · DD ${dd.length - 1} dòng → ${agg.totals.length}/${agg.teams.length}/${agg.provinces.length} · OPR ${opr.length - 1} dòng · ngày ${date}`,
);
