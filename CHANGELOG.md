# Changelog

All notable changes to the **YouTube Mouse Master** project will be documented in this file.

## [0.9.0] - 2026-08-17

### Added
- **In-page Settings Panel**: A graphical panel opened from a mouse icon in the player control bar (YouTube and Bilibili), with four tabs — General, Zone Actions, Wheel, and Advanced. Every parameter and per-zone action mapping is editable with instant preview; saved settings persist in browser storage, so script updates never wipe customizations. Includes JSON export/import, factory reset, light/dark/auto themes with iOS-style controls, and interface localization into 7 languages picked from the browser locale.

### Changed
- **Hotkeys**: Hotkeys now support modifier combinations matched by physical key. The zone overlay default moved from `F9` to `Alt+Shift+Z`; the settings panel hotkey is unbound by default (the control-bar button is the main entry). Hotkeys are ignored while typing in input fields.

## [0.8.0] - 2026-08-16

### Added
- **Adaptive Wheel (`ADAPTIVE_WHEEL`)**: New default wheel filtering that maps one physical notch or swipe to exactly one action on any device — mouse wheels, trackpads, and smooth-scrolling software (Mos, SmoothScroll, Logitech Options+) — with no configuration. The wheel stream is segmented into impulses whose accumulated travel fires one action per `WHEEL_STEP`; inertia and amplifier tails are suppressed, deliberate long swipes stay proportional, and bare macOS wheel notches settle instantly. Set `ADAPTIVE_WHEEL: false` to fall back to the previous manual filtering (`USE_WHEEL_COUNT_FIXED`).

## [0.7.0] - 2026-08-16

### Added
- **Bilibili Support**: The script now also works on `www.bilibili.com` (regular videos and bangumi pages using the bpx player). A site adapter layer wraps Bilibili's raw `<video>` element with the same API surface as the YouTube player, so all zones and actions (volume, seek, speed, play/pause) work identically on both sites.

### Fixed
- **Wheel Crash**: Wheel events outside any zone (e.g. over blacklisted native UI) no longer throw a `TypeError` from destructuring a null zone result.
- **Early Injection**: Guarded the `MutationObserver` setup against `document.body` not existing yet at `document-start`.

## [0.6.0] - 2026-02-19

### Fixed
- **Shorts Scrolling**: Prevented video navigation from triggering when scrolling inside the comments section or engagement panels. 
- **OSD Glow**: Fixed the glow effect on OSD text.

### Changed
- **Event Penetration**: Improved event handling to ensure mouse wheel events inside zones do not trigger default page scrolling on Shorts.

## [0.5.0] - 2026-02-17

### Added
- **Code Quality**: Added comprehensive JSDoc comments to all functions for better maintainability.
- **Performance**: Added debounce to window resize listeners to improve performance.

## [0.4.0] - 2026-02-17

### Added
- **Shorts Navigation**: Implemented scroll-based navigation for YouTube Shorts. Scrolling outside of configured zones now simulates `ArrowUp`/`ArrowDown` keys to switch between videos.
- **Dynamic Shorts Monitoring**: Added an intelligent monitoring system (`zoneMonitorInterval`) to track the active Shorts player position, ensuring OSD and debug zones stay aligned during scrolling and video switching.

### Fixed
- **Shorts OSD Positioning**: Fixed an issue where the On-Screen Display (OSD) and Debug Zones were misaligned on Shorts. They now dynamically anchor to the active `ytd-reel-video-renderer` element.
- **Visual Drift**: Resolved a bug where debug zones would detach or drift from the video element when switching Shorts.
- **Z-Index Layering**: Updated OSD construction to attach directly to `document.body` with maximum z-index (`2147483647`) in Shorts mode to prevent being obscured by native overlays.

### Changed
- Refactored `updateZoneVisuals` and `showOSD` to use a shared `findActiveShortsRenderer` helper for consistent player detection.
- Added a 250ms debounce to the Shorts navigation scroll to prevent accidental multi-video skipping.

## [0.3.0] - 2026-02-16

### Added
- **Shorts Support**: Extended core functionality to support the YouTube Shorts player (`ytd-shorts`).
- **Zone Control for Shorts**: Enabled the 3-zone control system (Volume, Speed, Seek) within the Shorts interface.

### Fixed
- **Event Penetration**: Improved event handling to ensure mouse wheel events inside zones do not trigger default page scrolling on Shorts.

## [0.2.0] - 2026-02-15

### Fixed
- **Overlay Detection**: Refined the `getTargetZone` logic to correctly distinguish between the main player, mini-player, and other UI layers.
- **Native UI Conflicts**: Added checks to prevent the script from overriding interactions on native YouTube elements (e.g., settings menu, share buttons, ad overlays).

## [0.1.0] - 2026-02-14

### Added
- **Core Functionality**: Initial release of YouTube Mouse Master.
- **Three-Zone Control**: implemented the default left (Volume), middle (Seek), and right (Speed) interaction zones.
- **Visual OSD**: Added immediate On-Screen Display feedback for all actions (Volume %, Speed x, Time).
- **Customizability**: Exposed detailed configuration object (`CONFIG`) for customizing zone sizes, colors, and actions.
- **Wheel Filtering**: Implemented "Smooth Scroll" compatibility mode and wheel count thresholds (`USE_WHEEL_COUNT_FIXED`).
