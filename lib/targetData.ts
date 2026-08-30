import "server-only";

import type { DataScope } from "./tabs";
import type { WeightBand } from "./labels";

// Hai loại mục tiêu, KHÁC NHAU về ý nghĩa — đừng dùng lẫn:
//  - FC  : sản lượng dự báo SPE gửi GHN hằng tháng, đối chiếu với CREATED.
//          Lấy từ dòng "Total" (= Pickup + Dropoff) trong các file
//          GHN_*_Forecast *.xlsx ở /GHN/SPE/FC SPE Bulky và /FC SPE Express.
//  - AOP : mục tiêu sản lượng cả năm, đối chiếu với GTTC. Chép từ bảng
//          target AOP 2026 (dòng SHOPEE = Shopee Standard, SHOPEE Bulky đã
//          tách sẵn 2 block weight).
//
// LƯU Ý PHỦ DỮ LIỆU: FC của Bulky chỉ có từ T4/2026 — thư mục nguồn không có
// file FC tháng 1-3. Giao diện phải bỏ trống điểm line thay vì vẽ 0%.

/** Mục tiêu theo tháng. `band` là "total" khi mục tiêu không tách block weight. */
export interface TargetRow {
  month: string;
  scope: DataScope;
  band: WeightBand | "total";
  value: number;
}

type TargetTuple = [string, DataScope, WeightBand | "total", number];

const FC_RAW: TargetTuple[] = [
  ["2026-04", "SPB", "<15kg", 559876],
  ["2026-05", "SPB", "<15kg", 618860],
  ["2026-06", "SPB", "<15kg", 805405],
  ["2026-07", "SPB", "<15kg", 845792],
  ["2026-08", "SPB", "<15kg", 930140],
  ["2026-04", "SPB", ">=15kg", 1120698],
  ["2026-05", "SPB", ">=15kg", 1137685],
  ["2026-06", "SPB", ">=15kg", 1297398],
  ["2026-07", "SPB", ">=15kg", 1341730],
  ["2026-08", "SPB", ">=15kg", 1510072],
  ["2026-01", "SPE", "total", 7000916],
  ["2026-02", "SPE", "total", 4414392],
  ["2026-03", "SPE", "total", 7310535],
  ["2026-04", "SPE", "total", 6894062],
  ["2026-05", "SPE", "total", 7103069],
  ["2026-06", "SPE", "total", 7540833],
  ["2026-07", "SPE", "total", 7177515],
  ["2026-08", "SPE", "total", 7353628],
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
