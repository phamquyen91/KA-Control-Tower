import "server-only";

import type { DataScope } from "./tabs";
import type { WeightBand } from "./labels";

// Hai loại mục tiêu, KHÁC NHAU về ý nghĩa — đừng dùng lẫn:
//  - FC  : sản lượng dự báo SPE gửi GHN, đối chiếu với CREATED.
//  - AOP : mục tiêu sản lượng cả năm, đối chiếu với GTTC.
//
// FC lấy từ dòng "Total" — vài file gọi là "Hẹn lấy" hoặc "Orderdate" — của
// các file forecast
// trong /GHN/SPE/FC SPE Bulky và /FC SPE Express. Dòng này bằng Pickup +
// Dropoff — đã kiểm tra khớp trên TỪNG NGÀY của mọi file, không sai lệch chỗ nào.
//
// Bulky tách sẵn hai block weight, mỗi block một sheet. Riêng tháng 2/2026 hai
// block nằm ở hai file riêng nên nhận diện block theo tên file thay vì tên sheet.
//
// PHỦ DỮ LIỆU: cả hai scope đều có FC T1–T9/2026.
//
// Riêng T4 trong file nguồn chỉ bắt đầu từ 03/04, thiếu ngày 01 và 02 — bản
// forecast phát hành muộn 2 ngày. FC tháng 4 vì thế thấp hơn thực tế một chút;
// đây là đặc điểm của nguồn, không phải lỗi bóc dữ liệu.
//
// Tháng nào thiếu FC
// thì đường hoàn thành bỏ trống, tuyệt đối không vẽ 0%: vẽ 0% sẽ bị đọc thành
// hụt chỉ tiêu 100%.

/** Mục tiêu theo tháng. `band` là "total" khi mục tiêu không tách block weight. */
export interface TargetRow {
  month: string;
  scope: DataScope;
  band: WeightBand | "total";
  value: number;
}

type TargetTuple = [string, DataScope, WeightBand | "total", number];

const FC_RAW: TargetTuple[] = [
  ["2026-01", "SPB", "<15kg", 606155],
  ["2026-02", "SPB", "<15kg", 659187],
  ["2026-03", "SPB", "<15kg", 860487],
  ["2026-04", "SPB", "<15kg", 559876],
  ["2026-05", "SPB", "<15kg", 618860],
  ["2026-06", "SPB", "<15kg", 805405],
  ["2026-07", "SPB", "<15kg", 845792],
  ["2026-08", "SPB", "<15kg", 930140],
  ["2026-09", "SPB", "<15kg", 994673],
  ["2026-01", "SPB", ">=15kg", 1379942],
  ["2026-02", "SPB", ">=15kg", 784644],
  ["2026-03", "SPB", ">=15kg", 1042606],
  ["2026-04", "SPB", ">=15kg", 1120698],
  ["2026-05", "SPB", ">=15kg", 1137685],
  ["2026-06", "SPB", ">=15kg", 1297398],
  ["2026-07", "SPB", ">=15kg", 1341730],
  ["2026-08", "SPB", ">=15kg", 1510072],
  ["2026-09", "SPB", ">=15kg", 1531861],
  ["2026-01", "SPE", "total", 7000916],
  ["2026-02", "SPE", "total", 4414392],
  ["2026-03", "SPE", "total", 7310535],
  ["2026-04", "SPE", "total", 7283353],
  ["2026-05", "SPE", "total", 7103069],
  ["2026-06", "SPE", "total", 7540833],
  ["2026-07", "SPE", "total", 7177515],
  ["2026-08", "SPE", "total", 7353628],
  ["2026-09", "SPE", "total", 7620865],
];

const AOP_RAW: TargetTuple[] = [
  ["2026-01", "SPB", "<15kg", 776810],
  ["2026-02", "SPB", "<15kg", 388405],
  ["2026-03", "SPB", "<15kg", 660288],
  ["2026-04", "SPB", "<15kg", 865020],
  ["2026-05", "SPB", "<15kg", 960433],
  ["2026-06", "SPB", "<15kg", 1003502],
  ["2026-07", "SPB", "<15kg", 1060879],
  ["2026-08", "SPB", "<15kg", 1103298],
  ["2026-09", "SPB", "<15kg", 1091313],
  ["2026-10", "SPB", "<15kg", 1173386],
  ["2026-11", "SPB", "<15kg", 1249414],
  ["2026-12", "SPB", "<15kg", 1292252],
  ["2026-01", "SPB", ">=15kg", 933601],
  ["2026-02", "SPB", ">=15kg", 466801],
  ["2026-03", "SPB", ">=15kg", 886921],
  ["2026-04", "SPB", ">=15kg", 1076362],
  ["2026-05", "SPB", ">=15kg", 1241647],
  ["2026-06", "SPB", ">=15kg", 1410844],
  ["2026-07", "SPB", ">=15kg", 1626009],
  ["2026-08", "SPB", ">=15kg", 1839232],
  ["2026-09", "SPB", ">=15kg", 2012760],
  ["2026-10", "SPB", ">=15kg", 2212223],
  ["2026-11", "SPB", ">=15kg", 2414085],
  ["2026-12", "SPB", ">=15kg", 2665514],
  ["2026-01", "SPE", "total", 6500000],
  ["2026-02", "SPE", "total", 3000000],
  ["2026-03", "SPE", "total", 6000000],
  ["2026-04", "SPE", "total", 6500000],
  ["2026-05", "SPE", "total", 7000000],
  ["2026-06", "SPE", "total", 7000000],
  ["2026-07", "SPE", "total", 7500000],
  ["2026-08", "SPE", "total", 7500000],
  ["2026-09", "SPE", "total", 8000000],
  ["2026-10", "SPE", "total", 8000000],
  ["2026-11", "SPE", "total", 8500000],
  ["2026-12", "SPE", "total", 8500000],
];

const toRows = (raw: TargetTuple[]): TargetRow[] =>
  raw.map(([month, scope, band, value]) => ({ month, scope, band, value }));

/** FC created theo tháng (đối chiếu với Created volume). */
export const FC_CREATED: TargetRow[] = toRows(FC_RAW);

/** AOP theo tháng (đối chiếu với GTTC volume). */
export const AOP_GTTC: TargetRow[] = toRows(AOP_RAW);

function pick(rows: TargetRow[], scope: DataScope, month: string, band: WeightBand | "total") {
  return rows.find((r) => r.scope === scope && r.month === month && r.band === band)?.value;
}

/**
 * Mục tiêu của một scope trong một tháng. Với scope tách block weight thì
 * "total" được cộng từ các band; trả về undefined khi tháng đó không có mục
 * tiêu, để giao diện bỏ trống thay vì vẽ 0.
 */
function total(rows: TargetRow[], scope: DataScope, month: string): number | undefined {
  const direct = pick(rows, scope, month, "total");
  if (direct !== undefined) return direct;
  const bands = rows.filter((r) => r.scope === scope && r.month === month);
  return bands.length ? bands.reduce((acc, r) => acc + r.value, 0) : undefined;
}

export const fcFor = (scope: DataScope, month: string, band?: WeightBand) =>
  band ? pick(FC_CREATED, scope, month, band) : total(FC_CREATED, scope, month);

export const aopFor = (scope: DataScope, month: string, band?: WeightBand) =>
  band ? pick(AOP_GTTC, scope, month, band) : total(AOP_GTTC, scope, month);

// ---------------------------------------------------------------------------
// FC cho NGÀY campaign, lấy đúng cột ngày tương ứng trong chính các file trên.
// CP 6.6 = 06/06 và 07/06, CP 7.7 = 07/07 và 08/07, CP 8.8 = 08/08 và 09/08.
// Bulky cộng hai block weight lại thành tổng.
// ---------------------------------------------------------------------------

export interface CampaignFcRow {
  campaign: string;
  scope: DataScope;
  day: "D0" | "D+1";
  value: number;
}

type CampaignFcTuple = [string, DataScope, "D0" | "D+1", number];

const CAMPAIGN_FC_RAW: CampaignFcTuple[] = [
  ["CP 6.6", "SPB", "D+1", 90836],
  ["CP 6.6", "SPB", "D0", 188870],
  ["CP 6.6", "SPE", "D+1", 255086],
  ["CP 6.6", "SPE", "D0", 339634],
  ["CP 7.7", "SPB", "D+1", 159709],
  ["CP 7.7", "SPB", "D0", 154180],
  ["CP 7.7", "SPE", "D+1", 310142],
  ["CP 7.7", "SPE", "D0", 291587],
  ["CP 8.8", "SPB", "D+1", 102637],
  ["CP 8.8", "SPB", "D0", 208893],
  ["CP 8.8", "SPE", "D+1", 209007],
  ["CP 8.8", "SPE", "D0", 282410],
];

export const CAMPAIGN_FC: CampaignFcRow[] = CAMPAIGN_FC_RAW.map(
  ([campaign, scope, day, value]) => ({ campaign, scope, day, value }),
);

/** FC của một ngày campaign; undefined khi kỳ đó chưa có file forecast. */
export function campaignFcFor(
  scope: DataScope,
  campaign: string,
  day: "D0" | "D+1",
): number | undefined {
  return CAMPAIGN_FC.find(
    (r) => r.scope === scope && r.campaign === campaign && r.day === day,
  )?.value;
}
