import type { DataScope } from "./tabs";

// Nguồn: Google Sheet "tower control raw", tab `raw_1`.
// https://docs.google.com/spreadsheets/d/1WI5CrcFrTgDR4FNS8Un9RR-oHEvkdJWCj8OUTc2BFtk/edit?gid=1213160480
//
// Dữ liệu để ở dạng snapshot tĩnh, KHÔNG fetch trực tiếp lúc chạy: sheet này
// không công khai (truy cập ẩn danh trả 401), nên fetch từ trình duyệt sẽ dính
// đúng vấn đề mà app kas-shopee-performance đang gặp — Google trả 403 cho tài
// khoản không có quyền và người dùng thấy trang lỗi của Google.
// Cách cập nhật: xuất lại tab `raw_1` ra CSV rồi sinh lại file này.
export const BIZ_SOURCE_SHEET_ID = "1WI5CrcFrTgDR4FNS8Un9RR-oHEvkdJWCj8OUTc2BFtk";
export const BIZ_SOURCE_GID = "1213160480";
export const BIZ_SOURCE_URL = `https://docs.google.com/spreadsheets/d/${BIZ_SOURCE_SHEET_ID}/edit?gid=${BIZ_SOURCE_GID}`;

// modifiedTime của sheet lúc lấy snapshot.
export const BIZ_SNAPSHOT_AT = "2026-08-19";

export type Lane =
  | "Intra City"
  | "Intra Region"
  | "Cross Region"
  | "Cross Metro";

export type WeightBand = "<15kg" | ">=15kg";

export interface BizRow {
  month: string;
  scope: DataScope;
  lane: Lane;
  weight: WeightBand;
  created: number;
  gtc: number;
}

// Thứ tự lane từ gần tới xa — dùng cho mọi bảng để đọc nhất quán.
export const LANE_ORDER: Lane[] = [
  "Intra City",
  "Intra Region",
  "Cross Region",
  "Cross Metro",
];

export const WEIGHT_ORDER: WeightBand[] = ["<15kg", ">=15kg"];

type RawTuple = [string, DataScope, Lane, WeightBand, number, number];

const RAW: RawTuple[] = [
  ["2026-01", "SPE", "Cross Metro", "<15kg", 237941, 222610],
  ["2026-01", "SPE", "Cross Metro", ">=15kg", 11, 9],
  ["2026-01", "SPE", "Cross Region", "<15kg", 3743428, 3463460],
  ["2026-01", "SPE", "Cross Region", ">=15kg", 92, 54],
  ["2026-01", "SPE", "Intra City", "<15kg", 96338, 88587],
  ["2026-01", "SPE", "Intra City", ">=15kg", 6, 6],
  ["2026-01", "SPE", "Intra Region", "<15kg", 3270279, 3110910],
  ["2026-01", "SPE", "Intra Region", ">=15kg", 72, 28],
  ["2026-01", "SPB", "Cross Metro", "<15kg", 72214, 63738],
  ["2026-01", "SPB", "Cross Metro", ">=15kg", 83739, 67612],
  ["2026-01", "SPB", "Cross Region", "<15kg", 412803, 360720],
  ["2026-01", "SPB", "Cross Region", ">=15kg", 484020, 413256],
  ["2026-01", "SPB", "Intra City", "<15kg", 175508, 163847],
  ["2026-01", "SPB", "Intra City", ">=15kg", 239139, 204113],
  ["2026-01", "SPB", "Intra Region", "<15kg", 297450, 278396],
  ["2026-01", "SPB", "Intra Region", ">=15kg", 521229, 449778],
  ["2026-02", "SPE", "Cross Metro", "<15kg", 150972, 135444],
  ["2026-02", "SPE", "Cross Metro", ">=15kg", 5, 5],
  ["2026-02", "SPE", "Cross Region", "<15kg", 2215067, 2231705],
  ["2026-02", "SPE", "Cross Region", ">=15kg", 111, 143],
  ["2026-02", "SPE", "Intra City", "<15kg", 135860, 129650],
  ["2026-02", "SPE", "Intra City", ">=15kg", 4, 5],
  ["2026-02", "SPE", "Intra Region", "<15kg", 1935765, 1838879],
  ["2026-02", "SPE", "Intra Region", ">=15kg", 134, 172],
  ["2026-02", "SPB", "Cross Metro", "<15kg", 35944, 32692],
  ["2026-02", "SPB", "Cross Metro", ">=15kg", 43344, 42895],
  ["2026-02", "SPB", "Cross Region", "<15kg", 256614, 243261],
  ["2026-02", "SPB", "Cross Region", ">=15kg", 286371, 267159],
  ["2026-02", "SPB", "Intra City", "<15kg", 100467, 94891],
  ["2026-02", "SPB", "Intra City", ">=15kg", 138156, 125356],
  ["2026-02", "SPB", "Intra Region", "<15kg", 136011, 131727],
  ["2026-02", "SPB", "Intra Region", ">=15kg", 322981, 302508],
  ["2026-03", "SPE", "Cross Metro", "<15kg", 293357, 295695],
  ["2026-03", "SPE", "Cross Metro", ">=15kg", 3, 5],
  ["2026-03", "SPE", "Cross Region", "<15kg", 3607750, 3547364],
  ["2026-03", "SPE", "Cross Region", ">=15kg", 37, 41],
  ["2026-03", "SPE", "Intra City", "<15kg", 151411, 144533],
  ["2026-03", "SPE", "Intra City", ">=15kg", 4, 4],
  ["2026-03", "SPE", "Intra Region", "<15kg", 3390444, 3309612],
  ["2026-03", "SPE", "Intra Region", ">=15kg", 15, 20],
  ["2026-03", "SPB", "Cross Metro", "<15kg", 64001, 65198],
  ["2026-03", "SPB", "Cross Metro", ">=15kg", 73403, 72995],
  ["2026-03", "SPB", "Cross Region", "<15kg", 390979, 391621],
  ["2026-03", "SPB", "Cross Region", ">=15kg", 441817, 434928],
  ["2026-03", "SPB", "Intra City", "<15kg", 112723, 108944],
  ["2026-03", "SPB", "Intra City", ">=15kg", 189279, 179980],
  ["2026-03", "SPB", "Intra Region", "<15kg", 217625, 213554],
  ["2026-03", "SPB", "Intra Region", ">=15kg", 478787, 468300],
  ["2026-04", "SPE", "Cross Metro", "<15kg", 206591, 209317],
  ["2026-04", "SPE", "Cross Metro", ">=15kg", 3, 2],
  ["2026-04", "SPE", "Cross Region", "<15kg", 3030484, 3038102],
  ["2026-04", "SPE", "Cross Region", ">=15kg", 17, 19],
  ["2026-04", "SPE", "Intra City", "<15kg", 109361, 111123],
  ["2026-04", "SPE", "Intra City", ">=15kg", 1, 1],
  ["2026-04", "SPE", "Intra Region", "<15kg", 2770341, 2783769],
  ["2026-04", "SPE", "Intra Region", ">=15kg", 19, 20],
  ["2026-04", "SPB", "Cross Metro", "<15kg", 57841, 58114],
  ["2026-04", "SPB", "Cross Metro", ">=15kg", 73186, 69722],
  ["2026-04", "SPB", "Cross Region", "<15kg", 285684, 293430],
  ["2026-04", "SPB", "Cross Region", ">=15kg", 385527, 374577],
  ["2026-04", "SPB", "Intra City", "<15kg", 104888, 100515],
  ["2026-04", "SPB", "Intra City", ">=15kg", 163070, 152942],
  ["2026-04", "SPB", "Intra Region", "<15kg", 215015, 211424],
  ["2026-04", "SPB", "Intra Region", ">=15kg", 438910, 426519],
  ["2026-05", "SPE", "Cross Metro", "<15kg", 279706, 262750],
  ["2026-05", "SPE", "Cross Metro", ">=15kg", 4, 5],
  ["2026-05", "SPE", "Cross Region", "<15kg", 3712593, 3501386],
  ["2026-05", "SPE", "Cross Region", ">=15kg", 43, 43],
  ["2026-05", "SPE", "Intra City", "<15kg", 116297, 111898],
  ["2026-05", "SPE", "Intra City", ">=15kg", 1, 1],
  ["2026-05", "SPE", "Intra Region", "<15kg", 3254984, 3081562],
  ["2026-05", "SPE", "Intra Region", ">=15kg", 36, 34],
  ["2026-05", "SPB", "Cross Metro", "<15kg", 56070, 53311],
  ["2026-05", "SPB", "Cross Metro", ">=15kg", 87859, 79949],
  ["2026-05", "SPB", "Cross Region", "<15kg", 250342, 239443],
  ["2026-05", "SPB", "Cross Region", ">=15kg", 419585, 384468],
  ["2026-05", "SPB", "Intra City", "<15kg", 168201, 158126],
  ["2026-05", "SPB", "Intra City", ">=15kg", 149551, 139100],
  ["2026-05", "SPB", "Intra Region", "<15kg", 265642, 251218],
  ["2026-05", "SPB", "Intra Region", ">=15kg", 497790, 462325],
  ["2026-06", "SPE", "Cross Metro", "<15kg", 280085, 269033],
  ["2026-06", "SPE", "Cross Metro", ">=15kg", 7, 6],
  ["2026-06", "SPE", "Cross Region", "<15kg", 4106919, 3902403],
  ["2026-06", "SPE", "Cross Region", ">=15kg", 34, 28],
  ["2026-06", "SPE", "Intra City", "<15kg", 116628, 111872],
  ["2026-06", "SPE", "Intra City", ">=15kg", 4, 4],
  ["2026-06", "SPE", "Intra Region", "<15kg", 3608357, 3448755],
  ["2026-06", "SPE", "Intra Region", ">=15kg", 40, 37],
  ["2026-06", "SPB", "Cross Metro", "<15kg", 61813, 57725],
  ["2026-06", "SPB", "Cross Metro", ">=15kg", 92356, 86044],
  ["2026-06", "SPB", "Cross Region", "<15kg", 286842, 266426],
  ["2026-06", "SPB", "Cross Region", ">=15kg", 451078, 417848],
  ["2026-06", "SPB", "Intra City", "<15kg", 207993, 196815],
  ["2026-06", "SPB", "Intra City", ">=15kg", 125917, 117317],
  ["2026-06", "SPB", "Intra Region", "<15kg", 322403, 301809],
  ["2026-06", "SPB", "Intra Region", ">=15kg", 530319, 492382],
  ["2026-07", "SPE", "Cross Metro", "<15kg", 276127, 272453],
  ["2026-07", "SPE", "Cross Metro", ">=15kg", 4, 5],
  ["2026-07", "SPE", "Cross Region", "<15kg", 3549384, 3575487],
  ["2026-07", "SPE", "Cross Region", ">=15kg", 34, 36],
  ["2026-07", "SPE", "Intra City", "<15kg", 116283, 114033],
  ["2026-07", "SPE", "Intra City", ">=15kg", 4, 4],
  ["2026-07", "SPE", "Intra Region", "<15kg", 3197865, 3178475],
  ["2026-07", "SPE", "Intra Region", ">=15kg", 26, 30],
  ["2026-07", "SPB", "Cross Metro", "<15kg", 61109, 59440],
  ["2026-07", "SPB", "Cross Metro", ">=15kg", 86455, 82661],
  ["2026-07", "SPB", "Cross Region", "<15kg", 305085, 293961],
  ["2026-07", "SPB", "Cross Region", ">=15kg", 437846, 414368],
  ["2026-07", "SPB", "Intra City", "<15kg", 209728, 203396],
  ["2026-07", "SPB", "Intra City", ">=15kg", 121735, 114338],
  ["2026-07", "SPB", "Intra Region", "<15kg", 336183, 323285],
  ["2026-07", "SPB", "Intra Region", ">=15kg", 515747, 489511],
  ["2026-08", "SPE", "Cross Metro", "<15kg", 171070, 159551],
  ["2026-08", "SPE", "Cross Metro", ">=15kg", 3, 3],
  ["2026-08", "SPE", "Cross Region", "<15kg", 2235864, 2088727],
  ["2026-08", "SPE", "Cross Region", ">=15kg", 18, 21],
  ["2026-08", "SPE", "Intra City", "<15kg", 76724, 70707],
  ["2026-08", "SPE", "Intra City", ">=15kg", 3, 2],
  ["2026-08", "SPE", "Intra Region", "<15kg", 2054318, 1909169],
  ["2026-08", "SPE", "Intra Region", ">=15kg", 11, 11],
  ["2026-08", "SPB", "Cross Metro", "<15kg", 51974, 46521],
  ["2026-08", "SPB", "Cross Metro", ">=15kg", 63365, 55275],
  ["2026-08", "SPB", "Cross Region", "<15kg", 242645, 217809],
  ["2026-08", "SPB", "Cross Region", ">=15kg", 296263, 258518],
  ["2026-08", "SPB", "Intra City", "<15kg", 143223, 132680],
  ["2026-08", "SPB", "Intra City", ">=15kg", 85740, 75687],
  ["2026-08", "SPB", "Intra Region", "<15kg", 265731, 241933],
  ["2026-08", "SPB", "Intra Region", ">=15kg", 344035, 309018],
];

export const BIZ_ROWS: BizRow[] = RAW.map(
  ([month, scope, lane, weight, created, gtc]) => ({
    month,
    scope,
    lane,
    weight,
    created,
    gtc,
  }),
);

// Các tháng có mặt trong dữ liệu, tăng dần.
export const BIZ_MONTHS: string[] = [
  ...new Set(BIZ_ROWS.map((r) => r.month)),
].sort();
