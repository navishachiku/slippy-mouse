# YouTube Mouse Master

針對高階使用者設計的 YouTube 播放器交互強化腳本。這是一款經過深度優化、零遮擋感且支援高度客製化的 Tampermonkey 腳本。

## ✨ 核心特色

* **多站支援**：同時支援 **YouTube** 與 **B站**（`www.bilibili.com`），兩站的分區與動作行為完全一致。

* **快捷控制**：可於播放器上設置自定義動作分區，對應滑鼠動作，如：點擊、滾輪快捷調整音量、速度、進度等。

* **自定義動作分區**：支援高度客製化的感應區域設定，可自由調整區域大小、位置（預設提供左、中、右三區配置）。

* **零遮擋交互**：放棄傳統的透明層遮蓋，採用高性能座標運算，完全不干擾進度條、按鈕等原生 UI 點擊。

* **自適應滾輪**：任何裝置上「一格滾輪或一次滑動 = 恰好一次動作」——滑鼠滾輪、軌跡板、平滑滾動軟體（Mos、SmoothScroll、Logitech Options+）皆免調校自動適應；慣性尾巴自動抑制，蓄意長滑保持比例響應。

![DEMO SCREENSHOT](./demo.jpeg)

## ⚙️ 可客製化參數

您可以直接在腳本頂部的 `SETTINGS` 與 `CONFIG` 區塊進行調整。

### 全域設定 (Global Settings)

| 參數 | 說明 | 預設值 |
| :--- | :--- | :--- |
| `DEBUG` | 是否於 Console 輸出偵錯訊息 | `false` |
| `ZONE_TOGGLE_KEY` | 切換區域可視化的熱鍵 | `F9` |
| `OSD_DURATION` | OSD 提示在畫面上停留的時間 (ms) | `800` |
| `OSD_FADE_OUT` | OSD 淡出動畫的持續時間 (ms) | `150` |
| `OSD_FONT_SIZE` | OSD 提示文字的字體大小 (支援 px, em, rem 等) | `28px` |
| `ADAPTIVE_WHEEL` | 自適應滾輪：任何裝置上一格/一滑 = 一次動作；設為 `false` 改用下方手動過濾設定 | `true` |
| `WHEEL_STEP` | 自適應模式：每次動作所需的累積滾動量 (px)，調低更靈敏 | `100` |
| `USE_WHEEL_COUNT_FIXED` | 僅手動模式：是否開啟固定滾輪計次過濾 | `false` |
| `WHEEL_DELAY` | 僅手動模式：滾輪事件的防抖延遲時間 (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | 滾輪計次觸發門檻：累積多少次滾輪事件才執行一次動作 | `14` |

### 自定義區域配置 (Custom Zone Configuration)

您可以根據個人需求完全自定義動作分區，調整區域大小與位置。

預設提供左、中、右三區配置：

| 區域 | 滑鼠左鍵 | 滑鼠右鍵 | 滾輪動作 |
| ----- | ----- | ----- | ----- |
| **左側 (音量)** | 最大音量 (100%) | 快速靜音 (0%) | 音量步進 +/- 5% |
| **中間 (進度)** | 放行 (原生播放/暫停) | 放行 (原生選單) | 進度跳轉 +/- 5秒 |
| **右側 (倍速)** | 快速 2.0x | 回復 1.0x | 倍速步進 +/- 0.25x |

### 支援動作列表 (Supported Actions List)

在 `mouse_action` 中，您可以使用的 `action` 類型如下：

| 動作名稱 (action) | 說明 | 參數範例 (value) |
| :--- | :--- | :--- |
| `volume_up` | 增加音量 | `5` (代表增加 5%) |
| `volume_down` | 減少音量 | `5` (代表減少 5%) |
| `volume_set` | 設定固定音量 | `0` (靜音) 或 `100` (最大) |
| `volume_mute` | 切換靜音 / 取消靜音 | 不需要參數 |
| `seek` | 進度跳轉 | `5` (前進) 或 `-5` (後退) |
| `toggle_play_pause` | 切換播放 / 暫停狀態 | 不需要參數 |
| `speed_up` | 增加播放倍速 | `0.25` |
| `speed_down` | 減少播放倍速 | `0.25` |
| `speed_set` | 設定固定播放倍速 | `1.0`, `2.0` 等 |
| `none` | 不執行動作 | 會將事件放行給 YouTube 原生處理 |

## 📦 安裝方式

**方法一：一鍵安裝（推薦）**

1. 安裝瀏覽器擴充功能 [Tampermonkey](https://www.tampermonkey.net/)。
2. 前往 **[GreasyFork 腳本頁面](https://greasyfork.org/en/scripts/566499-youtube-mouse-master)**。
3. 點擊 **「安裝此腳本」** 按鈕。

**方法二：手動安裝**

1. 在 Tampermonkey 中點擊「新建腳本」。
2. 複製 `YouTubeMouseMaster.user.js` 的完整內容並貼上。
3. 儲存後即可使用！