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

| Tab | Trạng thái | Nguồn dữ liệu |
| --- | --- | --- |
| **Tình hình kinh doanh** | **Đã dựng** | `raw tab 1` + FC xlsx + AOP |
| **Sức khoẻ vận hành** | **Nhúng app báo cáo KAS qua iframe** | kas-shopee-performance |
| Khiếu nại | Placeholder | — |
| Đền bù | Placeholder | — |
| **Campaign Shopee** | **Đã dựng** | Sheet `tower control raw` · `raw tab 2` |
| Quản trị công việc KA-SPE | Placeholder | — |

Các tab placeholder liệt kê sẵn nội dung dự kiến để triển khai sau.

## Phân quyền

Hai tầng, định nghĩa ở `lib/access.ts`:

| Tầng | Hàm | Chặn theo | Áp dụng cho |
| --- | --- | --- | --- |
| 1 | `canSignIn` | Domain email — chỉ `@ghn.vn` | Toàn bộ app |
| 2 | `canViewBiz` | Danh sách email cụ thể | Tab Tình hình kinh doanh |

Tầng 2 gọi tầng 1 bên trong, nên dù ai đó lỡ thêm email ngoài `@ghn.vn` vào danh
sách tab kinh doanh thì cửa domain vẫn chặn.

So khớp domain là **chính xác**, không phải so hậu tố — `ke.gian@ghn.vn.attacker.com`
và `ke.gian@xghn.vn` đều bị từ chối.

Ghi đè bằng biến môi trường mà không cần sửa code: `SIGNIN_ALLOWED_DOMAINS` và
`BIZ_ALLOWED_EMAILS` (các giá trị cách nhau dấu phẩy).

### Cửa tầng 1 nằm ở đâu

`proxy.ts` ở gốc dự án. **Next.js 16 đã đổi tên `middleware.ts` thành `proxy.ts`**,
hàm export cũng đổi theo — xem
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

Matcher loại trừ `/api` có chủ đích: để các route API tự trả mã lỗi đúng nghĩa.
Nếu để proxy chặn, `fetch` từ giao diện sẽ nhận HTML trang đăng nhập kèm mã 200
thay vì 401, và chỗ gọi sẽ vỡ khi parse JSON.

Hai trang mở công khai: `/dang-nhap` (chặn thì thành vòng lặp chuyển hướng) và
`/privacy` (Google trỏ link tới đây từ màn hình đồng ý).

### Tầng 2 — tab "Tình hình kinh doanh"

Cơ chế:

1. **Đăng nhập Google** qua Auth.js (`auth.ts`). Callback `signIn` chặn ngay ở
   bước đăng nhập — email ngoài allowlist không tạo được session.
2. **Số liệu không nằm trong bundle client.** `lib/bizData.ts`,
   `lib/targetData.ts`, `lib/bizMetrics.ts` đều đánh dấu `server-only`, build sẽ
   fail nếu có component client lỡ import. Giao diện lấy số qua `GET /api/biz`,
   route đó kiểm tra session **và** allowlist trước khi trả dữ liệu.

Đây là điểm khiến nó là bảo mật thật chứ không phải tấm rèm: nếu dữ liệu vẫn
nằm trong bundle thì màn hình đăng nhập chỉ che mắt, mở DevTools là đọc được.
Proxy chặn được *trang* nhưng **không** chặn file tĩnh `_next/static` — ai có
sẵn URL của chunk vẫn tải được mà không cần đăng nhập.

Vì vậy **cả hai** tab có số liệu đều đi qua route riêng, và các module dữ liệu
đều `server-only`:

| Tab | Route | Cửa |
| --- | --- | --- |
| Tình hình kinh doanh | `/api/biz` | `canViewBiz` (allowlist email) |
| Campaign Shopee | `/api/campaign` | `canSignIn` (domain @ghn.vn) |

Kiểm chứng sau mỗi lần build — cả ba phải ra `0`:

```bash
grep -rl "13887419\|249020\|CP 8.8" .next/static | wc -l
```

Sửa danh sách email ở `lib/allowlist.ts`, hoặc đặt biến `BIZ_ALLOWED_EMAILS`
(các email cách nhau dấu phẩy) để đổi mà không cần sửa code.

### Gỡ lỗi đăng nhập

Google trả `invalid_client` hoặc trang báo `mã lỗi: Configuration` thì xem log
thật, đừng đoán: **Vercel → Logs**, lọc `/api/auth/callback/google`. Auth.js ghi
nguyên nhân gốc vào đó.

Ba biến phải có mặt đủ, thiếu một cái là luồng gãy ở những chỗ khác nhau:

| Biến | Thiếu thì sao |
| --- | --- |
| `AUTH_SECRET` | Không mã hoá được cookie state/PKCE, gãy ở bước callback |
| `AUTH_GOOGLE_ID` | Google chặn ngay màn hình đăng nhập |
| `AUTH_GOOGLE_SECRET` | Qua được màn hình đăng nhập rồi mới gãy ở bước đổi token |

> **Bẫy đã dính một lần:** lọc danh sách biến bằng chữ `SECRET` sẽ ra **cả**
> `AUTH_SECRET` lẫn `AUTH_GOOGLE_SECRET`. Xoá cả cụm thì mất luôn `AUTH_SECRET`,
> mà triệu chứng lại giống hệt lỗi sai client secret. Luôn đọc đủ tên biến.

Ngoài ra: reload trang **không** kiểm chứng được đăng nhập — nó chỉ đọc lại
cookie phiên, không chạm tới client secret. Muốn test thật thì đăng xuất rồi
đăng nhập lại, hoặc dùng cửa sổ ẩn danh.

### Biến môi trường bắt buộc

Xem `.env.example`. Thiếu các biến này thì tab kinh doanh báo lỗi tải, các tab
còn lại vẫn chạy bình thường.

| Biến | Lấy ở đâu |
| --- | --- |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → Credentials → OAuth client (Web application) |

Redirect URI phải khai đủ cả hai:
`http://localhost:3000/api/auth/callback/google` và
`https://ka-control-tower.vercel.app/api/auth/callback/google`.

## Header bảo mật

`next.config.ts` đặt các header tĩnh (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag`) và tắt `poweredByHeader`.
HSTS do Vercel tự thêm.

`Content-Security-Policy` nằm ở `proxy.ts` chứ không ở next.config, vì nó cần
nonce sinh mới theo từng request.

Ba dòng trong CSP dễ bị sửa hỏng, đừng đụng nếu chưa hiểu:

| Dòng | Vì sao phải có |
| --- | --- |
| `style-src 'unsafe-inline'` | Giao diện dùng `style={{}}` (chiều rộng thanh tỷ trọng, vị trí tooltip). Nonce **không** áp dụng được cho thuộc tính `style=""`, chỉ cho thẻ `<style>` |
| `form-action ... accounts.google.com` | Form đăng nhập POST về chính mình rồi được chuyển hướng sang Google, trình duyệt kiểm tra cả đích sau chuyển hướng. Thiếu là đăng nhập Google bị chặn |
| `frame-src <KAS_ORIGIN>` | Tab Sức khoẻ vận hành nhúng app báo cáo KAS |

Sửa CSP xong phải mở DevTools kiểm tra Console: vi phạm CSP không làm build fail,
nó chỉ âm thầm chặn ở trình duyệt.

### Vì sao root layout gọi `headers()`

`'strict-dynamic'` **vô hiệu hoá `'self'`** — chỉ script mang đúng nonce mới chạy.
Trang prerender tĩnh có HTML cố định từ lúc build nên không mang được nonce của
request, toàn bộ script bị chặn, React không hydrate. Triệu chứng rất dễ chẩn
đoán nhầm: trang vẫn hiện ra nhưng chết cứng, không gọi được API nào, mà build
thì vẫn xanh.

`app/layout.tsx` đọc `headers()` để buộc mọi route render động. Next 16 đã bỏ
`export const dynamic` khỏi route segment config nên đọc API động là cách còn
lại. App vốn nằm sau đăng nhập nên prerender tĩnh cũng không lợi gì.

Kiểm chứng sau khi đụng vào CSP hoặc cách render — nonce ở header phải khớp
nonce trong HTML, và build phải cho ra `ƒ` chứ không phải `○`:

```bash
npm run build 2>&1 | grep -E "^[┌├└]"
```

## Nguồn dữ liệu đã đổi (02/09/2026)

Sheet `tower control raw` đổi tên tab và thêm cột:

| Trước | Bây giờ | Thay đổi |
| --- | --- | --- |
| `raw tab 1` | `vol` | Thêm `delivery_team`; phủ **T5–T9** thay vì T1–T8 |
| `raw tab 2` | `DD` | Thêm `delivery_team` |

Hai điểm trong tab `vol` dễ xử lý sai:

- **`Cross metro *` là lane riêng**, tồn tại song song với `Cross metro`
  (525.625 đơn). Giữ tách, không gộp.
- **37 dòng thiếu lane** (~0,04%) gom vào `Không xác định` thay vì bỏ, để tổng
  vẫn khớp nguồn.

### YTD loại tháng đang chạy

`scopeProgress` chỉ cộng các tháng **đã đủ** vào YTD. Tháng đang chạy luôn
khuyết ngày trong khi AOP của nó là mục tiêu trọn tháng — gộp vào sẽ kéo tỷ lệ
hoàn thành xuống giả tạo. Với T9 mới có 2 ngày, YTD rơi từ 75,9% xuống 58,6%
nếu gộp. Tháng đang chạy nhìn riêng ở ô MTD, có nhãn "đang chạy".

Quy tắc tự chỉnh theo lịch: tháng cuối trong dữ liệu trùng tháng hiện tại thì
coi là chưa đủ.

## Mục tiêu: FC và AOP

Hai loại mục tiêu khác nhau về ý nghĩa, đừng dùng lẫn:

| Loại | Đối chiếu với | Nguồn |
| --- | --- | --- |
| **FC** | Created volume | Dòng `Total` (= Pickup + Dropoff) trong các file `GHN_*_Forecast *.xlsx` |
| **AOP** | GTTC volume | Bảng target AOP 2026 (dòng `SHOPEE` = Shopee Standard) |

Sinh ra `lib/targetData.ts` từ **toàn bộ** file forecast trong hai thư mục
`FC SPE Bulky` và `FC SPE Express`. Hiện phủ **T1–T9/2026 cho cả hai scope**.

Cách đọc file forecast:

- Dòng lấy số là `Total`, vài file cũ ghi là `Hẹn lấy`. Dòng này bằng
  `Pickup + Dropoff` — bộ sinh **kiểm tra lại trên từng ngày của mọi file**, hiện
  không sai lệch chỗ nào.
- Bulky tách hai block weight thành hai sheet. **Riêng T2/2026 hai block nằm ở
  hai file riêng**, nên nhận diện block theo tên file khi tên sheet không nói gì
  (sheet đều tên `Allocation Forecast`).
- Dòng lấy số còn có tên **`Orderdate`** ở một số file. Đã kiểm chứng nó bằng
  `Pickup + Dropoff` trên từng ngày (sai số tối đa 1 đơn do làm tròn) nên dùng
  như `Total`.
- **Một tháng có thể có nhiều bản forecast.** Bộ sinh chọn bản phủ *nhiều ngày
  nhất*: T4 của Standard có bản `Update0304` chỉ 28 ngày (phát hành muộn, bắt
  đầu từ 03/04) và bản `FC_Apr2026 update 2603` đủ 30 ngày — bản đủ thắng.
  **T4 của Bulky vẫn chỉ có bản 28 ngày**, nên FC tháng đó còn thấp hơn thực tế
  một chút; xin bản đủ từ SPE là tự khớp.

FC cho **ngày campaign** lấy từ chính các file này: CP 6.6 = 06/06 và 07/06,
CP 7.7 = 07/07 và 08/07, CP 8.8 = 08/08 và 09/08.

AOP chép tay từ bảng target nên đã tự kiểm tra: mọi tháng `10-15kg + 15kg++` khớp
đúng dòng tổng Bulky, và tổng 12 tháng khớp cột FY (lệch 1 đơn vị do làm tròn).

### Tháng đang chạy không có điểm hoàn thành

`completion()` trả về `undefined` cho tháng trùng tháng hiện tại. Sản lượng mới
có vài ngày trong khi mục tiêu là trọn tháng, tỷ lệ sẽ rơi xuống vài phần trăm và
đường trên biểu đồ đổ dốc thẳng đứng, che mất biến động thật của các tháng trước.
Cột sản lượng vẫn hiện nên không mất thông tin nào. Cùng nguyên tắc với việc YTD
loại tháng đang chạy.

## Dữ liệu từ Google Sheet

Hai tab đã dựng đọc từ sheet [`tower control raw`](https://docs.google.com/spreadsheets/d/1WI5CrcFrTgDR4FNS8Un9RR-oHEvkdJWCj8OUTc2BFtk/edit).
Dữ liệu để ở dạng **snapshot tĩnh** trong `lib/bizData.ts` và `lib/campaignData.ts`,
**không fetch lúc chạy**: sheet không công khai (truy cập ẩn danh trả `401`), nên
fetch phía trình duyệt sẽ dính đúng lỗi `403` mà tab Sức khoẻ vận hành đang gặp.

Cách cập nhật khi có số mới: xuất tab tương ứng ra CSV rồi sinh lại file dữ liệu.
`raw tab 2` có ~19.4k dòng ma trận tỉnh-đi × tỉnh-đến, nên `campaignData.ts` chỉ
giữ số **đã tổng hợp** ở mức kỳ campaign và mức tỉnh, không giữ dữ liệu thô.

### Những chỗ dễ đọc sai, đã xử lý sẵn trong giao diện

- **Tháng cuối chưa đủ tháng.** Snapshot chốt 19/08 nên T8/2026 khuyết ngày; chỉ
  số MoM đang so tháng khuyết với tháng đủ. Giao diện ghi rõ để không ai đọc
  `-28%` thành sụt giảm thật.
- **Baseline chỉ có ở D0.** Trong `raw tab 2`, dữ liệu ngày thường không có D+1,
  nên so sánh campaign với ngày thường bắt buộc là CP D0 ↔ baseline D0.
- **ODR tính theo trọng số đơn**, không lấy trung bình cộng ODR các tỉnh.
- **Bảng xếp hạng tỉnh có ngưỡng mẫu tối thiểu 300 đơn** — dưới mức đó vài đơn
  cũng đủ đẩy ODR về 0% hoặc 100% và chiếm hết top.

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
- **`heightCalculationMethod: 'lowestElement'`** — không dùng mặc định
  `bodyOffset`. Với layout của app nguồn, `bodyOffset` đo ra `0`.
  `lowestElement` duyệt DOM tìm điểm thấp nhất nên đo đúng (~1970px).
- **Tự áp chiều cao thay vì để lib làm.** Child đo đúng và gửi lên message
  `[iFrameSizer]<id>:<height>:<width>:<type>`, nhưng phần parent của v4 không áp
  dụng cho app này — iframe kẹt ở mức sàn dù message báo 1970px. Component tự
  lắng nghe message đó (lọc theo `event.origin`) rồi set `height`. Vẫn phải gọi
  `iframeResizer()` vì child chỉ chịu đo cho parent nào đã init nó.
- **Thúc đo lại** ở các mốc 300/1500/3500ms sau khi load, và 600ms sau mỗi lần
  đổi scope — child không tự đo lại khi nội dung render bất đồng bộ xong.
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

### App KAS có cổng đăng nhập riêng

Từ 31/08/2026 app nguồn thêm Supabase Auth, giới hạn email `@ghn.vn`. Cổng này
**tách biệt** với đăng nhập Control Tower — vào được Control Tower không có
nghĩa là vào được báo cáo.

**Và đăng nhập đó không thực hiện được bên trong khung nhúng.** Bấm nút đăng
nhập Google trong iframe sẽ ra `This content is blocked` — Google cấm tuyệt đối
trang đăng nhập của họ bị nhúng vào iframe để chống clickjacking. Đây là chính
sách toàn cầu của Google, không sửa được từ phía Control Tower.

Hệ quả: tab này hiện panel giải thích kèm nút mở báo cáo ở tab riêng. Muốn nhúng
thật sự chạy được thì cần team KAS làm một trong hai:

1. **OAuth qua popup** — mở Google ở cửa sổ popup (tầng trên cùng) thay vì điều
   hướng chính iframe, rồi trả session về. Đây là cách chuẩn cho OAuth trong iframe.
2. **Đường dẫn nhúng riêng** không đòi đăng nhập tương tác, chỉ tin domain đã
   khai trong `frame-ancestors` — vốn đã giới hạn sẵn ở `ka-control-tower.vercel.app`.

### Khi khung báo cáo hiện trang lỗi Google

App nguồn lấy dữ liệu từ một Google Sheet:

```
https://docs.google.com/spreadsheets/d/<sheetId>/export?format=csv&gid=<gid>
```

Sheet này **không công khai** (truy cập ẩn danh trả `401`). Khi không đọc được,
app nguồn tự điều hướng iframe sang `docs.google.com`, và trang lỗi của Google
chiếm nguyên khung báo cáo — dễ bị hiểu nhầm là lỗi của Control Tower.

Component phát hiện việc này bằng cách đếm số lần iframe phát sự kiện `load`
(cross-origin nên không đọc được `location`; SPA đổi route không phát `load`,
chỉ điều hướng thật mới phát). Từ lần thứ hai trở đi thì hiện panel giải thích
kèm nút tải lại khung.

Khắc phục: nhờ team KAS cấp quyền đọc sheet nguồn cho tài khoản Google của
người dùng. Nếu trình duyệt đăng nhập nhiều tài khoản Google, thử cửa sổ ẩn danh
để loại trừ việc Google chọn nhầm tài khoản.

### Việc cần phía team KAS

App nguồn phải khai báo `frame-ancestors` trong CSP cho domain thật của Control
Tower thì trình duyệt mới cho nhúng. Đây là việc bên KAS làm, phía Control Tower
không can thiệp được.

> **Trạng thái hiện tại:** CSP của app nguồn đang là
> `frame-ancestors 'self' https://control-tower.example.com` — mới chỉ có domain
> placeholder. Chạy local sẽ bị chặn và tab hiện panel cảnh báo. Cần gửi team KAS
> domain thật (và `http://localhost:3000` nếu muốn dev local nhúng được).

## Deploy (Vercel)

`vercel.json` đã pin `framework: nextjs`. Nếu để Vercel tự đoán và nó nhận nhầm
thành static site, build sẽ chạy xong nhưng fail ở khâu thu output với lỗi
`No Output Directory named "public" found` — Next.js xuất ra `.next`, không phải
`public`. Trong Project Settings, **Output Directory phải để mặc định** (không bật
override); override ở dashboard sẽ thắng phần suy luận từ framework.

Ngoài ra không cần config gì thêm. Chỉ set biến môi trường khi app nguồn đổi domain:

| Biến | Bắt buộc | Mặc định |
| --- | --- | --- |
| `NEXT_PUBLIC_KAS_ORIGIN` | Không | `https://kas-shopee-performance.vercel.app` |

### Domain cần gửi team KAS khai báo `frame-ancestors`

Vercel sinh nhiều loại domain, và CSP phải liệt kê **từng** domain muốn nhúng được:

| Loại | Dạng | Ghi chú |
| --- | --- | --- |
| Production | `https://<project>.vercel.app` | Ổn định — bắt buộc phải whitelist |
| Preview theo branch | `https://<project>-git-<branch>-<scope>.vercel.app` | Ổn định theo branch |
| Preview theo commit | `https://<project>-<hash>-<scope>.vercel.app` | Đổi mỗi lần deploy — không whitelist nổi |
| Dev local | `http://localhost:3000` | Chỉ thêm nếu muốn dev local nhúng được |

Preview theo commit đổi URL liên tục nên đừng cố whitelist; test nhúng trên
production hoặc trên preview-theo-branch. Nếu về sau gắn custom domain GHN thì
phải báo KAS bổ sung tiếp — CSP không hỗ trợ wildcard kiểu `*.vercel.app` một
cách an toàn.

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
