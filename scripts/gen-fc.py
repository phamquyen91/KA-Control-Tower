#!/usr/bin/env python3
"""Bóc FC theo ngày từ các file forecast SPE gửi, ghi thẳng vào lib/targetData.ts.

    python3 scripts/gen-fc.py [thư-mục-gốc-FC]

Mặc định đọc ~/Documents/Claude/GHN/SPE, trong đó có hai thư mục con
"FC SPE Bulky" và "FC SPE Express".

Cần openpyxl:  pip3 install openpyxl

VÌ SAO CÓ SCRIPT NÀY: trước đây bóc tay, đã dẫn tới lấy nhầm file (tháng 2 có
hai file tách theo block weight, tháng 4 có bản 28 ngày lẫn bản 30 ngày) và
không ai kiểm lại được. Chạy script thì mỗi tháng chỉ việc thả file mới vào
thư mục rồi chạy lại.

CÁCH NHẬN DIỆN TRONG FILE — các bản phát hành không cùng một khuôn:
  - Hàng ngày  : hàng đầu tiên có trên 5 ô kiểu ngày.
  - Hàng sản lượng: nhãn là "Total", "Hẹn lấy" hoặc "Orderdate" tuỳ bản; vài
    bản ghi "Total (PU + DO)". Dòng này bằng Pickup + Dropoff — script kiểm
    lại trên TỪNG NGÀY và báo lỗi nếu lệch.
  - Block weight của Bulky: đọc từ tên sheet, không có thì lùi về tên file
    (tháng 2/2026 hai block nằm ở hai file riêng).

CHỌN FILE KHI TRÙNG THÁNG: lấy bản có NHIỀU NGÀY NHẤT, hoà thì lấy bản sửa
sau cùng. Tháng 4 có bản thiếu hai ngày đầu nên luật này mới cần.
"""

import datetime
import glob
import os
import re
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("Thiếu openpyxl. Cài bằng: pip3 install openpyxl")

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Documents/Claude/GHN/SPE"
)
TARGET_FILE = os.path.join(os.path.dirname(__file__), "..", "lib", "targetData.ts")

FOLDERS = {"FC SPE Bulky": "SPB", "FC SPE Express": "SPE"}
TOTAL_LABELS = ("total", "hẹn lấy", "orderdate")


def band_of(scope, sheet_name, file_name):
    """Block weight của Bulky; Standard không tách block."""
    if scope == "SPE":
        return "total"
    for text in (sheet_name, file_name):
        t = text.lower().replace(" ", "")
        if "10-15" in t:
            return "<15kg"
        if "15kg+" in t or "15kgs+" in t or ">15kg" in t or "15kg_" in t:
            return ">=15kg"
    return None


def read_sheet(ws):
    """Trả về (dates, total_values, pickup_plus_dropoff) hoặc None nếu sheet không có dữ liệu ngày."""
    rows = list(ws.iter_rows(values_only=True))[:20]

    cols, dates = [], []
    for row in rows:
        found = [
            (i, c)
            for i, c in enumerate(row)
            if isinstance(c, (datetime.date, datetime.datetime))
        ]
        if len(found) > 5:
            cols = [i for i, _ in found]
            dates = [c.date() if isinstance(c, datetime.datetime) else c for _, c in found]
            break
    if not dates:
        return None

    def labelled(names):
        for row in rows:
            for cell in row[:4]:
                if not isinstance(cell, str):
                    continue
                t = cell.strip().lower()
                if any(t.startswith(n) for n in names):
                    return [row[i] if i < len(row) else None for i in cols]
        return None

    total = labelled(TOTAL_LABELS)
    pickup = labelled(("pickup",))
    dropoff = labelled(("dropoff",))
    if total is None:
        return None
    return dates, total, pickup, dropoff


def collect():
    """{(month, scope, band): {"days": {date: value}, "src": tên file}} — đã chọn bản tốt nhất."""
    best = {}
    for folder, scope in FOLDERS.items():
        pattern = os.path.join(ROOT, folder, "*.xlsx")
        for path in sorted(glob.glob(pattern)):
            name = os.path.basename(path)
            if name.startswith("~$"):
                continue
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
            for sheet in wb.sheetnames:
                got = read_sheet(wb[sheet])
                if not got:
                    continue
                dates, total, pickup, dropoff = got
                band = band_of(scope, sheet, name)
                if band is None:
                    print(f"  ⚠ bỏ qua [{name} / {sheet}] — không đoán được block weight")
                    continue

                # Gom theo tháng: một sheet chỉ nên có một tháng, nhưng không
                # tin vào điều đó — file tháng 4 từng bắt đầu từ ngày 03.
                by_month = {}
                for i, d in enumerate(dates):
                    v = total[i]
                    if not isinstance(v, (int, float)):
                        continue
                    if isinstance(pickup, list) and isinstance(dropoff, list):
                        p, q = pickup[i], dropoff[i]
                        if isinstance(p, (int, float)) and isinstance(q, (int, float)):
                            if abs(v - (p + q)) > 1:
                                sys.exit(
                                    f"✗ {name}/{sheet} ngày {d}: Total {v:.0f} ≠ "
                                    f"Pickup+Dropoff {p + q:.0f}. Khuôn file đã đổi, "
                                    "kiểm tra lại trước khi nạp."
                                )
                    by_month.setdefault(d.strftime("%Y-%m"), {})[d.isoformat()] = round(v)

                for month, days in by_month.items():
                    key = (month, scope, band)
                    cur = best.get(key)
                    newer = os.path.getmtime(path)
                    if (
                        cur is None
                        or len(days) > len(cur["days"])
                        or (len(days) == len(cur["days"]) and newer > cur["mtime"])
                    ):
                        best[key] = {"days": days, "src": name, "mtime": newer}
    return best


def render(best):
    daily, monthly = [], []
    for (month, scope, band) in sorted(best, key=lambda k: (k[1], k[2], k[0])):
        days = best[(month, scope, band)]["days"]
        for date in sorted(days):
            daily.append(f'  ["{date}", "{scope}", "{band}", {days[date]}],')
        monthly.append((month, scope, band, sum(days.values())))

    monthly.sort(key=lambda r: (r[1], r[2], r[0]))
    month_lines = [f'  ["{m}", "{s}", "{b}", {v}],' for m, s, b, v in monthly]
    return "\n".join(daily), "\n".join(month_lines)


def splice(source, marker, body):
    start = source.index(marker) + len(marker)
    end = source.index("\n];", start)
    return source[:start] + "\n" + body + source[end + 1:]


def main():
    print(f"Đọc FC từ {ROOT}")
    best = collect()
    if not best:
        sys.exit("Không tìm thấy file FC nào.")

    daily_body, month_body = render(best)

    path = os.path.abspath(TARGET_FILE)
    src = open(path, encoding="utf-8").read()
    src = splice(src, "const DAILY_FC_RAW: DailyFcTuple[] = [", daily_body)
    src = splice(src, "const FC_RAW: TargetTuple[] = [", month_body)
    open(path, "w", encoding="utf-8").write(src)

    months = sorted({m for m, _, _ in best})
    print(f"Đã ghi {len(daily_body.splitlines())} dòng FC ngày, {len(best)} khối tháng×scope×block.")
    print(f"Phủ {months[0]} → {months[-1]}")
    for (month, scope, band) in sorted(best, key=lambda k: (k[0], k[1], k[2])):
        e = best[(month, scope, band)]
        print(f"  {month} {scope} {band:7} {len(e['days']):2}d {sum(e['days'].values()):>9,}  ← {e['src']}")


if __name__ == "__main__":
    main()
