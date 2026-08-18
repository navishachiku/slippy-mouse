(function () {
    'use strict';

    /**
     * [Global Settings] SETTINGS
     * Centralized management of script behavior parameters
     */
    const SETTINGS = {
        DEBUG: false,                  // Whether to output debug messages to the console
        // Hotkeys support modifiers, e.g. 'Alt+Shift+Z', 'F9'. Empty string disables.
        ZONE_TOGGLE_KEY: 'Alt+Shift+Z',   // Toggle zone visibility
        SETTINGS_TOGGLE_KEY: '',          // Open/close the settings panel (main entry is the player control-bar button)

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
            controlBar: { host: '.ytp-right-controls', before: '.ytp-subtitles-button, .ytp-right-controls-left' },
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
            controlBar: { host: '.bpx-player-control-bottom-right', before: '.bpx-player-ctrl-quality' },
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
            const fmt = (tpl, v) => tpl.replace('{v}', v);
            switch (config.action) {
                case 'volume_set':
                    label = config.value === 0 ? T.ovl.mute : fmt(T.ovl.volSet, config.value); break;
                case 'volume_up': label = fmt(T.ovl.volUp, config.value); break;
                case 'volume_down': label = fmt(T.ovl.volDown, config.value); break;
                case 'seek':
                    label = config.value > 0 ? fmt(T.ovl.fwd, config.value) : fmt(T.ovl.back, Math.abs(config.value)); break;
                case 'toggle_play_pause': label = T.ovl.pp; break;
                case 'speed_set': label = fmt(T.ovl.spdSet, config.value); break;
                case 'speed_up': label = fmt(T.ovl.spdUp, config.value); break;
                case 'speed_down': label = fmt(T.ovl.spdDown, config.value); break;
                default: label = config.action;
            }

            return { icon, label };
        };

        CONFIG.forEach((zone, zi) => {
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
            title.textContent = zoneDisplayName(zi);
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

    // =====================[ Settings Persistence ]=====================

    const STORAGE_KEY = 'ytmm-settings-v1';

    // Factory defaults, captured before stored overrides apply
    const FACTORY = JSON.parse(JSON.stringify({
        settings: SETTINGS,
        zoneActions: CONFIG.map(z => z.mouse_action),
        zoneWidths: CONFIG.map(z => parseFloat(z.size.width)),
        zoneNames: CONFIG.map(() => '')
    }));

    // Custom zone names; an empty string falls back to the locale default
    let userZoneNames = CONFIG.map(() => '');

    /**
     * Resolve the display name of a zone: user override first, then the
     * locale default.
     *
     * @param {number} i The zone index.
     *
     * @returns {string} The name to show in the panel and overlay.
     */
    function zoneDisplayName(i) {
        return userZoneNames[i] || T.zoneNames[i] || CONFIG[i].name;
    }

    /**
     * Normalize a stored/imported zone-name array.
     *
     * @param {*} names The candidate value.
     *
     * @returns {string[]|null} One trimmed name per zone, or null when the
     *   value is not an array.
     */
    function sanitizeZoneNames(names) {
        if (!Array.isArray(names)) return null;
        return CONFIG.map((z, i) => typeof names[i] === 'string' ? names[i].trim().slice(0, 40) : '');
    }

    // Narrower than this a zone is unusable as a wheel target
    const MIN_ZONE_WIDTH_PCT = 5;

    /**
     * Read the current zone widths from CONFIG as percentages.
     *
     * @returns {number[]} One width per zone, in percent.
     */
    function getZoneWidths() {
        return CONFIG.map(z => parseFloat(z.size.width));
    }

    /**
     * Apply zone widths (percent) to CONFIG, recomputing the cumulative x
     * offsets so the zones stay contiguous across the player.
     *
     * @param {number[]} widths One width per zone, in percent.
     */
    function setZoneWidths(widths) {
        let x = 0;
        CONFIG.forEach((zone, i) => {
            zone.size.width = `${widths[i]}%`;
            zone.offset.x = `${x}%`;
            x += widths[i];
        });
    }

    /**
     * Validate a stored/imported zone-width array before applying it.
     *
     * @param {*} widths The candidate value.
     *
     * @returns {boolean} True when it is safe to pass to setZoneWidths.
     */
    function isValidZoneWidths(widths) {
        return Array.isArray(widths) && widths.length === CONFIG.length &&
            widths.every(w => typeof w === 'number' && isFinite(w) && w >= MIN_ZONE_WIDTH_PCT) &&
            Math.abs(widths.reduce((a, b) => a + b, 0) - 100) < 0.5;
    }

    // Settings editable through the panel (whitelist for the storage merge)
    const EDITABLE_KEYS = [
        'ADAPTIVE_WHEEL', 'ZONE_TOGGLE_KEY', 'SETTINGS_TOGGLE_KEY',
        'OSD_DURATION', 'OSD_FADE_OUT', 'OSD_FONT_SIZE',
        'WHEEL_STEP', 'GESTURE_GAP', 'MIN_ACTION_INTERVAL', 'IMPULSE_MIN',
        'REACCEL_FACTOR', 'DISCRETE_SETTLE',
        'USE_WHEEL_COUNT_FIXED', 'WHEEL_DELAY', 'WHEEL_COUNT_THRESHOLD',
        'DEBUG'
    ];

    let uiTheme = 'auto'; // 'auto' | 'light' | 'dark'
    let uiLang = 'auto';  // 'auto' follows the browser; otherwise an I18N locale key

    /**
     * Merge stored overrides from localStorage into SETTINGS and CONFIG.
     * Unknown keys and type mismatches are ignored so a stale or hand-edited
     * payload can never break the script.
     */
    function loadStoredSettings() {
        let raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return; }
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            if (data.settings) {
                for (const k of EDITABLE_KEYS) {
                    if (k in data.settings && typeof data.settings[k] === typeof SETTINGS[k]) {
                        SETTINGS[k] = data.settings[k];
                    }
                }
            }
            if (Array.isArray(data.zoneActions)) {
                data.zoneActions.forEach((ma, i) => {
                    if (!CONFIG[i] || !ma) return;
                    for (const trig of Object.keys(CONFIG[i].mouse_action)) {
                        if (ma[trig] && typeof ma[trig].action === 'string' && Actions[ma[trig].action]) {
                            CONFIG[i].mouse_action[trig] = { action: ma[trig].action, value: ma[trig].value };
                        }
                    }
                });
            }
            if (isValidZoneWidths(data.zoneWidths)) setZoneWidths(data.zoneWidths);
            const zn = sanitizeZoneNames(data.zoneNames);
            if (zn) userZoneNames = zn;
            if (data.theme === 'light' || data.theme === 'dark') uiTheme = data.theme;
            if (typeof data.lang === 'string') uiLang = data.lang;
        } catch (e) {
            log('Failed to parse stored settings:', e);
        }
    }

    /**
     * Write the current SETTINGS overrides and zone actions to localStorage.
     */
    function persistSettings() {
        const settings = {};
        for (const k of EDITABLE_KEYS) settings[k] = SETTINGS[k];
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                settings,
                zoneActions: CONFIG.map(z => z.mouse_action),
                zoneWidths: getZoneWidths(),
                zoneNames: userZoneNames,
                theme: uiTheme,
                lang: uiLang
            }));
        } catch (e) {
            log('Failed to persist settings:', e);
        }
    }

    loadStoredSettings();

    // =====================[ i18n ]=====================

    const I18N = {
        en: {
            title: 'Slippy Mouse Settings', tabGeneral: 'General', tabZones: 'Zone Actions', tabWheel: 'Wheel', tabAdvanced: 'Advanced',
            secCore: 'Core', adaptive: 'Adaptive wheel', adaptiveDesc: 'One notch or swipe equals exactly one action on any device. Turn off to use manual filtering in the Wheel tab.',
            zoneKey: 'Zone overlay hotkey', zoneKeyDesc: 'Shows the three zones and their actions on the player.', panelKey: 'Settings panel hotkey', pressKey: 'Press a key…', notSet: 'Not set',
            theme: 'Appearance', language: 'Language', themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
            secOsd: 'OSD', osdSize: 'Text size', osdDuration: 'Display time', osdFade: 'Fade-out time',
            secPickZone: 'Zones', zoneNames: ['Left zone', 'Middle zone', 'Right zone'], zoneNameLabel: 'Name',
            geomNote: 'Drag the dividers between zones to resize them.',
            ovl: { mute: 'Mute', volSet: 'Vol {v}%', volUp: 'Vol +{v}%', volDown: 'Vol -{v}%', fwd: 'Forward {v}s', back: 'Back {v}s', pp: 'Play/Pause', spdSet: 'Speed {v}x', spdUp: 'Speed +{v}x', spdDown: 'Speed -{v}x' },
            triggers: { left_click: 'Left click', right_click: 'Right click', middle_click: 'Middle click', wheel_up: 'Wheel ↑', wheel_down: 'Wheel ↓' },
            actions: { none: 'Do nothing (native)', volume_set: 'Set volume', volume_up: 'Volume up', volume_down: 'Volume down', seek: 'Seek', toggle_play_pause: 'Play / Pause', speed_set: 'Set speed', speed_up: 'Speed up', speed_down: 'Speed down' },
            secTuning: 'Adaptive tuning', step: 'Trigger step', stepDesc: 'Scroll travel needed per action. Lower is finer, higher is steadier.', hintFine: 'Fine', hintSteady: 'Steady',
            advTuning: 'Advanced tuning (rarely needed)', gap: 'Gesture gap', mai: 'Min action interval', imp: 'Impulse minimum', rf: 'Re-accel factor', ds: 'Notch settle delay',
            secManual: 'Manual filtering (when adaptive is off)', countMode: 'Fixed-count mode', countModeDesc: 'Fire once every N wheel events; otherwise a millisecond debounce is used.', countTh: 'Count threshold', delay: 'Debounce delay',
            secMisc: 'Misc', debug: 'Debug logging', debugDesc: 'Log event details to the console for bug reports.',
            secData: 'Settings data', exportImport: 'Export / Import', exportImportDesc: 'Back up or move all settings as JSON.', btnExport: 'Export', btnImport: 'Import',
            reset: 'Restore defaults', resetDesc: 'Clear all customizations.', btnReset: 'Reset all',
            btnCancel: 'Cancel', btnSave: 'Save', close: 'Close',
            toastSaved: 'Saved', toastReset: 'Defaults restored', toastImported: 'Settings imported', importError: 'Import failed: invalid file'
        },
        'zh-TW': {
            title: 'Slippy Mouse 設定', tabGeneral: '一般', tabZones: '區域動作', tabWheel: '滾輪', tabAdvanced: '進階',
            secCore: '核心', adaptive: '自適應滾輪', adaptiveDesc: '任何裝置上一格滾輪或一次滑動＝恰好一次動作。關閉後改用「滾輪」分頁的手動過濾。',
            zoneKey: '區域顯示熱鍵', zoneKeyDesc: '在播放器上顯示三區範圍與動作對照。', panelKey: '設定面板熱鍵', pressKey: '請按任意鍵…', notSet: '未設定',
            theme: '外觀', language: '介面語言', themeAuto: '自動', themeLight: '淺色', themeDark: '深色',
            secOsd: 'OSD 提示', osdSize: '文字大小', osdDuration: '停留時間', osdFade: '淡出時長',
            secPickZone: '選擇區域', zoneNames: ['左側區', '中間區', '右側區'], zoneNameLabel: '名稱',
            geomNote: '拖曳區塊間的分隔線即可調整區域寬度。',
            ovl: { mute: '靜音', volSet: '音量 {v}%', volUp: '音量 +{v}%', volDown: '音量 -{v}%', fwd: '快進 {v} 秒', back: '快退 {v} 秒', pp: '播放/暫停', spdSet: '倍速 {v}x', spdUp: '倍速 +{v}x', spdDown: '倍速 -{v}x' },
            triggers: { left_click: '左鍵', right_click: '右鍵', middle_click: '中鍵', wheel_up: '滾輪 ↑', wheel_down: '滾輪 ↓' },
            actions: { none: '無（放行原生行為）', volume_set: '設定音量', volume_up: '音量增加', volume_down: '音量減少', seek: '快進 / 快退', toggle_play_pause: '播放 / 暫停', speed_set: '設定倍速', speed_up: '倍速增加', speed_down: '倍速減少' },
            secTuning: '自適應調校', step: '觸發步距', stepDesc: '每次動作所需的累積滾動量。調低更靈敏，調高更穩重。', hintFine: '靈敏', hintSteady: '穩重',
            advTuning: '進階調校（一般不需調整）', gap: '手勢間隔', mai: '動作最小間隔', imp: '脈衝結算下限', rf: '再加速判定倍率', ds: '單格結算延遲',
            secManual: '手動過濾（自適應關閉時生效）', countMode: '固定計次模式', countModeDesc: '累積 N 個滾輪事件觸發一次；關閉則以毫秒防抖。', countTh: '計次閾值', delay: '防抖延遲',
            secMisc: '其他', debug: '偵錯記錄', debugDesc: '在 Console 輸出事件細節，回報問題時開啟。',
            secData: '設定資料', exportImport: '匯出 / 匯入', exportImportDesc: '以 JSON 備份或搬移全部設定。', btnExport: '匯出', btnImport: '匯入',
            reset: '回復預設值', resetDesc: '清除所有自訂設定。', btnReset: '全部重置',
            btnCancel: '取消', btnSave: '儲存', close: '關閉',
            toastSaved: '已儲存', toastReset: '已回復預設值', toastImported: '已匯入設定', importError: '匯入失敗：檔案格式錯誤'
        },
        'zh-CN': {
            title: 'Slippy Mouse 设置', tabGeneral: '常规', tabZones: '区域动作', tabWheel: '滚轮', tabAdvanced: '高级',
            secCore: '核心', adaptive: '自适应滚轮', adaptiveDesc: '任何设备上一格滚轮或一次滑动＝恰好一次动作。关闭后改用“滚轮”选项卡的手动过滤。',
            zoneKey: '区域显示热键', zoneKeyDesc: '在播放器上显示三区范围与动作对照。', panelKey: '设置面板热键', pressKey: '请按任意键…', notSet: '未设置',
            theme: '外观', language: '界面语言', themeAuto: '自动', themeLight: '浅色', themeDark: '深色',
            secOsd: 'OSD 提示', osdSize: '文字大小', osdDuration: '停留时间', osdFade: '淡出时长',
            secPickZone: '选择区域', zoneNames: ['左侧区', '中间区', '右侧区'], zoneNameLabel: '名称',
            geomNote: '拖拽区块间的分隔线即可调整区域宽度。',
            ovl: { mute: '静音', volSet: '音量 {v}%', volUp: '音量 +{v}%', volDown: '音量 -{v}%', fwd: '快进 {v} 秒', back: '快退 {v} 秒', pp: '播放/暂停', spdSet: '倍速 {v}x', spdUp: '倍速 +{v}x', spdDown: '倍速 -{v}x' },
            triggers: { left_click: '左键', right_click: '右键', middle_click: '中键', wheel_up: '滚轮 ↑', wheel_down: '滚轮 ↓' },
            actions: { none: '无（放行原生行为）', volume_set: '设置音量', volume_up: '音量增加', volume_down: '音量减少', seek: '快进 / 快退', toggle_play_pause: '播放 / 暂停', speed_set: '设置倍速', speed_up: '倍速增加', speed_down: '倍速减少' },
            secTuning: '自适应调校', step: '触发步距', stepDesc: '每次动作所需的累积滚动量。调低更灵敏，调高更稳重。', hintFine: '灵敏', hintSteady: '稳重',
            advTuning: '高级调校（一般无需调整）', gap: '手势间隔', mai: '动作最小间隔', imp: '脉冲结算下限', rf: '再加速判定倍率', ds: '单格结算延迟',
            secManual: '手动过滤（自适应关闭时生效）', countMode: '固定计次模式', countModeDesc: '累积 N 个滚轮事件触发一次；关闭则以毫秒防抖。', countTh: '计次阈值', delay: '防抖延迟',
            secMisc: '其他', debug: '调试日志', debugDesc: '在 Console 输出事件细节，反馈问题时开启。',
            secData: '设置数据', exportImport: '导出 / 导入', exportImportDesc: '以 JSON 备份或迁移全部设置。', btnExport: '导出', btnImport: '导入',
            reset: '恢复默认值', resetDesc: '清除所有自定义设置。', btnReset: '全部重置',
            btnCancel: '取消', btnSave: '保存', close: '关闭',
            toastSaved: '已保存', toastReset: '已恢复默认值', toastImported: '已导入设置', importError: '导入失败：文件格式错误'
        },
        ja: {
            title: 'Slippy Mouse 設定', tabGeneral: '一般', tabZones: 'ゾーン操作', tabWheel: 'ホイール', tabAdvanced: '詳細',
            secCore: 'コア', adaptive: 'アダプティブホイール', adaptiveDesc: 'どのデバイスでもノッチ1回・スワイプ1回＝ちょうど1アクション。オフにすると「ホイール」タブの手動フィルタリングを使用します。',
            zoneKey: 'ゾーン表示ホットキー', zoneKeyDesc: 'プレイヤー上に3ゾーンと操作の対応を表示します。', panelKey: '設定パネルホットキー', pressKey: 'キーを押してください…', notSet: '未設定',
            theme: '外観', language: '表示言語', themeAuto: '自動', themeLight: 'ライト', themeDark: 'ダーク',
            secOsd: 'OSD 表示', osdSize: '文字サイズ', osdDuration: '表示時間', osdFade: 'フェードアウト時間',
            secPickZone: 'ゾーン選択', zoneNames: ['左ゾーン', '中央ゾーン', '右ゾーン'], zoneNameLabel: '名前',
            geomNote: 'ゾーン間の仕切りをドラッグして幅を調整できます。',
            ovl: { mute: 'ミュート', volSet: '音量 {v}%', volUp: '音量 +{v}%', volDown: '音量 -{v}%', fwd: '{v}秒送り', back: '{v}秒戻し', pp: '再生/一時停止', spdSet: '速度 {v}x', spdUp: '速度 +{v}x', spdDown: '速度 -{v}x' },
            triggers: { left_click: '左クリック', right_click: '右クリック', middle_click: '中クリック', wheel_up: 'ホイール ↑', wheel_down: 'ホイール ↓' },
            actions: { none: '何もしない（ネイティブ）', volume_set: '音量を設定', volume_up: '音量を上げる', volume_down: '音量を下げる', seek: 'シーク', toggle_play_pause: '再生 / 一時停止', speed_set: '速度を設定', speed_up: '速度を上げる', speed_down: '速度を下げる' },
            secTuning: 'アダプティブ調整', step: 'トリガーステップ', stepDesc: '1アクションに必要な累積スクロール量。低いほど敏感、高いほど安定。', hintFine: '敏感', hintSteady: '安定',
            advTuning: '詳細調整（通常は不要）', gap: 'ジェスチャー間隔', mai: '最小アクション間隔', imp: 'インパルス下限', rf: '再加速判定倍率', ds: 'ノッチ確定遅延',
            secManual: '手動フィルタリング（アダプティブ無効時）', countMode: '固定カウントモード', countModeDesc: 'ホイールイベント N 回ごとに1回発火。オフの場合はミリ秒デバウンス。', countTh: 'カウントしきい値', delay: 'デバウンス遅延',
            secMisc: 'その他', debug: 'デバッグログ', debugDesc: '不具合報告用にイベント詳細を Console に出力します。',
            secData: '設定データ', exportImport: 'エクスポート / インポート', exportImportDesc: '全設定を JSON でバックアップ・移行します。', btnExport: 'エクスポート', btnImport: 'インポート',
            reset: 'デフォルトに戻す', resetDesc: 'すべてのカスタマイズを消去します。', btnReset: 'すべてリセット',
            btnCancel: 'キャンセル', btnSave: '保存', close: '閉じる',
            toastSaved: '保存しました', toastReset: 'デフォルトに戻しました', toastImported: '設定をインポートしました', importError: 'インポート失敗：ファイル形式が不正です'
        },
        ko: {
            title: 'Slippy Mouse 설정', tabGeneral: '일반', tabZones: '존 동작', tabWheel: '휠', tabAdvanced: '고급',
            secCore: '핵심', adaptive: '적응형 휠', adaptiveDesc: '어떤 장치에서든 한 칸/한 스와이프＝정확히 한 번의 동작. 끄면 "휠" 탭의 수동 필터링을 사용합니다.',
            zoneKey: '존 표시 단축키', zoneKeyDesc: '플레이어에 3개 존과 동작 대응을 표시합니다.', panelKey: '설정 패널 단축키', pressKey: '키를 누르세요…', notSet: '설정 안 함',
            theme: '모양', language: '표시 언어', themeAuto: '자동', themeLight: '라이트', themeDark: '다크',
            secOsd: 'OSD 표시', osdSize: '글자 크기', osdDuration: '표시 시간', osdFade: '페이드아웃 시간',
            secPickZone: '존 선택', zoneNames: ['왼쪽 존', '가운데 존', '오른쪽 존'], zoneNameLabel: '이름',
            geomNote: '존 사이의 구분선을 드래그해 너비를 조정할 수 있습니다.',
            ovl: { mute: '음소거', volSet: '볼륨 {v}%', volUp: '볼륨 +{v}%', volDown: '볼륨 -{v}%', fwd: '{v}초 앞으로', back: '{v}초 뒤로', pp: '재생/일시정지', spdSet: '배속 {v}x', spdUp: '배속 +{v}x', spdDown: '배속 -{v}x' },
            triggers: { left_click: '좌클릭', right_click: '우클릭', middle_click: '휠클릭', wheel_up: '휠 ↑', wheel_down: '휠 ↓' },
            actions: { none: '없음（네이티브）', volume_set: '볼륨 설정', volume_up: '볼륨 올리기', volume_down: '볼륨 내리기', seek: '탐색', toggle_play_pause: '재생 / 일시정지', speed_set: '속도 설정', speed_up: '속도 올리기', speed_down: '속도 내리기' },
            secTuning: '적응형 조정', step: '트리거 스텝', stepDesc: '동작 한 번에 필요한 누적 스크롤 양. 낮을수록 민감, 높을수록 안정적.', hintFine: '민감', hintSteady: '안정',
            advTuning: '고급 조정（보통 불필요）', gap: '제스처 간격', mai: '최소 동작 간격', imp: '임펄스 하한', rf: '재가속 판정 배율', ds: '노치 확정 지연',
            secManual: '수동 필터링（적응형 꺼짐 시）', countMode: '고정 카운트 모드', countModeDesc: '휠 이벤트 N회마다 한 번 실행. 끄면 밀리초 디바운스 사용.', countTh: '카운트 임계값', delay: '디바운스 지연',
            secMisc: '기타', debug: '디버그 로그', debugDesc: '버그 신고용 이벤트 상세를 Console에 출력합니다.',
            secData: '설정 데이터', exportImport: '내보내기 / 가져오기', exportImportDesc: '전체 설정을 JSON으로 백업·이동합니다.', btnExport: '내보내기', btnImport: '가져오기',
            reset: '기본값 복원', resetDesc: '모든 사용자 설정을 지웁니다.', btnReset: '전체 초기화',
            btnCancel: '취소', btnSave: '저장', close: '닫기',
            toastSaved: '저장됨', toastReset: '기본값 복원됨', toastImported: '설정 가져옴', importError: '가져오기 실패: 잘못된 파일'
        },
        pt: {
            title: 'Configurações do Slippy Mouse', tabGeneral: 'Geral', tabZones: 'Ações de Zona', tabWheel: 'Roda', tabAdvanced: 'Avançado',
            secCore: 'Essencial', adaptive: 'Roda adaptativa', adaptiveDesc: 'Um clique ou deslize equivale exatamente a uma ação em qualquer dispositivo. Desative para usar a filtragem manual na aba Roda.',
            zoneKey: 'Atalho de exibição de zonas', zoneKeyDesc: 'Mostra as três zonas e suas ações no player.', panelKey: 'Atalho do painel de configurações', pressKey: 'Pressione uma tecla…', notSet: 'Não definido',
            theme: 'Aparência', language: 'Idioma', themeAuto: 'Auto', themeLight: 'Claro', themeDark: 'Escuro',
            secOsd: 'OSD', osdSize: 'Tamanho do texto', osdDuration: 'Tempo de exibição', osdFade: 'Tempo de esmaecimento',
            secPickZone: 'Zonas', zoneNames: ['Zona esquerda', 'Zona central', 'Zona direita'], zoneNameLabel: 'Nome',
            geomNote: 'Arraste os divisores entre as zonas para redimensioná-las.',
            ovl: { mute: 'Mudo', volSet: 'Vol {v}%', volUp: 'Vol +{v}%', volDown: 'Vol -{v}%', fwd: 'Avançar {v}s', back: 'Voltar {v}s', pp: 'Tocar/Pausar', spdSet: 'Vel {v}x', spdUp: 'Vel +{v}x', spdDown: 'Vel -{v}x' },
            triggers: { left_click: 'Clique esquerdo', right_click: 'Clique direito', middle_click: 'Clique do meio', wheel_up: 'Roda ↑', wheel_down: 'Roda ↓' },
            actions: { none: 'Nada (nativo)', volume_set: 'Definir volume', volume_up: 'Aumentar volume', volume_down: 'Diminuir volume', seek: 'Avançar / Voltar', toggle_play_pause: 'Reproduzir / Pausar', speed_set: 'Definir velocidade', speed_up: 'Aumentar velocidade', speed_down: 'Diminuir velocidade' },
            secTuning: 'Ajuste adaptativo', step: 'Passo de acionamento', stepDesc: 'Rolagem acumulada necessária por ação. Menor é mais fino, maior é mais estável.', hintFine: 'Fino', hintSteady: 'Estável',
            advTuning: 'Ajuste avançado (raramente necessário)', gap: 'Intervalo de gesto', mai: 'Intervalo mínimo entre ações', imp: 'Mínimo de impulso', rf: 'Fator de reaceleração', ds: 'Atraso de confirmação de clique',
            secManual: 'Filtragem manual (com adaptativa desligada)', countMode: 'Modo de contagem fixa', countModeDesc: 'Dispara uma vez a cada N eventos de roda; caso contrário usa debounce em milissegundos.', countTh: 'Limite de contagem', delay: 'Atraso de debounce',
            secMisc: 'Diversos', debug: 'Registro de depuração', debugDesc: 'Registra detalhes de eventos no Console para relatórios de bugs.',
            secData: 'Dados de configuração', exportImport: 'Exportar / Importar', exportImportDesc: 'Faça backup ou mova todas as configurações como JSON.', btnExport: 'Exportar', btnImport: 'Importar',
            reset: 'Restaurar padrões', resetDesc: 'Limpa todas as personalizações.', btnReset: 'Redefinir tudo',
            btnCancel: 'Cancelar', btnSave: 'Salvar', close: 'Fechar',
            toastSaved: 'Salvo', toastReset: 'Padrões restaurados', toastImported: 'Configurações importadas', importError: 'Falha na importação: arquivo inválido'
        },
        es: {
            title: 'Configuración de Slippy Mouse', tabGeneral: 'General', tabZones: 'Acciones de Zona', tabWheel: 'Rueda', tabAdvanced: 'Avanzado',
            secCore: 'Esencial', adaptive: 'Rueda adaptativa', adaptiveDesc: 'Un clic o deslizamiento equivale exactamente a una acción en cualquier dispositivo. Desactívala para usar el filtrado manual en la pestaña Rueda.',
            zoneKey: 'Atajo de visualización de zonas', zoneKeyDesc: 'Muestra las tres zonas y sus acciones en el reproductor.', panelKey: 'Atajo del panel de configuración', pressKey: 'Pulsa una tecla…', notSet: 'Sin asignar',
            theme: 'Apariencia', language: 'Idioma', themeAuto: 'Auto', themeLight: 'Claro', themeDark: 'Oscuro',
            secOsd: 'OSD', osdSize: 'Tamaño del texto', osdDuration: 'Tiempo en pantalla', osdFade: 'Tiempo de desvanecimiento',
            secPickZone: 'Zonas', zoneNames: ['Zona izquierda', 'Zona central', 'Zona derecha'], zoneNameLabel: 'Nombre',
            geomNote: 'Arrastra los divisores entre las zonas para cambiar su tamaño.',
            ovl: { mute: 'Silencio', volSet: 'Vol {v}%', volUp: 'Vol +{v}%', volDown: 'Vol -{v}%', fwd: 'Avanzar {v}s', back: 'Retroceder {v}s', pp: 'Reproducir/Pausa', spdSet: 'Vel {v}x', spdUp: 'Vel +{v}x', spdDown: 'Vel -{v}x' },
            triggers: { left_click: 'Clic izquierdo', right_click: 'Clic derecho', middle_click: 'Clic central', wheel_up: 'Rueda ↑', wheel_down: 'Rueda ↓' },
            actions: { none: 'Nada (nativo)', volume_set: 'Fijar volumen', volume_up: 'Subir volumen', volume_down: 'Bajar volumen', seek: 'Avanzar / Retroceder', toggle_play_pause: 'Reproducir / Pausar', speed_set: 'Fijar velocidad', speed_up: 'Subir velocidad', speed_down: 'Bajar velocidad' },
            secTuning: 'Ajuste adaptativo', step: 'Paso de activación', stepDesc: 'Desplazamiento acumulado necesario por acción. Menor es más fino, mayor es más estable.', hintFine: 'Fino', hintSteady: 'Estable',
            advTuning: 'Ajuste avanzado (rara vez necesario)', gap: 'Intervalo de gesto', mai: 'Intervalo mínimo entre acciones', imp: 'Mínimo de impulso', rf: 'Factor de reaceleración', ds: 'Retardo de confirmación de clic',
            secManual: 'Filtrado manual (con adaptativa desactivada)', countMode: 'Modo de conteo fijo', countModeDesc: 'Se activa una vez cada N eventos de rueda; de lo contrario usa un debounce en milisegundos.', countTh: 'Umbral de conteo', delay: 'Retardo de debounce',
            secMisc: 'Varios', debug: 'Registro de depuración', debugDesc: 'Registra detalles de eventos en la Console para informes de errores.',
            secData: 'Datos de configuración', exportImport: 'Exportar / Importar', exportImportDesc: 'Respalda o traslada toda la configuración como JSON.', btnExport: 'Exportar', btnImport: 'Importar',
            reset: 'Restaurar valores predeterminados', resetDesc: 'Borra todas las personalizaciones.', btnReset: 'Restablecer todo',
            btnCancel: 'Cancelar', btnSave: 'Guardar', close: 'Cerrar',
            toastSaved: 'Guardado', toastReset: 'Valores predeterminados restaurados', toastImported: 'Configuración importada', importError: 'Error de importación: archivo no válido'
        }
    };

    /**
     * Pick the best supported locale from navigator.language.
     * Exact match first, then a prefix match; falls back to English.
     *
     * @returns {string} A key of I18N.
     */
    function pickLocale() {
        const lang = (navigator.language || 'en').toLowerCase();
        for (const key of Object.keys(I18N)) {
            if (key.toLowerCase() === lang) return key;
        }
        const prefix = lang.split('-')[0];
        if (prefix === 'zh') return /tw|hk|mo|hant/.test(lang) ? 'zh-TW' : 'zh-CN';
        for (const key of Object.keys(I18N)) {
            if (key.toLowerCase().split('-')[0] === prefix) return key;
        }
        return 'en';
    }

    /**
     * Resolve the active locale key: manual override first, then browser.
     *
     * @returns {string} An I18N key.
     */
    function resolveLocale() {
        return uiLang !== 'auto' && I18N[uiLang] ? uiLang : pickLocale();
    }

    let T = I18N[resolveLocale()];

    // =====================[ Hotkeys ]=====================

    /**
     * Test a keyboard event against a hotkey spec like 'Alt+Shift+Z' or 'F9'.
     * Letters and digits are matched by physical key (e.code), so macOS
     * Option-combinations that produce special characters still match.
     *
     * @param {KeyboardEvent} e The keyboard event.
     * @param {string} spec The hotkey spec; empty/falsy never matches.
     *
     * @returns {boolean} True if the event matches the spec.
     */
    function matchHotkey(e, spec) {
        if (!spec) return false;
        const parts = spec.split('+');
        const key = parts.pop();
        const mods = parts.map(p => p.toLowerCase());
        if (mods.includes('alt') !== e.altKey) return false;
        if (mods.includes('shift') !== e.shiftKey) return false;
        if ((mods.includes('ctrl') || mods.includes('control')) !== e.ctrlKey) return false;
        if ((mods.includes('meta') || mods.includes('cmd')) !== e.metaKey) return false;
        if (/^[a-z]$/i.test(key)) return e.code === 'Key' + key.toUpperCase();
        if (/^[0-9]$/.test(key)) return e.code === 'Digit' + key;
        return e.key === key || e.code === key;
    }

    /**
     * Build a hotkey spec string from a captured keydown event.
     *
     * @param {KeyboardEvent} e The keyboard event.
     *
     * @returns {string|null} The spec, or null for a bare modifier press.
     */
    function buildHotkeySpec(e) {
        if (['Alt', 'Shift', 'Control', 'Meta'].includes(e.key)) return null;
        const mods = [];
        if (e.ctrlKey) mods.push('Ctrl');
        if (e.altKey) mods.push('Alt');
        if (e.shiftKey) mods.push('Shift');
        if (e.metaKey) mods.push('Meta');
        let key;
        if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
        else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5);
        else key = e.key;
        return [...mods, key].join('+');
    }

    // =====================[ Settings Panel UI ]=====================

    // Actions offered by the zone-mapping selects: [action, unit, defaultValue]
    const ACTION_DEFS = [
        ['none', null, null],
        ['volume_set', '%', 100],
        ['volume_up', '%', 5],
        ['volume_down', '%', 5],
        ['seek', 's', 5],
        ['toggle_play_pause', null, null],
        ['speed_set', '×', 1],
        ['speed_up', '×', 0.25],
        ['speed_down', '×', 0.25]
    ];

    const PANEL_CSS = `
        .wrap {
            --panel: #ffffff; --panel-2: #f2f2f7; --hairline: #e5e5ea;
            --text: #1c1c1e; --text-2: #6e6e76; --text-3: #9a9aa2;
            --accent: #007aff; --accent-dim: rgba(0,122,255,0.10);
            --switch-on: #34c759; --switch-off: #e9e9eb;
            --overlay-tint: rgba(60,60,70,0.35);
            --shadow: 0 24px 80px rgba(0,0,0,0.22);
            --zone-label: rgba(0,0,0,0.72);
            position: fixed; inset: 0; z-index: 2147483647;
            display: grid; place-items: center; padding: 4vh 16px;
            background: var(--overlay-tint);
            font-family: "Avenir Next", "Helvetica Neue", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
            font-size: 14px; line-height: 1.55; color: var(--text);
            box-sizing: border-box;
        }
        .wrap[data-theme="dark"] {
            --panel: #1c1c1e; --panel-2: #2c2c2e; --hairline: #38383a;
            --text: #f2f2f4; --text-2: #98989f; --text-3: #63636e;
            --accent: #0a84ff; --accent-dim: rgba(10,132,255,0.16);
            --switch-on: #30d158; --switch-off: #39393d;
            --overlay-tint: rgba(5,5,8,0.55);
            --shadow: 0 24px 80px rgba(0,0,0,0.55);
            --zone-label: rgba(255,255,255,0.92);
        }
        .wrap *, .wrap *::before, .wrap *::after { box-sizing: border-box; margin: 0; }
        .modal {
            width: min(760px, 100%); max-height: 92vh;
            background: var(--panel); border: 1px solid var(--hairline);
            border-radius: 14px; box-shadow: var(--shadow);
            display: flex; flex-direction: column; overflow: hidden;
        }
        .head { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--hairline); }
        .logo { width: 30px; height: 30px; flex-shrink: 0;
            background: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><clipPath id='c'><path d='M97.28 0 L414.72 0 A97.28 97.28 0 0 1 512 97.28 L512 414.72 A97.28 97.28 0 0 1 414.72 512 L97.28 512 A97.28 97.28 0 0 1 0 414.72 L0 97.28 A97.28 97.28 0 0 1 97.28 0 Z'/></clipPath></defs><g clip-path='url(%23c)'><path d='M-486.4 -512 L-161.133 -512 L-161.133 512 L-486.4 512 Z' fill='%23F0564F' transform='matrix(.924 -.383 .383 .924 256 256)'/><path d='M-162.133 -512 L163.133 -512 L163.133 512 L-162.133 512 Z' fill='%2343BA6B' transform='matrix(.924 -.383 .383 .924 256 256)'/><path d='M162.133 -512 L487.4 -512 L487.4 512 L162.133 512 Z' fill='%234F7DF0' transform='matrix(.924 -.383 .383 .924 256 256)'/></g><g transform='matrix(4.048 0 0 4.048 53.592 53.592)'><path d='M74 74 Q95 72 92 52' fill='none' stroke='%23EDF1F8' stroke-width='4.2' stroke-linecap='round'/><path d='M36.368 20.885 A8 9.5 -22.918 0 1 32.699 32.75 A8 9.5 -22.918 0 1 21.632 27.115 A8 9.5 -22.918 0 1 25.301 15.25 A8 9.5 -22.918 0 1 36.368 20.885 L58.319 23.637 A7.5 9 12.605 0 1 49.036 30.783 A7.5 9 12.605 0 1 43.681 20.363 A7.5 9 12.605 0 1 52.964 13.217 A7.5 9 12.605 0 1 58.319 23.637' fill='%23D1D4DA'/><path d='M79 64 A27 23 0 0 1 52 87 A27 23 0 0 1 25 64 A27 23 0 0 1 52 41 A27 23 0 0 1 79 64' fill='%23EDF1F8'/><path d='M59 41 A21 20 0 0 1 38 61 A21 20 0 0 1 17 41 A21 20 0 0 1 38 21 A21 20 0 0 1 59 41' fill='%23EDF1F8'/><path d='M68 73 A17 12 0 0 1 51 85 A17 12 0 0 1 34 73 A17 12 0 0 1 51 61 A17 12 0 0 1 68 73' fill='%23F7F9FC'/><path d='M31.9 41 A2.9 3.2 0 0 1 29 44.2 A2.9 3.2 0 0 1 26.1 41 A2.9 3.2 0 0 1 29 37.8 A2.9 3.2 0 0 1 31.9 41 L47.9 40 A2.9 3.2 0 0 1 45 43.2 A2.9 3.2 0 0 1 42.1 40 A2.9 3.2 0 0 1 45 36.8 A2.9 3.2 0 0 1 47.9 40' fill='%231B1B22'/><path d='M22.2 48 A2.2 1.9 0 0 1 20 49.9 A2.2 1.9 0 0 1 17.8 48 A2.2 1.9 0 0 1 20 46.1 A2.2 1.9 0 0 1 22.2 48' fill='%231B1B22'/></g></svg>") center / contain no-repeat; }
        .head h1 { font-size: 16px; font-weight: 600; }
        .chip { margin-left: auto; font-size: 11px; color: var(--text-2); border: 1px solid var(--hairline); border-radius: 99px; padding: 3px 10px; }
        .x { background: none; border: none; color: var(--text-2); font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-family: inherit; }
        .x:hover { color: var(--text); background: var(--panel-2); }
        .body { display: flex; flex: 1; min-height: 0; }
        nav { width: 148px; flex-shrink: 0; border-right: 1px solid var(--hairline); padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
        nav button { background: none; border: none; text-align: left; color: var(--text-2); font: inherit; font-size: 13.5px; padding: 9px 12px; border-radius: 8px; cursor: pointer; }
        nav button:hover { color: var(--text); background: var(--panel-2); }
        nav button.on { color: var(--text); background: var(--accent-dim); font-weight: 600; }
        main { flex: 1; overflow-y: auto; padding: 20px 24px 28px; }
        .pane { display: none; }
        .pane.on { display: block; }
        h2 { font-size: 12px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.09em; margin: 34px 0 8px; }
        h2:first-child { margin-top: 0; }
        .row { display: flex; align-items: center; gap: 16px; padding: 13px 2px; }
        .row + .row { border-top: 1px solid var(--hairline); }
        .row .info { flex: 1; min-width: 0; }
        .row .label { font-size: 14px; font-weight: 500; }
        .row .desc { font-size: 12px; color: var(--text-2); margin-top: 1px; }
        .row .key { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10.5px; color: var(--text-3); }
        .dim { opacity: 0.42; pointer-events: none; }
        .toggle { position: relative; width: 51px; height: 31px; flex-shrink: 0; cursor: pointer; }
        .toggle input { opacity: 0; width: 100%; height: 100%; position: absolute; margin: 0; cursor: pointer; }
        .toggle .tr { position: absolute; inset: 0; border-radius: 99px; background: var(--switch-off); transition: background 0.18s; }
        .toggle .tr::after { content: ""; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16); transition: transform 0.18s; }
        .toggle input:checked + .tr { background: var(--switch-on); }
        .toggle input:checked + .tr::after { transform: translateX(20px); }
        .sw { display: flex; align-items: center; gap: 10px; width: 250px; flex-shrink: 0; }
        input[type="range"] { flex: 1; appearance: none; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--switch-off); outline: none; }
        input[type="range"]::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--accent); cursor: pointer; border: none; }
        .val { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--text); background: var(--panel-2); border: 1px solid var(--hairline);
            border-radius: 6px; padding: 3px 8px; min-width: 62px; text-align: right; font-variant-numeric: tabular-nums; }
        .hints { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-3); width: 250px; margin: -6px 0 0 auto; padding-right: 72px; }
        select, .keycap, input[type="number"], input[type="text"] { background: var(--panel-2); border: 1px solid var(--hairline); color: var(--text); font: inherit; font-size: 13px; border-radius: 7px; padding: 6px 9px; }
        .keycap { font-family: ui-monospace, Menlo, Consolas, monospace; min-width: 58px; text-align: center; cursor: pointer; }
        input[type="number"] { width: 72px; font-family: ui-monospace, Menlo, Consolas, monospace; text-align: right; }
        .seg { display: flex; border: 1px solid var(--hairline); border-radius: 9px; overflow: hidden; }
        .seg button { background: none; border: none; color: var(--text-2); font: inherit; font-size: 12.5px; padding: 6px 12px; cursor: pointer; }
        .seg button.on { background: var(--accent-dim); color: var(--accent); font-weight: 600; }
        .zonebar { position: relative; display: flex; height: 88px; border-radius: 10px; overflow: hidden; border: 1px solid var(--hairline); margin: 4px 0; }
        .zonebar button { border: none; cursor: pointer; font: inherit; color: var(--zone-label); padding: 10px;
            display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; gap: 1px; transition: filter 0.12s; }
        .zonebar button .zn { font-weight: 600; font-size: 13px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .zonebar button .zw { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10.5px; opacity: 0.75; }
        .zonebar button:hover { filter: brightness(1.15); }
        .zonebar button.sel { box-shadow: inset 0 0 0 2px var(--accent); filter: brightness(1.1); }
        .zonebar button:first-of-type { border-radius: 9px 0 0 9px; }
        .zonebar button:last-of-type { border-radius: 0 9px 9px 0; }
        .zonebar .zhandle { position: absolute; top: 0; height: 100%; width: 14px; transform: translateX(-50%);
            display: flex; align-items: center; justify-content: center; cursor: col-resize; touch-action: none; z-index: 2; }
        .zonebar .zhandle .grip { width: 4px; height: 26px; border-radius: 2px; background: var(--zone-label); opacity: 0.45; transition: opacity 0.12s, background 0.12s; }
        .zonebar .zhandle:hover .grip, .zonebar .zhandle.drag .grip { background: var(--accent); opacity: 1; }
        .geom-note { font-size: 11.5px; color: var(--text-3); margin-bottom: 10px; }
        .arow { display: flex; align-items: center; gap: 10px; padding: 9px 2px; }
        .arow + .arow { border-top: 1px solid var(--hairline); }
        .arow .ic { width: 76px; flex-shrink: 0; font-size: 12.5px; color: var(--text-2); }
        .arow select { flex: 1; }
        .arow input[type="text"] { flex: 1; min-width: 0; }
        .arow .unit { font-size: 11.5px; color: var(--text-3); width: 24px; }
        .advbtn { background: none; border: none; color: var(--text-3); font: inherit; font-size: 12px; cursor: pointer; padding: 8px 2px; display: flex; align-items: center; gap: 6px; }
        .advbtn:hover { color: var(--text-2); }
        .advbtn .car { transition: transform 0.15s; display: inline-block; }
        .advbtn.open .car { transform: rotate(90deg); }
        .advbody { display: none; }
        .advbody.open { display: block; }
        .foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--hairline); }
        .btn { font: inherit; font-size: 13px; border-radius: 8px; cursor: pointer; padding: 8px 16px; border: 1px solid var(--hairline); background: none; color: var(--text-2); }
        .btn:hover { color: var(--text); background: var(--panel-2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
        .toast { position: fixed; left: 50%; bottom: 30px; transform: translateX(-50%) translateY(70px); background: var(--panel-2); color: var(--text);
            border: 1px solid var(--hairline); padding: 9px 18px; border-radius: 99px; font-size: 13px; transition: transform 0.25s; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        :focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
        @media (max-width: 620px) {
            .body { flex-direction: column; }
            nav { width: 100%; flex-direction: row; border-right: none; border-bottom: 1px solid var(--hairline); overflow-x: auto; }
            .sw { width: 170px; }
            .hints { width: 170px; }
        }
    `;

    let panelHost = null;
    let panelRefs = null;   // live references into the shadow DOM
    let panelSnapshot = null;
    let selectedZone = 0;
    let toastTimer = null;
    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

    /**
     * Create a DOM element with attributes and children (shadow-DOM helper).
     *
     * @param {string} tag Tag name.
     * @param {Object} [attrs] Attributes; 'class' and 'text' are special-cased.
     * @param {...Node} children Child nodes.
     *
     * @returns {HTMLElement} The created element.
     */
    function h(tag, attrs, ...children) {
        const node = document.createElement(tag);
        if (attrs) {
            for (const [k, v] of Object.entries(attrs)) {
                if (k === 'class') node.className = v;
                else if (k === 'text') node.textContent = v;
                else node.setAttribute(k, v);
            }
        }
        children.forEach(c => node.appendChild(c));
        return node;
    }

    /**
     * Capture the current editable state for cancel/revert.
     *
     * @returns {Object} A deep-copied snapshot.
     */
    function captureState() {
        const settings = {};
        for (const k of EDITABLE_KEYS) settings[k] = SETTINGS[k];
        return JSON.parse(JSON.stringify({ settings, zoneActions: CONFIG.map(z => z.mouse_action), zoneWidths: getZoneWidths(), zoneNames: userZoneNames, theme: uiTheme, lang: uiLang }));
    }

    /**
     * Apply a captured (or imported) state to SETTINGS/CONFIG and refresh visuals.
     *
     * @param {Object} snap The state to apply.
     */
    function applyState(snap) {
        for (const k of EDITABLE_KEYS) {
            if (k in snap.settings && typeof snap.settings[k] === typeof SETTINGS[k]) SETTINGS[k] = snap.settings[k];
        }
        if (Array.isArray(snap.zoneActions)) {
            snap.zoneActions.forEach((ma, i) => {
                if (!CONFIG[i] || !ma) return;
                for (const trig of Object.keys(CONFIG[i].mouse_action)) {
                    if (ma[trig] && typeof ma[trig].action === 'string' && Actions[ma[trig].action]) {
                        CONFIG[i].mouse_action[trig] = { action: ma[trig].action, value: ma[trig].value };
                    }
                }
            });
        }
        if (isValidZoneWidths(snap.zoneWidths)) setZoneWidths(snap.zoneWidths);
        const zn = sanitizeZoneNames(snap.zoneNames);
        if (zn) userZoneNames = zn;
        if (snap.theme === 'light' || snap.theme === 'dark' || snap.theme === 'auto') uiTheme = snap.theme;
        if (typeof snap.lang === 'string') {
            uiLang = snap.lang === 'auto' || I18N[snap.lang] ? snap.lang : 'auto';
            T = I18N[resolveLocale()];
        }
        if (isZonesVisible) updateZoneVisuals();
    }

    /**
     * Resolve 'auto' against the OS preference and stamp the panel theme.
     */
    function applyPanelTheme() {
        if (!panelRefs) return;
        const resolved = uiTheme === 'auto' ? (themeMedia.matches ? 'dark' : 'light') : uiTheme;
        panelRefs.wrap.dataset.theme = resolved;
    }
    themeMedia.addEventListener('change', applyPanelTheme);

    /**
     * Show a transient toast inside the panel.
     *
     * @param {string} msg The message to show.
     */
    function showPanelToast(msg) {
        if (!panelRefs) return;
        panelRefs.toast.textContent = msg;
        panelRefs.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => panelRefs.toast.classList.remove('show'), 1600);
    }

    /**
     * Build one settings row with a toggle switch.
     */
    function rowToggle(label, desc, key, get, set) {
        const input = h('input', { type: 'checkbox' });
        input.checked = get();
        input.addEventListener('change', () => set(input.checked));
        const info = h('div', { class: 'info' }, h('div', { class: 'label', text: label }));
        if (desc) info.appendChild(h('div', { class: 'desc', text: desc }));
        if (key) info.appendChild(h('div', { class: 'key', text: key }));
        const row = h('div', { class: 'row' }, info, h('label', { class: 'toggle' }, input, h('span', { class: 'tr' })));
        row._input = input;
        return row;
    }

    /**
     * Build one settings row with a slider and live value badge.
     */
    function rowSlider(label, desc, key, opts, get, set) {
        const input = h('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step || 1 });
        input.value = get();
        const val = h('span', { class: 'val', text: `${get()} ${opts.unit}` });
        input.addEventListener('input', () => {
            val.textContent = `${input.value} ${opts.unit}`;
            set(parseFloat(input.value));
        });
        const info = h('div', { class: 'info' }, h('div', { class: 'label', text: label }));
        if (desc) info.appendChild(h('div', { class: 'desc', text: desc }));
        if (key) info.appendChild(h('div', { class: 'key', text: key }));
        const row = h('div', { class: 'row' }, info, h('div', { class: 'sw' }, input, val));
        row._input = input;
        row._val = val;
        row._unit = opts.unit;
        return row;
    }

    /**
     * Build one settings row with a hotkey-capture button.
     * Supports modifier combos; Escape cancels, Backspace/Delete clears.
     */
    function rowKeycap(label, desc, key, get, set) {
        const display = () => get() || T.notSet;
        const btn = h('button', { class: 'keycap', text: display() });
        btn.addEventListener('click', () => {
            btn.textContent = T.pressKey;
            const onKey = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (['Alt', 'Shift', 'Control', 'Meta'].includes(e.key)) return; // keep listening for the full combo
                window.removeEventListener('keydown', onKey, true);
                if (e.key === 'Backspace' || e.key === 'Delete') set('');
                else if (e.key !== 'Escape') {
                    const spec = buildHotkeySpec(e);
                    if (spec) set(spec);
                }
                btn.textContent = display();
            };
            window.addEventListener('keydown', onKey, true);
        });
        const info = h('div', { class: 'info' }, h('div', { class: 'label', text: label }));
        if (desc) info.appendChild(h('div', { class: 'desc', text: desc }));
        if (key) info.appendChild(h('div', { class: 'key', text: key }));
        const row = h('div', { class: 'row' }, info, btn);
        row._btn = btn;
        return row;
    }

    /**
     * Build one settings row with a number input.
     */
    function rowNumber(label, key, get, set, min) {
        const input = h('input', { type: 'number', min: min ?? 0 });
        input.value = get();
        input.addEventListener('change', () => set(parseFloat(input.value) || 0));
        const info = h('div', { class: 'info' }, h('div', { class: 'label', text: label }), h('div', { class: 'key', text: key }));
        const row = h('div', { class: 'row' }, info, input);
        row._input = input;
        return row;
    }

    /**
     * Rebuild the action-mapping rows for the selected zone.
     */
    function renderZoneRows() {
        const host = panelRefs.actionRows;
        host.textContent = '';
        panelRefs.zoneTitle.textContent = zoneDisplayName(selectedZone);
        const nameInput = h('input', { type: 'text', maxlength: '40', placeholder: T.zoneNames[selectedZone] });
        nameInput.value = userZoneNames[selectedZone];
        nameInput.addEventListener('change', () => {
            userZoneNames[selectedZone] = nameInput.value.trim().slice(0, 40);
            nameInput.value = userZoneNames[selectedZone];
            panelRefs.zoneTitle.textContent = zoneDisplayName(selectedZone);
            if (panelRefs.layoutZonebar) panelRefs.layoutZonebar();
            if (isZonesVisible) updateZoneVisuals();
        });
        host.appendChild(h('div', { class: 'arow' }, h('span', { class: 'ic', text: T.zoneNameLabel }), nameInput));
        const ma = CONFIG[selectedZone].mouse_action;
        for (const trig of ['left_click', 'right_click', 'middle_click', 'wheel_up', 'wheel_down']) {
            const cur = ma[trig] || { action: 'none', value: null };
            const sel = h('select');
            ACTION_DEFS.forEach(([act]) => {
                const o = h('option', { value: act, text: T.actions[act] });
                if (act === cur.action) o.selected = true;
                sel.appendChild(o);
            });
            const num = h('input', { type: 'number', step: 'any' });
            const unit = h('span', { class: 'unit' });
            const syncValueField = (def, value) => {
                num.style.visibility = def[1] ? 'visible' : 'hidden';
                unit.textContent = def[1] || '';
                num.value = value ?? '';
            };
            syncValueField(ACTION_DEFS.find(d => d[0] === cur.action) || ACTION_DEFS[0], cur.value);
            sel.addEventListener('change', () => {
                const def = ACTION_DEFS.find(d => d[0] === sel.value) || ACTION_DEFS[0];
                ma[trig] = { action: def[0], value: def[2] };
                syncValueField(def, def[2]);
                if (isZonesVisible) updateZoneVisuals();
            });
            num.addEventListener('change', () => {
                ma[trig] = { action: sel.value, value: parseFloat(num.value) || 0 };
                if (isZonesVisible) updateZoneVisuals();
            });
            host.appendChild(h('div', { class: 'arow' }, h('span', { class: 'ic', text: T.triggers[trig] }), sel, num, unit));
        }
    }

    /**
     * Dim/undim manual-filter and adaptive-tuning sections per ADAPTIVE_WHEEL.
     */
    function syncAdaptiveDim() {
        panelRefs.manualRows.forEach(r => r.classList.toggle('dim', SETTINGS.ADAPTIVE_WHEEL));
        panelRefs.stepRow.classList.toggle('dim', !SETTINGS.ADAPTIVE_WHEEL);
        panelRefs.advBody.classList.toggle('dim', !SETTINGS.ADAPTIVE_WHEEL);
    }

    /**
     * Build the settings panel once and attach it (hidden) to the document.
     */
    function ensurePanel() {
        if (panelHost) return;
        panelHost = document.createElement('div');
        panelHost.style.display = 'none';
        const shadow = panelHost.attachShadow({ mode: 'open' });
        shadow.appendChild(h('style', { text: PANEL_CSS }));

        const refs = {};

        // --- General pane ---
        const adaptiveRow = rowToggle(T.adaptive, T.adaptiveDesc, 'ADAPTIVE_WHEEL',
            () => SETTINGS.ADAPTIVE_WHEEL, v => { SETTINGS.ADAPTIVE_WHEEL = v; syncAdaptiveDim(); });
        const themeSeg = h('div', { class: 'seg' });
        [['auto', T.themeAuto], ['light', T.themeLight], ['dark', T.themeDark]].forEach(([v, lbl]) => {
            const b = h('button', { text: lbl });
            if (uiTheme === v) b.classList.add('on');
            b.addEventListener('click', () => {
                uiTheme = v;
                themeSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
                b.classList.add('on');
                applyPanelTheme();
            });
            themeSeg.appendChild(b);
        });
        refs.themeSeg = themeSeg;
        const langSel = h('select');
        [['auto', T.themeAuto], ['en', 'English'], ['zh-TW', '繁體中文'], ['zh-CN', '简体中文'],
         ['ja', '日本語'], ['ko', '한국어'], ['pt', 'Português'], ['es', 'Español']].forEach(([v, lbl]) => {
            const o = h('option', { value: v, text: lbl });
            if (uiLang === v) o.selected = true;
            langSel.appendChild(o);
        });
        langSel.addEventListener('change', () => {
            uiLang = langSel.value;
            T = I18N[resolveLocale()];
            syncPanelUI();
        });
        const paneGeneral = h('section', { class: 'pane on' },
            h('h2', { text: T.secCore }),
            adaptiveRow,
            rowKeycap(T.zoneKey, T.zoneKeyDesc, 'ZONE_TOGGLE_KEY', () => SETTINGS.ZONE_TOGGLE_KEY, v => { SETTINGS.ZONE_TOGGLE_KEY = v; }),
            rowKeycap(T.panelKey, null, 'SETTINGS_TOGGLE_KEY', () => SETTINGS.SETTINGS_TOGGLE_KEY, v => { SETTINGS.SETTINGS_TOGGLE_KEY = v; }),
            h('div', { class: 'row' }, h('div', { class: 'info' }, h('div', { class: 'label', text: T.theme })), themeSeg),
            h('div', { class: 'row' }, h('div', { class: 'info' }, h('div', { class: 'label', text: T.language })), langSel),
            h('h2', { text: T.secOsd }),
            rowSlider(T.osdSize, null, 'OSD_FONT_SIZE', { min: 16, max: 48, unit: 'px' },
                () => parseInt(SETTINGS.OSD_FONT_SIZE, 10) || 28, v => { SETTINGS.OSD_FONT_SIZE = `${v}px`; }),
            rowSlider(T.osdDuration, null, 'OSD_DURATION', { min: 300, max: 2000, step: 50, unit: 'ms' },
                () => SETTINGS.OSD_DURATION, v => { SETTINGS.OSD_DURATION = v; })
        );

        // --- Zones pane ---
        const zonebar = h('div', { class: 'zonebar' });
        const zoneFills = ['rgba(255,93,93,0.30)', 'rgba(87,201,116,0.28)', 'rgba(91,141,255,0.30)'];
        const zoneBtns = [];
        const zoneHandles = [];
        const layoutZonebar = () => {
            const widths = getZoneWidths();
            let x = 0;
            zoneBtns.forEach((b, i) => {
                b.style.width = `${widths[i]}%`;
                b.querySelector('.zn').textContent = zoneDisplayName(i);
                b.querySelector('.zw').textContent = `${Math.round(widths[i])}%`;
                x += widths[i];
                if (zoneHandles[i]) zoneHandles[i].style.left = `${x}%`;
            });
        };
        CONFIG.forEach((zone, i) => {
            const b = h('button', {},
                h('span', { class: 'zn' }),
                h('span', { class: 'zw' }));
            b.style.background = zoneFills[i % zoneFills.length];
            if (i === selectedZone) b.classList.add('sel');
            b.addEventListener('click', () => {
                selectedZone = i;
                zonebar.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
                b.classList.add('sel');
                renderZoneRows();
            });
            zoneBtns.push(b);
            zonebar.appendChild(b);
        });
        for (let i = 0; i < CONFIG.length - 1; i++) {
            const handle = h('div', { class: 'zhandle' }, h('div', { class: 'grip' }));
            handle.addEventListener('pointerdown', ev => {
                ev.preventDefault();
                handle.setPointerCapture(ev.pointerId);
                handle.classList.add('drag');
                const rect = zonebar.getBoundingClientRect();
                const start = getZoneWidths();
                const pairTotal = start[i] + start[i + 1];
                const leftEdge = start.slice(0, i).reduce((a, b) => a + b, 0);
                const onMove = e => {
                    const raw = ((e.clientX - rect.left) / rect.width) * 100 - leftEdge;
                    const w = Math.max(MIN_ZONE_WIDTH_PCT, Math.min(pairTotal - MIN_ZONE_WIDTH_PCT, Math.round(raw)));
                    const widths = getZoneWidths();
                    if (w === widths[i]) return;
                    widths[i] = w;
                    widths[i + 1] = pairTotal - w;
                    setZoneWidths(widths);
                    layoutZonebar();
                    if (isZonesVisible) updateZoneVisuals();
                };
                const onUp = () => {
                    handle.classList.remove('drag');
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onUp);
                    handle.removeEventListener('pointercancel', onUp);
                };
                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onUp);
                handle.addEventListener('pointercancel', onUp);
            });
            zoneHandles.push(handle);
            zonebar.appendChild(handle);
        }
        layoutZonebar();
        refs.layoutZonebar = layoutZonebar;
        refs.zoneTitle = h('h2', { text: '' });
        refs.actionRows = h('div');
        const paneZones = h('section', { class: 'pane' },
            h('h2', { text: T.secPickZone }), zonebar,
            h('div', { class: 'geom-note', text: T.geomNote }),
            refs.zoneTitle, refs.actionRows);

        // --- Wheel pane ---
        refs.stepRow = rowSlider(T.step, T.stepDesc, 'WHEEL_STEP', { min: 50, max: 180, step: 10, unit: 'px' },
            () => SETTINGS.WHEEL_STEP, v => { SETTINGS.WHEEL_STEP = v; });
        const hints = h('div', { class: 'hints' }, h('span', { text: T.hintFine }), h('span', { text: T.hintSteady }));
        const advBtn = h('button', { class: 'advbtn' }, h('span', { class: 'car', text: '▸' }), document.createTextNode(T.advTuning));
        refs.advBody = h('div', { class: 'advbody' },
            rowSlider(T.gap, null, 'GESTURE_GAP', { min: 80, max: 400, step: 10, unit: 'ms' }, () => SETTINGS.GESTURE_GAP, v => { SETTINGS.GESTURE_GAP = v; }),
            rowSlider(T.mai, null, 'MIN_ACTION_INTERVAL', { min: 30, max: 200, step: 10, unit: 'ms' }, () => SETTINGS.MIN_ACTION_INTERVAL, v => { SETTINGS.MIN_ACTION_INTERVAL = v; }),
            rowSlider(T.imp, null, 'IMPULSE_MIN', { min: 5, max: 60, step: 5, unit: 'px' }, () => SETTINGS.IMPULSE_MIN, v => { SETTINGS.IMPULSE_MIN = v; }),
            rowSlider(T.rf, null, 'REACCEL_FACTOR', { min: 1.2, max: 2.5, step: 0.1, unit: '×' }, () => SETTINGS.REACCEL_FACTOR, v => { SETTINGS.REACCEL_FACTOR = v; }),
            rowSlider(T.ds, null, 'DISCRETE_SETTLE', { min: 30, max: 150, step: 10, unit: 'ms' }, () => SETTINGS.DISCRETE_SETTLE, v => { SETTINGS.DISCRETE_SETTLE = v; })
        );
        advBtn.addEventListener('click', () => {
            advBtn.classList.toggle('open');
            refs.advBody.classList.toggle('open');
        });
        const manualToggle = rowToggle(T.countMode, T.countModeDesc, 'USE_WHEEL_COUNT_FIXED',
            () => SETTINGS.USE_WHEEL_COUNT_FIXED, v => { SETTINGS.USE_WHEEL_COUNT_FIXED = v; });
        const manualCount = rowNumber(T.countTh, 'WHEEL_COUNT_THRESHOLD', () => SETTINGS.WHEEL_COUNT_THRESHOLD, v => { SETTINGS.WHEEL_COUNT_THRESHOLD = v; }, 1);
        const manualDelay = rowNumber(T.delay, 'WHEEL_DELAY', () => SETTINGS.WHEEL_DELAY, v => { SETTINGS.WHEEL_DELAY = v; }, 0);
        refs.manualRows = [manualToggle, manualCount, manualDelay];
        const paneWheel = h('section', { class: 'pane' },
            h('h2', { text: T.secTuning }), refs.stepRow, hints, advBtn, refs.advBody,
            h('h2', { text: T.secManual }), manualToggle, manualCount, manualDelay);

        // --- Advanced pane ---
        const importInput = h('input', { type: 'file', accept: '.json,application/json' });
        importInput.style.display = 'none';
        importInput.addEventListener('change', () => {
            const file = importInput.files && importInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!data || typeof data !== 'object' || !data.settings) throw new Error('bad shape');
                    applyState(data);
                    persistSettings();
                    syncPanelUI();
                    showPanelToast(T.toastImported);
                } catch (e) {
                    showPanelToast(T.importError);
                }
                importInput.value = '';
            };
            reader.readAsText(file);
        });
        const exportBtn = h('button', { class: 'btn', text: T.btnExport });
        exportBtn.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(captureState(), null, 2)], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: 'mouse-master-settings.json' });
            a.click();
            URL.revokeObjectURL(a.href);
        });
        const importBtn = h('button', { class: 'btn', text: T.btnImport });
        importBtn.addEventListener('click', () => importInput.click());
        const resetBtn = h('button', { class: 'btn', text: T.btnReset });
        resetBtn.addEventListener('click', () => {
            applyState({ settings: FACTORY.settings, zoneActions: FACTORY.zoneActions, zoneWidths: FACTORY.zoneWidths, zoneNames: FACTORY.zoneNames, theme: 'auto', lang: 'auto' });
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
            syncPanelUI();
            showPanelToast(T.toastReset);
        });
        const paneAdvanced = h('section', { class: 'pane' },
            h('h2', { text: T.secMisc }),
            rowSlider(T.osdFade, null, 'OSD_FADE_OUT', { min: 50, max: 500, step: 10, unit: 'ms' }, () => SETTINGS.OSD_FADE_OUT, v => { SETTINGS.OSD_FADE_OUT = v; }),
            rowToggle(T.debug, T.debugDesc, 'DEBUG', () => SETTINGS.DEBUG, v => { SETTINGS.DEBUG = v; }),
            h('h2', { text: T.secData }),
            h('div', { class: 'row' },
                h('div', { class: 'info' }, h('div', { class: 'label', text: T.exportImport }), h('div', { class: 'desc', text: T.exportImportDesc })),
                exportBtn, importBtn, importInput),
            h('div', { class: 'row' },
                h('div', { class: 'info' }, h('div', { class: 'label', text: T.reset }), h('div', { class: 'desc', text: T.resetDesc })),
                resetBtn)
        );

        // --- Frame ---
        const panes = { general: paneGeneral, zones: paneZones, wheel: paneWheel, advanced: paneAdvanced };
        const nav = h('nav');
        [['general', T.tabGeneral], ['zones', T.tabZones], ['wheel', T.tabWheel], ['advanced', T.tabAdvanced]].forEach(([id, lbl], i) => {
            const b = h('button', { text: lbl });
            if (i === 0) b.classList.add('on');
            b.addEventListener('click', () => {
                nav.querySelectorAll('button').forEach(x => x.classList.remove('on'));
                Object.values(panes).forEach(p => p.classList.remove('on'));
                b.classList.add('on');
                panes[id].classList.add('on');
            });
            nav.appendChild(b);
        });

        const closeBtn = h('button', { class: 'x', text: '✕', title: T.close });
        closeBtn.addEventListener('click', () => closePanel(true));
        const cancelBtn = h('button', { class: 'btn', text: T.btnCancel });
        cancelBtn.addEventListener('click', () => closePanel(true));
        const saveBtn = h('button', { class: 'btn primary', text: T.btnSave });
        saveBtn.addEventListener('click', () => {
            persistSettings();
            closePanel(false);
        });

        refs.toast = h('div', { class: 'toast' });
        refs.wrap = h('div', { class: 'wrap' },
            h('div', { class: 'modal', role: 'dialog', 'aria-label': T.title },
                h('div', { class: 'head' },
                    h('div', { class: 'logo' }),
                    h('h1', { text: T.title }),
                    h('span', { class: 'chip', text: SITE === 'bilibili' ? 'Bilibili' : 'YouTube' }),
                    closeBtn),
                h('div', { class: 'body' }, nav, h('main', {}, paneGeneral, paneZones, paneWheel, paneAdvanced)),
                h('div', { class: 'foot' }, cancelBtn, saveBtn)),
            refs.toast);
        refs.wrap.addEventListener('mousedown', e => e.stopPropagation());
        refs.wrap.addEventListener('click', e => e.stopPropagation());
        refs.wrap.addEventListener('wheel', e => e.stopPropagation());
        refs.wrap.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Escape') closePanel(true);
        });
        shadow.appendChild(refs.wrap);

        refs.paneGeneral = paneGeneral;
        refs.paneWheel = paneWheel;
        refs.paneAdvanced = paneAdvanced;
        panelRefs = refs;
        document.body.appendChild(panelHost);
        renderZoneRows();
        syncAdaptiveDim();
        applyPanelTheme();
    }

    /**
     * Refresh every control from the live SETTINGS/CONFIG (after import/reset).
     * Rebuilding is the simplest way to stay consistent.
     */
    function syncPanelUI() {
        if (!panelHost) return;
        const wasOpen = panelHost.style.display !== 'none';
        panelHost.remove();
        panelHost = null;
        panelRefs = null;
        ensurePanel();
        if (wasOpen) panelHost.style.display = '';
    }

    /**
     * Open the settings panel, capturing state for cancel/revert.
     */
    function openPanel() {
        ensurePanel();
        panelSnapshot = captureState();
        applyPanelTheme();
        panelHost.style.display = '';
    }

    /**
     * Close the settings panel.
     *
     * @param {boolean} revert True restores the state captured at open.
     */
    function closePanel(revert) {
        if (!panelHost) return;
        if (revert && panelSnapshot) {
            applyState(panelSnapshot);
            syncPanelUI();
        }
        panelHost.style.display = 'none';
    }

    /**
     * Toggle the settings panel.
     */
    function togglePanel() {
        if (panelHost && panelHost.style.display !== 'none') closePanel(true);
        else openPanel();
    }

    // Mouse silhouette with a scroll-wheel slot (even-odd cutout) — deliberately
    // not a gear, to avoid confusion with the players' native settings buttons
    const ICON_PATH = 'M12 3c-2.76 0-5 2.24-5 5v8c0 2.76 2.24 5 5 5s5-2.24 5-5V8c0-2.76-2.24-5-5-5zM12 6.2c.55 0 1 .45 1 1v3.6c0 .55-.45 1-1 1s-1-.45-1-1V7.2c0-.55.45-1 1-1z';

    /**
     * Build the settings icon via DOM APIs.
     * innerHTML is not usable here: YouTube enforces a Trusted Types CSP that
     * rejects string HTML assignment in the page context.
     *
     * @param {string} viewBox The SVG viewBox; padding is baked in here so the
     *   glyph scales like the player's native icons.
     *
     * @returns {SVGSVGElement} The icon SVG element.
     */
    function createIconSvg(viewBox) {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', viewBox);
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', ICON_PATH);
        path.setAttribute('fill-rule', 'evenodd');
        svg.appendChild(path);
        return svg;
    }

    /**
     * Wire shared behavior (hover, click-to-open) onto a settings button.
     *
     * @param {HTMLButtonElement} btn The button element.
     */
    function wireSettingsButton(btn) {
        btn.style.opacity = '0.85';
        btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
        btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.85'; });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            openPanel();
        }, { capture: true });
    }

    /**
     * Inject the settings entry button into the player's control bar,
     * following the placement convention used by Immersive Translate
     * (YouTube: .ytp-right-controls, Bilibili: .bpx-player-control-bottom-right).
     * Falls back to a floating gear over the player when no control bar exists.
     */
    function injectSettingsButton() {
        if (window.location.pathname.startsWith('/shorts/')) return;
        if (document.querySelector('.ytmm-settings-btn')) return;

        const cb = ADAPTER.controlBar;
        const barHost = cb && document.querySelector(cb.host);
        if (barHost) {
            const btn = document.createElement('button');
            btn.title = 'Slippy Mouse';
            if (SITE === 'youtube') {
                // .ytp-button provides the box size and hover behavior across
                // YouTube's size modes; flex-center a proportional glyph inside
                // it instead of relying on YT's internal glyph offsets.
                // vertical-align: top guards against inline-block baseline
                // shifts (same approach as Immersive Translate's button CSS).
                btn.className = 'ytmm-settings-btn ytp-button';
                Object.assign(btn.style, {
                    display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', verticalAlign: 'top', padding: '0'
                });
                const svg = createIconSvg('0 0 24 24');
                Object.assign(svg.style, { width: '46%', height: '46%', display: 'block' });
                svg.style.fill = '#fff';
                btn.appendChild(svg);
            } else {
                // Reuse Bilibili's native control-button class for baseline
                // sizing, then center the glyph explicitly
                btn.className = 'ytmm-settings-btn bpx-player-ctrl-btn';
                Object.assign(btn.style, {
                    width: '36px', border: 'none', background: 'none',
                    padding: '0', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    verticalAlign: 'middle'
                });
                const svg = createIconSvg('0 0 24 24');
                Object.assign(svg.style, { width: '18px', height: '18px', display: 'block' });
                svg.style.fill = 'hsla(0, 0%, 100%, 0.9)';
                btn.appendChild(svg);
            }
            wireSettingsButton(btn);
            const before = cb.before && barHost.querySelector(cb.before);
            barHost.insertBefore(btn, before || barHost.firstChild);
            return;
        }

        // Fallback: floating button over the player
        if (!player || !player.appendChild) return;
        const btn = document.createElement('button');
        btn.className = 'ytmm-settings-btn';
        btn.title = 'Slippy Mouse';
        Object.assign(btn.style, {
            position: 'absolute', top: '12px', right: '12px',
            width: '30px', height: '30px', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(0,0,0,0.45)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '0', zIndex: '2147483646', transition: 'opacity 0.15s'
        });
        const svg = createIconSvg('0 0 24 24');
        Object.assign(svg.style, { width: '16px', height: '16px', display: 'block' });
        svg.style.fill = '#fff';
        btn.appendChild(svg);
        wireSettingsButton(btn);
        player.appendChild(btn);
    }

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
            injectSettingsButton();
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

    // Hotkey listener for zone visibility and the settings panel
    document.addEventListener('keydown', (e) => {
        // Ignore hotkeys while typing (search box, danmaku input, comments)
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

        if (matchHotkey(e, SETTINGS.ZONE_TOGGLE_KEY)) {
            e.preventDefault();
            isZonesVisible = !isZonesVisible;
            updateZoneVisuals();
            showOSD(isZonesVisible ? "👀 Zones Visible" : "🙈 Zones Hidden");
        } else if (matchHotkey(e, SETTINGS.SETTINGS_TOGGLE_KEY)) {
            e.preventDefault();
            togglePanel();
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