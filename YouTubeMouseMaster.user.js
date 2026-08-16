// ==UserScript==
// @name         YouTube Mouse Master
// @namespace    https://github.com/navishachiku/youtube-mouse-master
// @version      0.7
// @description  High-performance YouTube & Bilibili player interaction script: support three-zone control, progress seek, prevent event penetration, high-frequency wheel filtering, and fix OSD timer conflicts.
// @author       navishachiku & Gemini
// @match        *://www.youtube.com/*
// @match        *://www.bilibili.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    /**
     * [Global Settings] SETTINGS
     * Centralized management of script behavior parameters
     */
    const SETTINGS = {
        DEBUG: false,                  // Whether to output debug messages to the console
        ZONE_TOGGLE_KEY: 'F9',         // Hotkey to toggle zone visibility

        // OSD prompt settings
        OSD_DURATION: 800,             // Time OSD prompt stays on screen (ms)
        OSD_FADE_OUT: 150,             // Duration of OSD fade-out animation (ms)
        OSD_FONT_SIZE: '28px',         // Font size of OSD prompt text (supports px, em, rem, etc.)

        // Wheel filtering settings
        // ADAPTIVE_WHEEL (自適應滾輪): one physical notch or swipe maps to one
        // action regardless of device or smoothing software (trackpads, Mos,
        // SmoothScroll, Logitech Options+), with no configuration needed.
        // Set to false to fall back to manual filtering via USE_WHEEL_COUNT_FIXED.
        ADAPTIVE_WHEEL: true,

        // Adaptive tuning (only used when ADAPTIVE_WHEEL is true)
        WHEEL_STEP: 100,               // Accumulated scroll (normalized px) per action; one wheel notch ~ 100-120
        GESTURE_GAP: 150,              // Silence (ms) after which input counts as a new gesture
        MIN_ACTION_INTERVAL: 80,       // Minimum ms between two fired actions (caps burst damage)
        IMPULSE_MIN: 20,               // Minimum impulse travel (px) to settle as one action; filters accidental grazes
        REACCEL_FACTOR: 1.5,           // Magnitude jump ratio that marks a fresh notch inside a decaying tail
        DISCRETE_SETTLE: 60,           // Settle delay (ms) for 1-2 event impulses (bare wheel notch without smoothing)

        // Manual filtering (only used when ADAPTIVE_WHEEL is false)
        // If you are using Mac/MOS/Trackpad or software like Smooth Scroll (Mos, Logitech Options+), set USE_WHEEL_COUNT_FIXED to true
        USE_WHEEL_COUNT_FIXED: false,  // Whether to enable fixed wheel count filtering
        WHEEL_DELAY: 1,                // Debounce delay time for wheel events (ms)
        WHEEL_COUNT_THRESHOLD: 14,     // Wheel count trigger threshold: how many wheel events to accumulate before performing an action
    };

    /**
     * [Configuration] CONFIG
     * Define interaction zones and actions inside the player
     */
    const CONFIG = [
        // Default configuration, you can modify it as you like
        {
            name: "Left Area",
            color: "rgba(255, 0, 0, 0.2)", // Red: Volume area
            size: { width: "30%", height: "100%" },
            offset: { x: "0%", y: "0%" },
            mouse_action: {
                left_click: { action: "volume_set", value: 100 },   // Left click: Volume 100
                right_click: { action: "volume_set", value: 0 },    // Right click: Volume 0
                middle_click: { action: "none" },                   // Pass-through
                wheel_up: { action: "volume_up", value: 5 },        // Wheel up: Volume +5%
                wheel_down: { action: "volume_down", value: 5 }     // Wheel down: Volume -5%
            }
        },
        {
            name: "Middle Area",
            color: "rgba(0, 255, 0, 0.2)", // Green: Progress area
            size: { width: "40%", height: "100%" },
            offset: { x: "30%", y: "0%" },
            mouse_action: {
                left_click: { action: "none" },                   // Pass-through
                right_click: { action: "none" },                  // Pass-through
                middle_click: { action: "none" },                 // Pass-through
                wheel_up: { action: "seek", value: -5 },          // Wheel up: Seek back 5s
                wheel_down: { action: "seek", value: 5 }          // Wheel down: Seek forward 5s
            }
        },
        {
            name: "Right Area",
            color: "rgba(0, 0, 255, 0.2)", // Blue: Speed area
            size: { width: "30%", height: "100%" },
            offset: { x: "70%", y: "0%" },
            mouse_action: {
                left_click: { action: "speed_set", value: 1.0 },    // Left click: 1x
                right_click: { action: "speed_set", value: 2.0 },   // Right click: 2x
                middle_click: { action: "none" },                   // Pass-through
                wheel_up: { action: "speed_up", value: 0.25 },      // Wheel up: Speed +0.25x
                wheel_down: { action: "speed_down", value: 0.25 }   // Wheel down: Speed -0.25x
            }
        }
    ];

    /**
     * Log debug messages to the console if debugging is enabled.
     *
     * @param {...any} args The messages or objects to log.
     */
    function log(...args) {
        if (SETTINGS.DEBUG) console.log('[YTM Debug]', ...args);
    }

    /**
     * [Site Adapter]
     * Site-specific selectors and player API resolution.
     * YouTube exposes a rich player API directly on the #movie_player element.
     * Bilibili's bpx player exposes no public API on the DOM, so its raw
     * <video> element is wrapped in a shim providing the same API surface
     * consumed by Actions.
     */
    const SITE = location.hostname.endsWith('bilibili.com') ? 'bilibili' : 'youtube';

    const videoShims = new WeakMap();

    /**
     * Wrap a raw HTMLVideoElement with a YouTube-player-like API.
     *
     * @param {HTMLVideoElement} video The video element to wrap.
     *
     * @returns {Object} An object exposing the subset of the YouTube player API used by Actions.
     */
    function wrapVideoElement(video) {
        let shim = videoShims.get(video);
        if (!shim) {
            shim = {
                getVolume: () => Math.round(video.volume * 100),
                setVolume: (v) => { video.volume = Math.min(100, Math.max(0, v)) / 100; },
                isMuted: () => video.muted,
                unMute: () => { video.muted = false; },
                getCurrentTime: () => video.currentTime,
                getDuration: () => video.duration || 0,
                seekTo: (t) => { video.currentTime = t; },
                getPlayerState: () => (video.paused ? 2 : 1),
                playVideo: () => video.play(),
                pauseVideo: () => video.pause(),
                getPlaybackRate: () => video.playbackRate,
                setPlaybackRate: (r) => { video.playbackRate = r; }
            };
            videoShims.set(video, shim);
        }
        return shim;
    }

    const ADAPTERS = {
        youtube: {
            // 1. #movie_player (Normal - old)
            // 2. ytd-player (Normal Wrapper - Better capture)
            // 3. .html5-video-player (Fallback)
            playerSelector: '#movie_player, ytd-player, .html5-video-player',
            // Native UI elements (Buttons, Sliders, Links) that MUST function natively
            uiBlacklist: 'button, a, .ytp-progress-bar-container, .ytp-volume-panel, .ytp-settings-menu, .ytp-popup, .ytp-chrome-bottom',
            resolveVisualPlayer(boundEl) {
                // If bound to a wrapper (Shorts or Normal), dig down to the actual video player for sizing
                const tag = boundEl.tagName.toLowerCase();
                if (tag === 'ytd-reel-video-renderer' || tag === 'ytd-player') {
                    const inner = boundEl.querySelector('.html5-video-player');
                    if (inner) return inner;
                }
                return boundEl;
            },
            getAPIPlayer(element) {
                // 1. Check if the element itself has the API
                if (element && typeof element.getVolume === 'function') {
                    return element;
                }
                // 2. Check for the global movie_player (most reliable for Normal videos and centralized Shorts)
                const globalPlayer = document.getElementById('movie_player');
                if (globalPlayer && typeof globalPlayer.getVolume === 'function') {
                    return globalPlayer;
                }
                // 3. Try to find closest ytd-player (sometimes holds the API in complex layouts)
                if (element) {
                    const wrapper = element.closest('ytd-player');
                    if (wrapper && typeof wrapper.getVolume === 'function') {
                        return wrapper;
                    }
                }
                return null;
            }
        },
        bilibili: {
            playerSelector: '#bilibili-player, .bpx-player-container',
            uiBlacklist: 'button, a, input, .bpx-player-control-wrap, .bpx-player-top-wrap, .bpx-player-sending-area, .bpx-player-ctx-menu, .bpx-player-dialog-wrap, .bpx-player-toast-wrap',
            resolveVisualPlayer(boundEl) {
                // Exclude the danmaku sending bar below the video from zone coordinates
                return boundEl.querySelector('.bpx-player-video-area') || boundEl;
            },
            getAPIPlayer(element) {
                const container = (element && element.closest('#bilibili-player, .bpx-player-container')) || element;
                const video = (container && container.querySelector('video'))
                    || document.querySelector('#bilibili-player video, .bpx-player-container video');
                return video ? wrapVideoElement(video) : null;
            }
        }
    };

    const ADAPTER = ADAPTERS[SITE];

    log('Script loaded, preparing for initialization...');

    // State variables
    let lastWheelTime = 0;
    let wheelCount = 0;

    // Adaptive wheel filter state (WHEEL_MODE: 'auto')
    const wheelState = {
        accum: 0,          // accumulated scroll distance toward the next action
        fired: 0,          // actions fired within the current impulse
        events: 0,         // wheel events seen within the current impulse
        lastTime: 0,       // timestamp of the previous wheel event
        lastDir: 0,        // sign of the previous deltaY
        lastMag: 0,        // magnitude of the previous deltaY
        peakMag: 0,        // largest magnitude seen in the current impulse
        decaying: false,   // true while the stream looks like a decay tail
        lastActionTime: 0, // timestamp of the last fired action
        history: [],       // recent magnitudes, for decay detection
        flushTimer: null   // pending end-of-impulse settlement
    };

    /**
     * Reset per-impulse state (accumulator, decay tracking).
     *
     * @param {Object} s The wheel filter state.
     */
    function resetImpulse(s) {
        s.accum = 0;
        s.fired = 0;
        s.events = 0;
        s.peakMag = 0;
        s.decaying = false;
        s.history = [];
    }

    /**
     * Whether a finished impulse should settle as one action.
     * A dense stream (trackpad, smooth-scroll interpolation) needs IMPULSE_MIN
     * of travel; a 1-2 event impulse is a bare wheel notch, which is
     * unambiguous intent no matter how small macOS scroll acceleration made
     * its delta — only sub-3px noise is discarded.
     *
     * @param {Object} s The wheel filter state.
     *
     * @returns {boolean} True if the impulse qualifies.
     */
    function impulseQualifies(s) {
        if (s.fired !== 0) return false;
        return s.accum >= SETTINGS.IMPULSE_MIN || (s.events <= 2 && s.accum >= 3);
    }

    /**
     * Settle a finished impulse: if it accumulated meaningful travel but never
     * reached a full step, it still represents one intentional notch — fire once.
     *
     * @param {Object} s The wheel filter state.
     * @param {Function} fire Callback that performs the pending action.
     */
    function settleImpulse(s, fire) {
        const now = performance.now();
        if (impulseQualifies(s) && now - s.lastActionTime >= SETTINGS.MIN_ACTION_INTERVAL) {
            s.lastActionTime = now;
            fire();
        }
    }

    /**
     * Normalize a wheel event's deltaY to pixels regardless of deltaMode.
     *
     * @param {WheelEvent} e The wheel event.
     *
     * @returns {number} The delta in approximate pixels.
     */
    function normalizeWheelDelta(e) {
        if (e.deltaMode === 1) return e.deltaY * 20;   // lines
        if (e.deltaMode === 2) return e.deltaY * 800;  // pages
        return e.deltaY;
    }

    /**
     * Adaptive wheel filter: decide when this impulse should fire actions.
     *
     * Device-agnostic by design: instead of counting events, it accumulates
     * scroll distance and fires once per WHEEL_STEP of travel, so smooth-scroll
     * interpolation (many small deltas, same total) collapses back to one notch.
     * The stream is segmented into impulses (one notch or one swipe): a pause
     * longer than GESTURE_GAP, a direction change, or a magnitude jump inside a
     * decaying tail (a fresh notch landing on the previous notch's tail) all
     * start a new impulse. Interpolated notches are decaying curves, so an
     * impulse that ends below a full step but above IMPULSE_MIN still settles
     * as exactly one action — one physical notch is one step regardless of the
     * distance the smoothing software assigns to it.
     * Two guards bound the damage from delta-amplifying software and macOS
     * momentum, which the web platform cannot expose directly (no momentumPhase
     * equivalent on WheelEvent):
     *   1. Decay suppression: once an impulse has fired, its decaying tail
     *      stops accumulating, so inertia cannot queue extra actions.
     *   2. Rate limit: at most one action per MIN_ACTION_INTERVAL ms, and the
     *      accumulator is clamped so a burst can never bank future actions.
     *
     * @param {WheelEvent} e The wheel event.
     * @param {Function} fire Callback that performs the zone action; invoked
     *   synchronously on step crossings or deferred for end-of-impulse settling.
     */
    function autoWheelFilter(e, fire) {
        const now = performance.now();
        const d = normalizeWheelDelta(e);
        const dir = d > 0 ? 1 : -1;
        const mag = Math.abs(d);
        const s = wheelState;

        clearTimeout(s.flushTimer);

        if (now - s.lastTime > SETTINGS.GESTURE_GAP || dir !== s.lastDir) {
            // Pause or reversal: the previous impulse was already settled by the
            // flush timer (or is being abandoned on reversal)
            resetImpulse(s);
        } else if (s.decaying && mag > s.lastMag * SETTINGS.REACCEL_FACTOR) {
            // Fresh notch landed inside the previous notch's decaying tail
            settleImpulse(s, fire);
            resetImpulse(s);
        }
        s.lastTime = now;
        s.lastDir = dir;
        s.lastMag = mag;
        s.events++;

        s.history.push(mag);
        if (s.history.length > 4) s.history.shift();
        if (mag > s.peakMag) s.peakMag = mag;

        if (!s.decaying && s.history.length >= 3) {
            let nonIncreasing = true;
            for (let i = 1; i < s.history.length; i++) {
                if (s.history[i] > s.history[i - 1]) { nonIncreasing = false; break; }
            }
            // The 0.8 factor keeps steady equal-delta streams (trackpad plateau) alive
            if (nonIncreasing && mag < s.peakMag * 0.8) s.decaying = true;
        }

        // A decay tail only stops accumulating once this impulse has fired;
        // before that, the tail is the body of an interpolated notch and counts
        if (!(s.decaying && s.fired > 0)) {
            s.accum += mag;
        }

        if (s.accum >= SETTINGS.WHEEL_STEP) {
            if (now - s.lastActionTime >= SETTINGS.MIN_ACTION_INTERVAL) {
                s.accum -= SETTINGS.WHEEL_STEP;
                // One oversized event may fire at most one action
                s.accum = Math.min(s.accum, SETTINGS.WHEEL_STEP - 1);
                s.fired++;
                s.lastActionTime = now;
                fire();
            } else {
                // Rate limited: hold at one pending step so a burst cannot bank actions
                s.accum = SETTINGS.WHEEL_STEP;
            }
        }

        // Arm end-of-impulse settlement for sub-step impulses. Bare notches
        // (1-2 events) settle fast; a dense stream would re-arm within ~16ms
        // anyway, so the short delay only ever elapses in silence.
        if (impulseQualifies(s)) {
            s.flushTimer = setTimeout(() => {
                settleImpulse(s, fire);
                resetImpulse(s);
            }, s.events <= 2 ? SETTINGS.DISCRETE_SETTLE : SETTINGS.GESTURE_GAP);
        }
    }
    
    // Visual player element (DOM) — used for OSD attachment and zone visuals
    let player = null;

    // Player control interface — YouTube API element, or a wrapped <video> shim on Bilibili
    let api = null;

    let osdTimer = null;      // Timer for handling fade-out
    let osdHideTimer = null;  // Timer for handling display: none
    let isZonesVisible = false; // Controls visibility of the debug zones

    // --- Helper functions ---

    /**
     * Parse a coordinate value which might be a percentage string or a number.
     * 
     * @param {string|number} val The coordinate value (e.g., "50%", 0.5).
     * @param {number} total The total size of the container (used for relative calculations).
     * 
     * @returns {number} The parsed coordinate as a decimal ratio (0 to 1).
     */
    const parseCoord = (val, total) => {
        if (typeof val === 'string' && val.includes('%')) {
            return parseFloat(val) / 100;
        }
        return parseFloat(val) / total;
    };

    /**
     * Format seconds into a time string (mm:ss or hh:mm:ss).
     * 
     * @param {number} seconds The time in seconds.
     * 
     * @returns {string} The formatted time string.
     */
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
        if (h > 0) parts.unshift(h.toString());
        return parts.join(':');
    };

    /**
     * Create or retrieve the OSD (On-Screen Display) element.
     * 
     * @returns {HTMLElement} The OSD DOM element.
     */
    const createOSD = () => {
        let el = document.getElementById('yt-mouse-master-osd');
        if (!el) {
            el = document.createElement('div');
            el.id = 'yt-mouse-master-osd';
            Object.assign(el.style, {
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: SETTINGS.OSD_FONT_SIZE,
                fontWeight: 'bold',
                zIndex: '2147483647',
                pointerEvents: 'none',
                display: 'none',
                fontFamily: 'Roboto, Arial, sans-serif',
                transition: `opacity ${SETTINGS.OSD_FADE_OUT / 1000}s ease`,
                whiteSpace: 'nowrap',
                textShadow: '0 0 12px rgba(255, 255, 255, 0.5)' // Glow for emoji visibility
            });
            // Init in body, will be moved by showOSD
            document.body.appendChild(el);
        } else {
            // If already exists but settings changed, sync font size
            el.style.fontSize = SETTINGS.OSD_FONT_SIZE;
        }
        return el;
    };

    /**
     * Find the active Shorts video renderer currently visible in the viewport.
     * 
     * @returns {HTMLElement|null} The active 'ytd-reel-video-renderer' element or null if none found.
     */
    const findActiveShortsRenderer = () => {
        const renderers = document.querySelectorAll('ytd-reel-video-renderer');
        let best = null;
        let minDist = Infinity;
        const viewportCenterY = window.innerHeight / 2;

        for (const r of renderers) {
            const rect = r.getBoundingClientRect();
            // Ignore invisible or completely off-screen elements
            if (rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) continue;

            const centerY = rect.top + rect.height / 2;
            const dist = Math.abs(centerY - viewportCenterY);

            if (dist < minDist) {
                minDist = dist;
                best = r;
            }
        }
        return best;
    };

    /**
     * Display the OSD with the specified text.
     * Handles positioning for both normal player and Shorts player.
     * 
     * @param {string} text The message to display on the OSD.
     */
    const showOSD = (text) => {
        const el = createOSD();
        const isShorts = window.location.pathname.startsWith('/shorts/');

        if (isShorts) {
            // For Shorts: Attach to body with fixed positioning
            if (el.parentElement !== document.body) {
                document.body.appendChild(el);
            }

            // Find the active renderer to center the OSD on the video, not the window
            // Use current player if it seems valid (inside a visible renderer), otherwise search
            let targetRect = null;
            
            if (player && player.closest('ytd-reel-video-renderer')) {
                 const rect = player.getBoundingClientRect();
                 if (rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
                     targetRect = rect;
                 }
            }
            
            if (!targetRect) {
                const renderer = findActiveShortsRenderer();
                if (renderer) targetRect = renderer.getBoundingClientRect();
            }

            if (targetRect) {
                Object.assign(el.style, {
                    position: 'fixed',
                    top: `${targetRect.top + targetRect.height * 0.2}px`, // 20% from top of video
                    left: `${targetRect.left + targetRect.width / 2}px`,  // Center horizontally relative to video
                    transform: 'translate(-50%, -50%)',
                    zIndex: '2147483647'
                });
            } else {
                // Fallback to window center
                Object.assign(el.style, {
                    position: 'fixed',
                    top: '25%', 
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '2147483647'
                });
            }
        } else {
            // For Normal Player: Attach to player to support Fullscreen mode
            if (player && el.parentElement !== player) {
                player.appendChild(el);
            }
            Object.assign(el.style, {
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: '2147483647'
            });
        }

        el.textContent = text;

        clearTimeout(osdTimer);
        clearTimeout(osdHideTimer);

        el.style.display = 'block';
        el.style.opacity = '1';

        // Start fade-out sequence
        osdTimer = setTimeout(() => {
            el.style.opacity = '0';
            // Start hide sequence
            osdHideTimer = setTimeout(() => {
                el.style.display = 'none';
            }, SETTINGS.OSD_FADE_OUT);
        }, SETTINGS.OSD_DURATION);
    };

    let zoneMonitorInterval = null;

    /**
     * Update or redraw the debug zone visuals.
     * Manages overlay creation, positioning, and monitoring loop for Shorts.
     */
    function updateZoneVisuals() {
        // Remove existing zones
        document.querySelectorAll('.ytm-debug-zone').forEach(el => el.remove());
        document.querySelectorAll('.ytm-debug-overlay-container').forEach(el => el.remove());

        if (!isZonesVisible) {
            if (zoneMonitorInterval) {
                clearInterval(zoneMonitorInterval);
                zoneMonitorInterval = null;
            }
            return;
        }

        // Determine player and context
        const isShorts = window.location.pathname.startsWith('/shorts/');
        let activePlayer = player;

        if (isShorts) {
             const renderer = findActiveShortsRenderer();
             if (renderer) {
                 const p = renderer.querySelector('.html5-video-player');
                 if (p) activePlayer = p;
             }
             
             // Setup shorts monitoring if not already running
             if (!zoneMonitorInterval) {
                 zoneMonitorInterval = setInterval(() => {
                     const currentRenderer = findActiveShortsRenderer();
                     if (!currentRenderer) return;
                     
                     const currentP = currentRenderer.querySelector('.html5-video-player');
                     const overlay = document.querySelector('.ytm-debug-overlay-container');
                     
                     // Check if active player changed or overlay drifted
                     let needsUpdate = false;
                     if (currentP && currentP !== player) {
                         player = currentP;
                         needsUpdate = true;
                     }
                     
                     if (overlay && currentP) {
                         const rect = currentP.getBoundingClientRect();
                         const overlayRect = overlay.getBoundingClientRect();
                         // Tolerance of 2px
                         if (Math.abs(rect.top - overlayRect.top) > 2 || Math.abs(rect.left - overlayRect.left) > 2) {
                             needsUpdate = true;
                         }
                     } else if (!overlay) {
                         needsUpdate = true;
                     }

                     if (needsUpdate) {
                         updateZoneVisuals();
                     }
                 }, 500); // Check every 500ms
             }
        } else {
             // Not shorts, stop monitoring
             if (zoneMonitorInterval) {
                 clearInterval(zoneMonitorInterval);
                 zoneMonitorInterval = null;
             }
        }

        // Update global player reference
        if (activePlayer && activePlayer !== player) player = activePlayer;

        if (!player) return;

        let container = player;
        
        // Setup container based on player type
        if (isShorts) {
            // For Shorts: Create a temporary overlay matched to player rect
            const rect = player.getBoundingClientRect();
            container = document.createElement('div');
            container.className = 'ytm-debug-overlay-container';
            Object.assign(container.style, {
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: '2147483646', // Below OSD but above everything else
                pointerEvents: 'none'
            });
            document.body.appendChild(container); // Attach to body to escape staking contexts
        }

        // Helper: Convert action config to readable label
        const getActionLabel = (type, config) => {
            if (!config || config.action === 'none') return null;
            
            let icon = '';
            let label = '';

            // Icon Mapping
            if (type === 'left_click') icon = '🖱️L';
            else if (type === 'right_click') icon = '🖱️R';
            else if (type === 'middle_click') icon = '🖱️M';
            else if (type === 'wheel_up') icon = '🔼';
            else if (type === 'wheel_down') icon = '🔽';

            // Action Mapping
            switch (config.action) {
                case 'volume_set': 
                    label = config.value === 0 ? 'Mute' : `Vol ${config.value}%`; break;
                case 'volume_up': label = `Vol +${config.value}%`; break;
                case 'volume_down': label = `Vol -${config.value}%`; break;
                case 'seek': 
                    label = config.value > 0 ? `Forward ${config.value}s` : `Back ${Math.abs(config.value)}s`; break;
                case 'toggle_play_pause': label = 'Play/Pause'; break;
                case 'speed_set': label = `Speed ${config.value}x`; break;
                case 'speed_up': label = `Speed +${config.value}`; break;
                case 'speed_down': label = `Speed -${config.value}`; break;
                default: label = config.action;
            }

            return { icon, label };
        };

        CONFIG.forEach(zone => {
            const visual = document.createElement('div');
            visual.className = 'ytm-debug-zone';
            Object.assign(visual.style, {
                position: 'absolute',
                left: zone.offset.x,
                top: zone.offset.y,
                width: zone.size.width,
                height: zone.size.height,
                backgroundColor: zone.color || 'rgba(255, 255, 0, 0.2)',
                border: '1px dashed rgba(255,255,255,0.4)',
                boxSizing: 'border-box',
                zIndex: '2147483646',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '13px',
                fontFamily: 'Consolas, monospace, sans-serif',
                overflow: 'hidden',
                padding: '10px'
            });

            // Container for action list
            const infoBox = document.createElement('div');
            Object.assign(infoBox.style, {
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(3px)',
                padding: '8px 12px',
                borderRadius: '8px',
                textAlign: 'left',
                boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                minWidth: '140px'
            });

            // Title
            const title = document.createElement('div');
            title.textContent = zone.name;
            Object.assign(title.style, {
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '6px',
                borderBottom: '1px solid rgba(255,255,255,0.3)',
                paddingBottom: '4px',
                fontSize: '14px',
                color: '#ffeb3b' // Yellow highlight title
            });
            infoBox.appendChild(title);

            // Action Items
            const actionsToDisplay = ['left_click', 'right_click', 'middle_click', 'wheel_up', 'wheel_down'];
            actionsToDisplay.forEach(key => {
                const info = getActionLabel(key, zone.mouse_action[key]);
                if (info) {
                    const row = document.createElement('div');
                    Object.assign(row.style, {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px',
                        fontSize: '12px'
                    });
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.textContent = info.icon;
                    iconSpan.style.opacity = '0.8';
                    iconSpan.style.marginRight = '10px';

                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = info.label;
                    labelSpan.style.fontWeight = '500';

                    row.appendChild(iconSpan);
                    row.appendChild(labelSpan);
                    infoBox.appendChild(row);
                }
            });

            visual.appendChild(infoBox);
            container.appendChild(visual);
        });
    }

    /**
     * [Actions] Actions
     * Implementation of specific interaction behaviors
     */
    const Actions = {
        volume_up: (val) => {
            if (!api || typeof api.getVolume !== 'function') return;
            const next = Math.min(100, api.getVolume() + val);
            api.setVolume(next);
            if (api.isMuted && api.isMuted()) api.unMute();
            showOSD(`🔊 ${next}%`);
        },
        volume_down: (val) => {
            if (!api || typeof api.getVolume !== 'function') return;
            const next = Math.max(0, api.getVolume() - val);
            api.setVolume(next);
            showOSD(`🔊 ${next}%`);
        },
        volume_set: (val) => {
            if (!api || typeof api.setVolume !== 'function') return;
            api.setVolume(val);
            if (api.isMuted && api.isMuted() && val > 0) api.unMute();
            showOSD(val === 0 ? `🔊 Mute` : `🔊 ${val}%`);
        },
        seek: (delta) => {
            if (!api || typeof api.getCurrentTime !== 'function' || typeof api.getDuration !== 'function') return;
            const current = api.getCurrentTime();
            const duration = api.getDuration();
            const next = Math.max(0, Math.min(duration, current + delta));
            api.seekTo(next, true);
            showOSD(`${delta > 0 ? '⏩' : '⏪'} ${formatTime(next)} / ${formatTime(duration)}`);
        },
        toggle_play_pause: () => {
            if (!api || typeof api.getPlayerState !== 'function') return;
            const state = api.getPlayerState();
            if (state === 1) {
                api.pauseVideo();
                showOSD('⏸️');
            } else {
                api.playVideo();
                showOSD('▶️');
            }
        },
        speed_up: (val) => {
            if (!api || typeof api.getPlaybackRate !== 'function') return;
            const next = api.getPlaybackRate() + val;
            api.setPlaybackRate(next);
            showOSD(`🚀 ${next.toFixed(2)}x`);
        },
        speed_down: (val) => {
            if (!api || typeof api.getPlaybackRate !== 'function') return;
            const next = Math.max(0.25, api.getPlaybackRate() - val);
            api.setPlaybackRate(next);
            showOSD(`🐢 ${next.toFixed(2)}x`);
        },
        speed_set: (val) => {
            if (!api || typeof api.setPlaybackRate !== 'function') return;
            api.setPlaybackRate(val);
            showOSD(`🐾 ${val.toFixed(2)}x`);
        },
        none: () => {}
    };

    // Registry to track which elements we've already bound to
    const boundElements = new WeakSet();

    /**
     * Determine which interaction zone (if any) contains the mouse event.
     * 
     * @param {Event} e The mouse or wheel event.
     * @param {HTMLElement} boundEl The element that triggered the listener (could be renderer or player).
     * 
     * @returns {{zone: Object, player: HTMLElement}|null} The target zone and associated player, or null.
     */
    function getTargetZone(e, boundEl) {
        const target = e.target;

        // 1. Blacklist: Exclude Native UI elements (Buttons, Sliders, Links)
        // Kept purely for interactive elements that MUST function natively
        if (target.closest(ADAPTER.uiBlacklist)) {
            return null;
        }

        // 2. Identify the true Visual Player (for coordinates)
        const visualPlayer = ADAPTER.resolveVisualPlayer(boundEl);

        // 3. Coordinate Calculation
        const rect = visualPlayer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;

        const mouseX = (e.clientX - rect.left) / rect.width;
        const mouseY = (e.clientY - rect.top) / rect.height;

        // Check if mouse is strictly strictly inside the visual player area
        if (mouseX < 0 || mouseX > 1 || mouseY < 0 || mouseY > 1) {
             return null;
        }

        for (const zone of CONFIG) {
            const zX = parseCoord(zone.offset.x, 1);
            const zY = parseCoord(zone.offset.y, 1);
            const zW = parseCoord(zone.size.width, 1);
            const zH = parseCoord(zone.size.height, 1);

            if (mouseX >= zX && mouseX <= (zX + zW) && mouseY >= zY && mouseY <= (zY + zH)) {
                return { zone, player: visualPlayer }; // Return the inner player for API calls
            }
        }
        return null;
    }

    /**
     * Handle mouse wheel events.
     * 
     * @param {WheelEvent} e The wheel event.
     */
    function onWheel(e) {
        const result = getTargetZone(e, e.currentTarget);
        if (!result) return;

        const { zone, player: visualElement } = result;

        e.preventDefault();
        e.stopImmediatePropagation();

        // --- Controller Resolution ---
        // Find the actual API object to control
        const apiPlayer = ADAPTER.getAPIPlayer(visualElement);
        if (!apiPlayer) {
            log('[Error] Zone matched but NO API PLAYER found!');
            return;
        }

        player = visualElement;
        api = apiPlayer;

        const actionKey = e.deltaY < 0 ? 'wheel_up' : 'wheel_down';
        const cfg = zone.mouse_action[actionKey];
        if (!cfg || !Actions[cfg.action]) return;

        const doAction = () => {
            // log(`[Action] Wheel trigger: ${cfg.action}`);
            Actions[cfg.action](cfg.value);
            if (api.showControls) api.showControls();
        };

        if (SETTINGS.ADAPTIVE_WHEEL) {
            autoWheelFilter(e, doAction);
        } else if (SETTINGS.USE_WHEEL_COUNT_FIXED) {
            wheelCount++;
            if (wheelCount < SETTINGS.WHEEL_COUNT_THRESHOLD) {
                // console.log('[YTM Debug] Throttled by Count:', wheelCount);
                return;
            }
            wheelCount = 0;
            doAction();
        } else {
            const now = Date.now();
            if (now - lastWheelTime < SETTINGS.WHEEL_DELAY) {
                // console.log('[YTM Debug] Throttled by Time');
                return;
            }
            lastWheelTime = now;
            doAction();
        }
    }

    /**
     * Handle mouse click/down/contextmenu events.
     * 
     * @param {MouseEvent} e The mouse event.
     */
    function onMouse(e) {
        const result = getTargetZone(e, e.currentTarget);
        if (!result) return;

        const { zone, player: visualElement } = result;

        const apiPlayer = ADAPTER.getAPIPlayer(visualElement);
        if (apiPlayer) {
            player = visualElement;
            api = apiPlayer;
        }

        let actionKey = "";
        if (e.button === 0) actionKey = 'left_click';
        else if (e.button === 1) actionKey = 'middle_click';
        else if (e.type === 'contextmenu') actionKey = 'right_click';

        const cfg = zone.mouse_action[actionKey];

        if (cfg && cfg.action !== "none") {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (e.type === 'mousedown' || e.type === 'contextmenu') {
                log(`[Action] Mouse trigger: ${cfg.action} (${e.type})`);
                Actions[cfg.action](cfg.value);
            }
        }
    }

    /**
     * Check for all player instances and bind events to any new ones.
     */
    function checkAndBindPlayers() {
        const players = document.querySelectorAll(ADAPTER.playerSelector);
        log('checkAndBindPlayers found:', players.length);

        players.forEach(p => {
            if (!boundElements.has(p)) {
                log('Binding events to container:', p.id || p.tagName);

                p.addEventListener('wheel', onWheel, { passive: false, capture: true });
                p.addEventListener('mousedown', onMouse, { capture: true });
                p.addEventListener('click', onMouse, { capture: true });
                p.addEventListener('dblclick', onMouse, { capture: true });
                p.addEventListener('contextmenu', onMouse, { capture: true });

                boundElements.add(p);

                // OSD Management
                if (SITE === 'youtube' && !window.location.pathname.startsWith('/shorts/') && p.id === 'movie_player') {
                    const osd = createOSD();
                    if (!p.contains(osd)) p.appendChild(osd);
                }
            }
        });

        // Update global references for fallback
        const mainPlayer = document.querySelector(ADAPTER.playerSelector);
        if (mainPlayer) {
            player = ADAPTER.resolveVisualPlayer(mainPlayer);
            if (!api) api = ADAPTER.getAPIPlayer(player);
        }
    }

    /**
     * Initialize the script.
     */
    function init() {
        checkAndBindPlayers();
        updateZoneVisuals();
        log('Init cycle complete.');
    }

    // Hotkey listener for Zone Visibility
    document.addEventListener('keydown', (e) => {
        if (e.key === SETTINGS.ZONE_TOGGLE_KEY) {
            isZonesVisible = !isZonesVisible;
            updateZoneVisuals();
            showOSD(isZonesVisible ? "👀 Zones Visible" : "🙈 Zones Hidden");
        }
    });

    if (SITE === 'youtube') {
        window.addEventListener('yt-navigate-finish', () => {
            log('SPA navigation completed, refreshing bindings...');
            init();
        });
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

    // Polling observer to catch dynamically added players (Shorts infinite scroll, Bilibili SPA)
    const startObserver = () => {
        const observer = new MutationObserver(() => {
            checkAndBindPlayers();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };
    // At document-start the body may not exist yet
    if (document.body) {
        startObserver();
    } else {
        window.addEventListener('DOMContentLoaded', startObserver);
    }

    // Update visuals on window resize with debounce
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (!isZonesVisible) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            updateZoneVisuals();
        }, 200);
    });

})();