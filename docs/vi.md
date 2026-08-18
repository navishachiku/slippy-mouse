# Slippy Mouse

![Slippy Mouse](./images/banner.png)

Công cụ nâng cao chuột cho trình phát video trực tuyến: trình phát được chia thành ba vùng, chỉ cần lăn **con lăn** trong vùng là điều chỉnh được âm lượng, tốc độ phát, tua video và hơn thế nữa — mượt như lụa. Không cần nhớ phím tắt, không cần tìm nút bấm; một cú lăn nhẹ là xong. Bảng cài đặt cho phép tùy chỉnh mọi hành động lăn và nhấp chuột.

## ✨ Tính năng nổi bật

* **Hỗ trợ nhiều trang**: Hoạt động trên cả **YouTube** và **Bilibili** (`www.bilibili.com`), với vùng và hành động giống hệt nhau trên mỗi trang.

* **Điều khiển nhanh**: Đặt các vùng hành động tùy chỉnh trên trình phát, gắn với thao tác chuột như nhấp và lăn để điều chỉnh nhanh âm lượng, tốc độ, tiến trình, v.v.

* **Vùng hành động tùy chỉnh**: Hỗ trợ cấu hình vùng cảm ứng linh hoạt, tự do điều chỉnh kích thước và vị trí (mặc định có vùng trái, giữa và phải).

* **Tương tác không lớp phủ**: Bỏ lớp phủ trong suốt truyền thống, dùng tính toán tọa độ hiệu năng cao — hoàn toàn không cản trở các thao tác trên UI gốc như thanh tiến trình và nút bấm.

* **Con lăn thích ứng**: Một nấc lăn hoặc một lần vuốt bằng đúng một hành động trên mọi thiết bị — con lăn chuột, trackpad và phần mềm cuộn mượt (Mos, SmoothScroll, Logitech Options+) — không cần tinh chỉnh. Đuôi quán tính được triệt tiêu, còn cú vuốt dài có chủ ý vẫn phản hồi theo tỷ lệ.

* **Bảng cài đặt đồ họa**: Mọi tham số và ánh xạ vùng-hành động đều chỉnh được trong bảng ngay trên trang — thay đổi có hiệu lực tức thì và lưu trong trình duyệt, cập nhật script không bao giờ xóa tùy chỉnh của bạn.

![DEMO](./images/demo.webp)

## 🎛️ Bảng cài đặt

Không cần sửa mã — nhấp vào biểu tượng con chuột trên thanh điều khiển của trình phát để mở bảng cài đặt:

![Lối vào bảng cài đặt](./images/settings-entry.png)

![Settings Panel](./images/settings-general.png)

* **Bốn thẻ**: Chung (con lăn thích ứng, phím tắt, giao diện, OSD), Hành động vùng, Con lăn (tinh chỉnh thích ứng và lọc thủ công) và Nâng cao (gỡ lỗi, dữ liệu cài đặt).
* **Ánh xạ hành động vùng**: Chọn một vùng màu và gán bất kỳ hành động nào cùng giá trị cho từng kích hoạt (nhấp trái / phải / giữa, lăn lên / xuống):

![Zone Actions](./images/settings-zones.png)

* **Hiệu lực tức thì & lưu bền vững**: Thay đổi áp dụng ngay; «Lưu» ghi vào bộ nhớ trình duyệt — **cập nhật script không bao giờ xóa cài đặt**; «Hủy» hoặc Esc để hoàn tác.
* **Phím tắt**: Hiển thị vùng mặc định là `Alt+Shift+Z`; phím tắt bảng cài đặt mặc định chưa gán. Cả hai đều gán lại được trong bảng, hỗ trợ tổ hợp phím bổ trợ (Esc hủy bắt phím, Backspace xóa).
* **Xuất / Nhập / Đặt lại**: Sao lưu cài đặt thành tệp JSON, chuyển sang trình duyệt khác, hoặc khôi phục mặc định chỉ với một cú nhấp.
* **Ngôn ngữ giao diện**: Theo ngôn ngữ trình duyệt, mặc định là tiếng Anh; có thể chọn thủ công trong bảng cài đặt.
* **Giao diện**: Sáng / tối / tự động (theo cài đặt hệ thống).

## ⚙️ Tham số tùy chỉnh

Mọi tham số đều chỉnh được trong bảng cài đặt (khuyến nghị). Bạn cũng có thể sửa trực tiếp các khối `SETTINGS` và `CONFIG` ở đầu script, nhưng lưu ý: sửa trực tiếp sẽ bị ghi đè khi script cập nhật, còn cài đặt trong bảng thì được giữ lại.

<details>
<summary><b>Nâng cao: bảng tham số đầy đủ</b> (nhấp để mở rộng)</summary>

### Cài đặt toàn cục

| Tham số | Mô tả | Mặc định |
| :--- | :--- | :--- |
| `DEBUG` | Có xuất thông báo gỡ lỗi ra Console hay không | `false` |
| `ZONE_TOGGLE_KEY` | Phím tắt bật/tắt hiển thị vùng (hỗ trợ tổ hợp phím bổ trợ) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Phím tắt mở bảng cài đặt (lối vào chính là nút trên thanh điều khiển) | Chưa đặt |
| `OSD_DURATION` | Thời gian thông báo OSD hiển thị trên màn hình (ms) | `800` |
| `OSD_FADE_OUT` | Thời lượng hiệu ứng mờ dần của OSD (ms) | `150` |
| `OSD_FONT_SIZE` | Cỡ chữ của thông báo OSD (hỗ trợ px, em, rem, v.v.) | `28px` |
| `ADAPTIVE_WHEEL` | Lọc thích ứng: một nấc/một vuốt = một hành động trên mọi thiết bị. Đặt `false` để dùng lọc thủ công bên dưới | `true` |
| `WHEEL_STEP` | Chế độ thích ứng: lượng cuộn tích lũy (px) mỗi hành động; giảm để nhạy hơn | `100` |
| `GESTURE_GAP` | Thích ứng: khoảng lặng (ms) để tính đầu vào là cử chỉ mới | `150` |
| `MIN_ACTION_INTERVAL` | Thích ứng: số ms tối thiểu giữa hai hành động; chặn loạt kích hoạt dồn dập | `80` |
| `IMPULSE_MIN` | Thích ứng: quãng xung tối thiểu (px) để chốt một hành động; lọc chạm lướt | `20` |
| `REACCEL_FACTOR` | Thích ứng: tỷ lệ bật biên độ đánh dấu nấc mới trong đuôi đang suy giảm | `1.5` |
| `DISCRETE_SETTLE` | Thích ứng: độ trễ chốt (ms) cho nấc lăn đơn lẻ | `60` |
| `USE_WHEEL_COUNT_FIXED` | Chỉ chế độ thủ công: bật lọc theo đếm cố định | `false` |
| `WHEEL_DELAY` | Chỉ chế độ thủ công: độ trễ chống rung cho sự kiện con lăn (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Ngưỡng đếm: tích lũy bao nhiêu sự kiện con lăn thì thực hiện một hành động | `14` |

### Cấu hình vùng tùy chỉnh

Bạn có thể tùy chỉnh hoàn toàn các vùng hành động theo nhu cầu, điều chỉnh kích thước và vị trí.

Mặc định có vùng trái, giữa và phải:

| Vùng | Nhấp trái | Nhấp phải | Hành động con lăn |
| ----- | ----- | ----- | ----- |
| **Trái (Âm lượng)** | Âm lượng tối đa (100%) | Tắt tiếng nhanh (0%) | Âm lượng +/- 5% |
| **Giữa (Tiến trình)** | Cho qua (phát/dừng gốc) | Cho qua (menu gốc) | Tua +/- 5s |
| **Phải (Tốc độ)** | Nhanh 2.0x | Về 1.0x | Tốc độ +/- 0.25x |

### Danh sách hành động được hỗ trợ

Trong `mouse_action`, các loại `action` có thể dùng như sau:

| Tên hành động (action) | Mô tả | Tham số ví dụ (value) |
| :--- | :--- | :--- |
| `volume_up` | Tăng âm lượng | `5` (nghĩa là +5%) |
| `volume_down` | Giảm âm lượng | `5` (nghĩa là -5%) |
| `volume_set` | Đặt âm lượng cố định | `0` (tắt tiếng) hoặc `100` (tối đa) |
| `volume_mute` | Bật/tắt tiếng | Không cần tham số |
| `seek` | Nhảy tiến trình | `5` (tới) hoặc `-5` (lùi) |
| `toggle_play_pause` | Chuyển phát / tạm dừng | Không cần tham số |
| `speed_up` | Tăng tốc độ phát | `0.25` |
| `speed_down` | Giảm tốc độ phát | `0.25` |
| `speed_set` | Đặt tốc độ phát cố định | `1.0`, `2.0`, v.v. |
| `none` | Không làm gì | Chuyển sự kiện cho trang xử lý như bình thường |

</details>

## 📦 Cài đặt

**Cách 1: Cài userscript một cú nhấp (khuyến nghị, chạy trên mọi trình duyệt phổ biến)**

1. Cài tiện ích trình duyệt [Tampermonkey](https://www.tampermonkey.net/).
2. Truy cập **[trang script trên GreasyFork](https://greasyfork.org/scripts/566499)**.
3. Nhấp nút **«Cài đặt script này»**.

**Cách 2: Tiện ích trình duyệt**

Bản phát hành trên Microsoft Edge Add-ons đang được chuẩn bị. Bạn cũng có thể tải thư mục `extension/` của repo này rồi nạp thủ công từ trang tiện ích của trình duyệt với chế độ nhà phát triển bật.

**Cách 3: Cài userscript thủ công**

1. Tạo «Script mới» trong Tampermonkey.
2. Sao chép và dán toàn bộ nội dung của `SlippyMouse.user.js`.
3. Lưu lại và tận hưởng!

---

*Video nền của bản demo: [Ireland 4K: Nature Relaxation, Cliffs of Moher & Emerald Landscapes](https://www.youtube.com/watch?v=MSSkVk0em2Y) — Scenic 4K by John (giấy phép Creative Commons Ghi công).*
