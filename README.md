# KA Control Tower — Shopee Account

Control Tower cho team KA Scommerce (Shopee Account), dựng bằng Next.js App Router
theo brand GHN/SCommerce (cam `#FE5F00`, xanh `#0E4174`).

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Trạng thái các tab

| Tab | Trạng thái |
| --- | --- |
| Tình hình kinh doanh | Placeholder |
| **Sức khoẻ vận hành** | **Đã nhúng app báo cáo KAS qua iframe** |
| Khiếu nại | Placeholder |
| Đền bù | Placeholder |
| Campaign Shopee | Placeholder |
| Quản trị công việc KA-SPE | Placeholder |

Các tab placeholder liệt kê sẵn nội dung dự kiến để triển khai sau.

## Tab "Sức khoẻ vận hành" — nhúng app kas-shopee-performance

Tab này **không build lại UI báo cáo**, mà nhúng nguyên app đã deploy
"GHN KAS — Báo Cáo Điều Hành Shopee" bằng `<iframe>`
(`components/OpsHealthIframe.tsx`).

Cơ chế đồng bộ với app nguồn:

- **Lúc mount**: `src` mang `?scope=spb|spe&period=day|month`. App nguồn hiện mới
  đọc `scope`; `period` sẽ bị ignore cho tới khi bên KAS bổ sung toggle
  ngày/tháng ở mức global.
- **Khi đổi scope sau đó**: gửi
  `postMessage({ source: 'control-tower', type: 'set-scope', scope }, KAS_ORIGIN)`
  thay vì đổi `src`, để iframe không reload và không mất state/scroll đang xem.
  `targetOrigin` luôn là origin cụ thể, không dùng `'*'`.
- **Chiều cao**: dùng `iframe-resizer` **4.x (MIT)** phía parent. App nguồn đã
  nhúng sẵn script phía child. Container chỉ giữ `min-height: 400px` để không co
  về 0px trước lần resize đầu — không set cứng chiều cao lớn.
- **Khi nhúng không lên được**: nếu sau `HANDSHAKE_TIMEOUT_MS` (6s) mà child của
  `iframe-resizer` chưa bắt tay, component hiện panel cảnh báo thay cho màn hình
  trắng câm — nêu nguyên nhân, in ra đúng origin cần whitelist, kèm nút mở báo
  cáo ở tab mới. Panel hiện **phía trên** iframe chứ không thay thế, nên nếu báo
  cáo thực tế vẫn render (chỉ thiếu script child) thì người dùng không mất nội dung.

> `iframe-resizer` phải giữ ở bản 4.x. Từ bản 5 trở đi package đổi sang giấy phép
> GPL-3.0/thương mại, không dùng nội bộ được khi chưa mua license.

### Cấu hình origin

Mặc định trỏ tới `https://kas-shopee-performance.vercel.app`. Nếu app nguồn đổi
domain, set biến môi trường:

```bash
NEXT_PUBLIC_KAS_ORIGIN=https://domain-moi.example.com
```

### Việc cần phía team KAS

App nguồn phải khai báo `frame-ancestors` trong CSP cho domain thật của Control
Tower thì trình duyệt mới cho nhúng. Đây là việc bên KAS làm, phía Control Tower
không can thiệp được.

> **Trạng thái hiện tại:** CSP của app nguồn đang là
> `frame-ancestors 'self' https://control-tower.example.com` — mới chỉ có domain
> placeholder. Chạy local sẽ bị chặn và tab hiện panel cảnh báo. Cần gửi team KAS
> domain thật (và `http://localhost:3000` nếu muốn dev local nhúng được).

## Cấu trúc

```
app/                    layout, globals.css (design token GHN), page
components/
  ControlTower.tsx      shell: state dataScope / dataPeriod / tab đang mở
  Sidebar.tsx           điều hướng theo nhóm
  Toggle.tsx            toggle SPB/SPE và Theo ngày/Theo tháng
  OpsHealthIframe.tsx   nhúng app báo cáo KAS
  Placeholder.tsx       khung placeholder cho các tab chưa làm
lib/                    cấu hình tab và nội dung placeholder
types/                  khai báo type cho iframe-resizer 4.x
```

## Responsive

Từ `max-width: 900px` sidebar chuyển thành off-canvas drawer, mở bằng nút
hamburger ở topbar, đóng bằng backdrop hoặc khi chọn xong một tab. Lúc đóng
drawer dùng `visibility: hidden` để không lọt focus bàn phím vào menu vô hình.
