import "server-only";

import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { BIZ_SOURCE_SHEET_ID } from "./labels";
import {
  aggregateDd,
  parseOpr,
  parseVol,
  type CampaignAgg,
  type OprRow,
  type ParsedVol,
  type SheetRows,
} from "./sheetParse";
import { SNAPSHOT_AT, VOL_SNAPSHOT } from "./snapshot/biz";
import { CAMPAIGN_SNAPSHOT, OPR_SNAPSHOT } from "./snapshot/campaign";

// Nguồn dữ liệu của app: đọc trực tiếp Google Sheet nếu có service account,
// không thì rơi về bản chụp trong repo.
//
// TẠI SAO KHÔNG "PUBLISH TO WEB" SHEET CHO ĐƠN GIẢN: publish là công khai —
// ai có link đọc được toàn bộ sản lượng Shopee mà không cần đăng nhập. Service
// account đọc bằng quyền riêng, sheet vẫn private, số liệu vẫn chỉ ra khỏi
// server qua /api/* đã kiểm tra quyền.
//
// CÁCH BẬT: tạo service account trong Google Cloud, share sheet cho email của
// nó (Viewer), rồi đặt biến môi trường GOOGLE_SA_KEY = nội dung file JSON key
// (hoặc bản base64 của nó). Không có biến này thì app vẫn chạy bằng bản chụp.

/** Sheet đọc lại tối đa mỗi giờ — sheet chỉ đổi mỗi sáng nên đủ tươi. */
const REVALIDATE_SECONDS = 3600;

const TABS = { vol: "vol", dd: "DD", opr: "DD OPR" } as const;

export interface DataSource {
  kind: "live" | "snapshot";
  /** Ngày lấy số liệu (YYYY-MM-DD, giờ Việt Nam). */
  snapshotAt: string;
  /** Ngày cuối cùng có số thực tế: sheet chạy mỗi sáng cho số hôm trước. */
  dataThrough: string;
  /** Live: thời điểm gọi API gần nhất (ISO); snapshot: null. */
  fetchedAt: string | null;
  /** Live bị lỗi và đã rơi về snapshot — giao diện cần nói rõ. */
  fallbackReason: string | null;
}

export interface Datasets {
  vol: ParsedVol;
  campaign: CampaignAgg;
  opr: OprRow[];
  source: DataSource;
}

/* ------------------------------------------------------------------------ */
/* Ngày tháng                                                                */
/* ------------------------------------------------------------------------ */

const VN_TZ = "Asia/Ho_Chi_Minh";

/** Ngày hôm nay theo giờ Việt Nam, "YYYY-MM-DD". Server Vercel chạy UTC. */
function todayVn(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------------ */
/* Service account → access token                                            */
/* ------------------------------------------------------------------------ */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function readServiceAccount(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SA_KEY?.trim();
  if (!raw) return null;
  // Chấp nhận cả JSON thẳng lẫn base64 — dán JSON nhiều dòng vào Vercel hay
  // bị hỏng xuống dòng trong private_key, base64 tránh được chuyện đó.
  const json = raw.startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json) as Partial<ServiceAccountKey>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_SA_KEY thiếu client_email hoặc private_key");
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

/** Đổi JWT ký bằng khoá service account lấy access token (chuẩn OAuth 2.0 JWT bearer). */
async function accessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key, "base64url");
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google token endpoint trả ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google không trả access_token");
  return data.access_token;
}

/* ------------------------------------------------------------------------ */
/* Đọc sheet                                                                 */
/* ------------------------------------------------------------------------ */

interface BatchGetResponse {
  valueRanges?: { range: string; values?: SheetRows }[];
}

async function fetchTabs(sa: ServiceAccountKey): Promise<Record<keyof typeof TABS, SheetRows>> {
  const token = await accessToken(sa);
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${BIZ_SOURCE_SHEET_ID}/values:batchGet`,
  );
  for (const tab of Object.values(TABS)) url.searchParams.append("ranges", tab);
  // UNFORMATTED để số về là số, không phải "1,234"; ngày về là serial — parser xử lý.
  url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
  url.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    // 403 gần như chắc chắn là chưa share sheet cho service account.
    throw new Error(
      res.status === 403
        ? "Sheets API 403 — sheet chưa share cho email service account?"
        : `Sheets API trả ${res.status}`,
    );
  }
  const data = (await res.json()) as BatchGetResponse;
  const ranges = data.valueRanges ?? [];
  // range trả về dạng "vol!A1:G176" hoặc "'DD OPR'!A1:J648" — lấy tên tab.
  const tabName = (range: string) => range.split("!")[0].replace(/^'|'$/g, "");
  const pick = (name: string) =>
    ranges.find((r) => tabName(r.range).toLowerCase() === name.toLowerCase())
      ?.values ?? [];
  return { vol: pick(TABS.vol), dd: pick(TABS.dd), opr: pick(TABS.opr) };
}

/**
 * Đọc + bóc sheet, cache trong Data Cache của Next theo giờ.
 *
 * Cache SAU KHI đã gom (aggregateDd) chứ không cache dòng thô: tab DD có
 * ~20.000 dòng, để thô sẽ vượt giới hạn một mục cache; gom xong còn vài nghìn.
 */
const loadLive = unstable_cache(
  async (): Promise<Omit<Datasets, "source"> & { fetchedAt: string }> => {
    const sa = readServiceAccount();
    if (!sa) throw new Error("no service account");
    const tabs = await fetchTabs(sa);
    return {
      vol: parseVol(tabs.vol),
      campaign: aggregateDd(tabs.dd),
      opr: parseOpr(tabs.opr),
      fetchedAt: new Date().toISOString(),
    };
  },
  ["sheet-datasets-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["sheet"] },
);

function snapshotDatasets(fallbackReason: string | null): Datasets {
  return {
    vol: parseVol(VOL_SNAPSHOT),
    campaign: CAMPAIGN_SNAPSHOT,
    opr: parseOpr(OPR_SNAPSHOT),
    source: {
      kind: "snapshot",
      snapshotAt: SNAPSHOT_AT,
      dataThrough: dayBefore(SNAPSHOT_AT),
      fetchedAt: null,
      fallbackReason,
    },
  };
}

/**
 * Bộ dữ liệu cho một request. `cache()` của React gộp các lần gọi trong cùng
 * request (biz và campaign cùng cần) thành một.
 */
export const getDatasets = cache(async (): Promise<Datasets> => {
  if (!process.env.GOOGLE_SA_KEY) return snapshotDatasets(null);

  try {
    const live = await loadLive();
    // Ngày chốt suy từ lúc ĐỌC chứ không phải lúc cache: sheet nạp số mỗi
    // sáng cho hôm trước, nên tới ngày nào thì số dừng ở hôm trước ngày đó.
    const today = todayVn();
    return {
      vol: live.vol,
      campaign: live.campaign,
      opr: live.opr,
      source: {
        kind: "live",
        snapshotAt: today,
        dataThrough: dayBefore(today),
        fetchedAt: live.fetchedAt,
        fallbackReason: null,
      },
    };
  } catch (err) {
    // Không để tab trắng vì sheet lỗi — rơi về bản chụp nhưng phải nói rõ
    // là đang xem số cũ. Lý do ghi vào payload cho người vận hành thấy.
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[sheetSource] rơi về bản chụp:", reason);
    return snapshotDatasets(reason);
  }
});
