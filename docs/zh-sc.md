# YouTube Mouse Master

针对高阶用户设计的 YouTube 播放器交互强化脚本。这是一款经过深度优化、无遮挡感且支持高度客制化的 Tampermonkey 脚本。

## ✨ 核心特色

* **多站支持**：同时支持 **YouTube** 与 **B站**（`www.bilibili.com`），两站的分区与动作行为完全一致。

* **快捷控制**：可在播放器上设置自定义动作分区，对应鼠标动作，如：点击、滚轮快捷调整音量、速度、进度等。

* **自定义动作分区**：支持高度客制化的感应区域设定，可自由调整区域大小、位置（默认提供左、中、右三区配置）。

* **零遮挡交互**：放弃传统的透明层遮盖，采用高性能坐标运算，完全不干扰进度条、按钮等原生 UI 点击。

* **Mac / 高频滚轮优化**：内建过滤机制，完美适配 MOS、SmoothScroll 或 Mac 轨迹板，防止操作过敏跳动。

![DEMO SCREENSHOT](./demo.jpeg)

## ⚙️ 可客製化参数

您可以直接在脚本顶部的 `SETTINGS` 与 `CONFIG` 区块进行调整。

### 全局设定 (Global Settings)

| 参数 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `DEBUG` | 是否于 Console 输出侦错讯息 | `false` |
| `ZONE_TOGGLE_KEY` | 切换区域可视化的热键 | `F9` |
| `OSD_DURATION` | OSD 提示在画面上停留的时间 (ms) | `800` |
| `OSD_FADE_OUT` | OSD 淡出动画的持续时间 (ms) | `150` |
| `OSD_FONT_SIZE` | OSD 提示文字的字体大小 (支持 px, em, rem 等) | `28px` |
| `USE_WHEEL_COUNT_FIXED` | 是否开启固定滚轮计次过滤 (建议 Mac 用户开启) | `false` |
| `WHEEL_DELAY` | 滚轮事件的防抖延迟时间 (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | 滚轮计次触发门槛：累积多少次滚轮事件才执行一次动作 | `14` |

### 自定义区域配置 (Custom Zone Configuration)

您可以根据个人需求完全自定义动作分区，调整区域大小与位置。

默认提供左、中、右三区配置：

| 区域 | 鼠标左键 | 鼠标右键 | 滚轮动作 |
| ----- | ----- | ----- | ----- |
| **左侧 (音量)** | 最大音量 (100%) | 快速静音 (0%) | 音量步进 +/- 5% |
| **中间 (进度)** | 放行 (原生播放/暂停) | 放行 (原生菜单) | 进度跳转 +/- 5秒 |
| **右侧 (倍数)** | 快速 2.0x | 回复 1.0x | 倍速步进 +/- 0.25x |

### 支持动作列表 (Supported Actions List)

在 `mouse_action` 中，您可以使用的 `action` 类型如下：

| 动作名称 (action) | 说明 | 参数范例 (value) |
| :--- | :--- | :--- |
| `volume_up` | 增加音量 | `5` (代表增加 5%) |
| `volume_down` | 减少音量 | `5` (代表减少 5%) |
| `volume_set` | 设定固定音量 | `0` (静音) 或 `100` (最大) |
| `volume_mute` | 切换静音 / 取消静音 | 不需要参数 |
| `seek` | 进度跳转 | `5` (前进) 或 `-5` (后退) |
| `toggle_play_pause` | 切换播放 / 暂停状态 | 不需要参数 |
| `speed_up` | 增加播放倍速 | `0.25` |
| `speed_down` | 减少播放倍速 | `0.25` |
| `speed_set` | 设定固定播放倍速 | `1.0`, `2.0` 等 |
| `none` | 不执行动作 | 会将事件放行给 YouTube 原生处理 |

## 📦 安装方式

**方法一：一键安装（推荐）**

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)。
2. 前往 **[GreasyFork 脚本页面](https://greasyfork.org/en/scripts/566499-youtube-mouse-master)**。
3. 点击 **“安装此脚本”** 按钮。

**方法二：手动安装**

1. 在 Tampermonkey 中点击“新建脚本”。
2. 复制 `YouTubeMouseMaster.user.js` 的完整内容并粘贴。
3. 保存后即可使用！
