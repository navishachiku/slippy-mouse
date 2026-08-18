# Slippy Mouse

![Slippy Mouse](./docs/images/banner.png)

[English](./README.md) | [简体中文](./docs/zh-sc.md) | [繁體中文](./docs/zh-tc.md) | [Español](./docs/es.md) | [Português](./docs/pt.md) | [Русский](./docs/ru.md) | [日本語](./docs/jp.md) | [Français](./docs/fr.md) | [Deutsch](./docs/de.md) | [Tiếng Việt](./docs/vi.md) | [한국어](./docs/ko.md) | [ไทย](./docs/th.md) | [Italiano](./docs/it.md)

[![Install on GreasyFork](https://img.shields.io/badge/Install%20on-GreasyFork-brightgreen?style=for-the-badge&logo=greasyfork)](https://greasyfork.org/scripts/566499)

A mouse enhancement tool for online video players: the player is divided into three zones, and a **wheel** scroll inside a zone adjusts volume, playback speed, seeking, and more — buttery smooth. No shortcuts to memorize, no hunting for buttons; one easy scroll gets you there. A settings panel lets you customize every wheel and click action.

## ✨ Key Features

* **Multi-Site Support**: Works on both **YouTube** and **Bilibili** (`www.bilibili.com`), with identical zones and actions on each site.

* **Quick Controls**: Set custom action zones on the player that correspond to mouse actions such as clicks and wheel scrolls to quickly adjust volume, speed, progress, etc.

* **Custom Action Zones**: Supports highly customizable sensor zone settings, allowing you to freely adjust zone size and position (default provides Left, Middle, and Right zone configurations).

* **Zero-Overlay Interaction**: Abandons traditional transparent layer overlays and uses high-performance coordinate calculations, ensuring no interference with native UI clicks like progress bars and buttons.

* **Adaptive Wheel**: One physical notch or swipe equals exactly one action on any device — mouse wheels, trackpads, and smooth-scrolling software (Mos, SmoothScroll, Logitech Options+) — with no tuning required. Inertia tails are suppressed and deliberate long swipes stay proportional.

* **Graphical Settings Panel**: Every parameter and zone-action mapping can be adjusted in an in-page panel — changes apply instantly and are stored in the browser, so script updates never wipe your customizations.

![DEMO](./docs/images/demo.webp)

## 🎛️ Settings Panel

No code editing required — click the mouse icon on the player control bar to open the settings panel:

![Settings entry](./docs/images/settings-entry.png)

![Settings Panel](./docs/images/settings-general.png)

* **Four tabs**: General (adaptive wheel, hotkeys, appearance, OSD), Zone Actions, Wheel (adaptive tuning and manual filtering), and Advanced (debug, settings data).
* **Zone action mapping**: Pick a colored zone and assign any action with its value to each trigger (left / right / middle click, wheel up / down):

![Zone Actions](./docs/images/settings-zones.png)

* **Instant apply & persistence**: Changes take effect immediately; "Save" writes them to browser storage — **script updates never wipe your settings**; "Cancel" or Esc reverts.
* **Hotkeys**: Zone overlay defaults to `Alt+Shift+Z`; the panel hotkey is unbound by default. Both are reassignable in the panel with modifier-combo support (Esc cancels capture, Backspace clears).
* **Export / Import / Reset**: Back up settings as a JSON file, move them to another browser, or restore factory defaults in one click.
* **Interface language**: Follows your browser locale, falling back to English; a manual override is available in the panel.
* **Appearance**: Light / dark / auto (follows system preference).

## ⚙️ Customizable Parameters

Every parameter can be adjusted in the settings panel (recommended). You can also edit the `SETTINGS` and `CONFIG` blocks at the top of the script directly, but note that direct script edits are overwritten on script updates, while panel settings are preserved.

<details>
<summary><b>Advanced: full parameter reference</b> (click to expand)</summary>

### Global Settings

| Parameter | Description | Default |
| :--- | :--- | :--- |
| `DEBUG` | Whether to output debug messages to the Console | `false` |
| `ZONE_TOGGLE_KEY` | Hotkey to toggle zone visibility (modifier combos supported) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Hotkey to open the settings panel (main entry is the control-bar button) | Not set |
| `OSD_DURATION` | How long OSD prompts stay on screen (ms) | `800` |
| `OSD_FADE_OUT` | Duration of OSD fade-out animation (ms) | `150` |
| `OSD_FONT_SIZE` | Font size of OSD prompt text (supports px, em, rem, etc.) | `28px` |
| `ADAPTIVE_WHEEL` | Adaptive wheel filtering: one physical notch/swipe = one action on any device. Set to `false` to use the manual filtering settings below | `true` |
| `WHEEL_STEP` | Adaptive mode: accumulated scroll (px) per action; lower it for finer response | `100` |
| `GESTURE_GAP` | Adaptive: silence (ms) after which input counts as a new gesture | `150` |
| `MIN_ACTION_INTERVAL` | Adaptive: minimum ms between two actions; caps burst damage | `80` |
| `IMPULSE_MIN` | Adaptive: minimum impulse travel (px) to settle as one action; filters grazes | `20` |
| `REACCEL_FACTOR` | Adaptive: magnitude jump ratio marking a fresh notch inside a decaying tail | `1.5` |
| `DISCRETE_SETTLE` | Adaptive: settle delay (ms) for bare single-event wheel notches | `60` |
| `USE_WHEEL_COUNT_FIXED` | Manual mode only: whether to enable fixed wheel count filtering | `false` |
| `WHEEL_DELAY` | Manual mode only: debounce delay time for wheel events (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Wheel count trigger threshold: how many wheel events to accumulate before performing an action | `14` |

### Custom Zone Configuration

You can fully customize action zones according to your personal needs, adjusting zone size and position.

Default provides Left, Middle, and Right zone configurations:

| Zone | Left Click | Right Click | Wheel Action |
| ----- | ----- | ----- | ----- |
| **Left (Volume)** | Max Volume (100%) | Quick Mute (0%) | Volume Step +/- 5% |
| **Middle (Progress)** | Pass-through (Native Play/Pause) | Pass-through (Native Menu) | Seek +/- 5s |
| **Right (Speed)** | Quick 2.0x | Reset 1.0x | Speed Step +/- 0.25x |

### Supported Actions List

In `mouse_action`, the `action` types you can use are as follows:

| Action Name (action) | Description | Example Parameter (value) |
| :--- | :--- | :--- |
| `volume_up` | Increase volume | `5` (represents +5%) |
| `volume_down` | Decrease volume | `5` (represents -5%) |
| `volume_set` | Set fixed volume | `0` (Mute) or `100` (Max) |
| `volume_mute` | Toggle mute / unmute | No parameter needed |
| `seek` | Jump progress | `5` (forward) or `-5` (backward) |
| `toggle_play_pause` | Toggle play / pause status | No parameter needed |
| `speed_up` | Increase playback rate | `0.25` |
| `speed_down` | Decrease playback rate | `0.25` |
| `speed_set` | Set fixed playback rate | `1.0`, `2.0`, etc. |
| `none` | Perform no action | Passes the event through to the site's native handling |

</details>

## 📦 Installation

**Method 1: Userscript one-click install (recommended, works in all major browsers)**

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Visit the **[GreasyFork script page](https://greasyfork.org/scripts/566499)**.
3. Click the **"Install this script"** button.

**Method 2: Browser extension**

The Microsoft Edge Add-ons listing is in preparation. You can also download this repo's `extension/` directory and load it manually from your browser's extensions page with Developer Mode enabled.

**Method 3: Manual userscript install**

1. Create a "New Script" in Tampermonkey.
2. Copy and paste the content of `SlippyMouse.user.js`.
3. Save and enjoy!

---

*Demo background footage: [Ireland 4K: Nature Relaxation, Cliffs of Moher & Emerald Landscapes](https://www.youtube.com/watch?v=MSSkVk0em2Y) — Scenic 4K by John (Creative Commons Attribution license).*
