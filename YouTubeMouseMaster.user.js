// ==UserScript==
// @name         YouTube Mouse Master
// @namespace    https://github.com/navishachiku/youtube-mouse-master
// @version      0.6
// @description  High-performance YouTube player interaction script: support three-zone control, progress seek, prevent event penetration, high-frequency wheel filtering, and fix OSD timer conflicts.
// @author       navishachiku & Gemini
// @match        *://www.youtube.com/*
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

    log('Script loaded, preparing for initialization...');

    // State variables
    let lastWheelTime = 0;
    let wheelCount = 0;
    
    // Global player reference (API interface)
    let player = null;
    
    // Internal reference for the DOM element we are listening to
    let activeBoundPlayer = null;

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
            if (typeof player.getVolume !== 'function') return;
            const next = Math.min(100, player.getVolume() + val);
            player.setVolume(next);
            if (player.isMuted && player.isMuted()) player.unMute();
            showOSD(`🔊 ${next}%`);
        },
        volume_down: (val) => {
            if (typeof player.getVolume !== 'function') return;
            const next = Math.max(0, player.getVolume() - val);
            player.setVolume(next);
            showOSD(`🔊 ${next}%`);
        },
        volume_set: (val) => {
            if (typeof player.setVolume !== 'function') return;
            player.setVolume(val);
            if (player.isMuted && player.isMuted() && val > 0) player.unMute();
            showOSD(val === 0 ? `🔊 Mute` : `🔊 ${val}%`);
        },
        seek: (delta) => {
            if (typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') return;
            const current = player.getCurrentTime();
            const duration = player.getDuration();
            const next = Math.max(0, Math.min(duration, current + delta));
            player.seekTo(next, true);
            showOSD(`${delta > 0 ? '⏩' : '⏪'} ${formatTime(next)} / ${formatTime(duration)}`);
        },
        toggle_play_pause: () => {
            if (typeof player.getPlayerState !== 'function') return;
            const state = player.getPlayerState();
            if (state === 1) {
                player.pauseVideo();
                showOSD('⏸️');
            } else {
                player.playVideo();
                showOSD('▶️');
            }
        },
        speed_up: (val) => {
            if (typeof player.getPlaybackRate !== 'function') return;
            const next = player.getPlaybackRate() + val;
            player.setPlaybackRate(next);
            showOSD(`🚀 ${next.toFixed(2)}x`);
        },
        speed_down: (val) => {
            if (typeof player.getPlaybackRate !== 'function') return;
            const next = Math.max(0.25, player.getPlaybackRate() - val);
            player.setPlaybackRate(next);
            showOSD(`🐢 ${next.toFixed(2)}x`);
        },
        speed_set: (val) => {
            if (typeof player.setPlaybackRate !== 'function') return;
            player.setPlaybackRate(val);
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
        if (target.closest('button, a, .ytp-progress-bar-container, .ytp-volume-panel, .ytp-settings-menu, .ytp-popup, .ytp-chrome-bottom')) {
            return null;
        }

        // 2. Identify the true Visual Player (for coordinates)
        let visualPlayer = boundEl;
        
        // If we bound to the wrapper (Shorts or Normal), dig down to the actual video player for sizing
        if (boundEl.tagName.toLowerCase() === 'ytd-reel-video-renderer' || boundEl.tagName.toLowerCase() === 'ytd-player') {
             const inner = boundEl.querySelector('.html5-video-player');
             if (inner) visualPlayer = inner;
        }
        
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
     * Find the element that actually has the YouTube API methods.
     * 
     * @param {HTMLElement} element The starting element to search from.
     * @returns {Object|null} The player object with API methods.
     */
    function getAPIPlayer(element) {
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

    /**
     * Handle mouse wheel events.
     * 
     * @param {WheelEvent} e The wheel event.
     */
    function onWheel(e) {
        // Robust Shorts detection
        const isShorts = window.location.pathname.startsWith('/shorts/');
        const result = getTargetZone(e, e.currentTarget);

        if (!result) {
            // Prevent default ONLY if scrolling inside comments/engagement panel
            if (isShorts && e.target.closest('ytd-engagement-panel-section-list-renderer, ytd-comments, #comments')) return;
        }
        
        const { zone, player: visualElement } = result;

        e.preventDefault();
        e.stopImmediatePropagation();

        // --- Controller Resolution ---
        // Find the actual API object to control
        const apiPlayer = getAPIPlayer(visualElement);
        if (!apiPlayer) {
            log('[Error] Zone matched but NO API PLAYER found!');
            return;
        }
        
        // Update global 'player' for Actions usage (backward compatibility with Actions object)
        player = apiPlayer;

        if (SETTINGS.USE_WHEEL_COUNT_FIXED) {
            wheelCount++;
            if (wheelCount < SETTINGS.WHEEL_COUNT_THRESHOLD) {
                // console.log('[YTM Debug] Throttled by Count:', wheelCount);
                return;
            }
            wheelCount = 0;
        } else {
            const now = Date.now();
            if (now - lastWheelTime < SETTINGS.WHEEL_DELAY) {
                // console.log('[YTM Debug] Throttled by Time');
                return;
            }
            lastWheelTime = now;
        }

        const actionKey = e.deltaY < 0 ? 'wheel_up' : 'wheel_down';
        const cfg = zone.mouse_action[actionKey];
        
        if (cfg && Actions[cfg.action]) {
            // log(`[Action] Wheel trigger: ${cfg.action}`);
            Actions[cfg.action](cfg.value);
            if (player.showControls) player.showControls();
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
        
        const apiPlayer = getAPIPlayer(visualElement);
        if (apiPlayer) player = apiPlayer;

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
        // Find all potential players:
        // 1. #movie_player (Normal - old)
        // 2. ytd-player (Normal Wrapper - Better capture)
        // 3. .html5-video-player (Fallback)
        const players = document.querySelectorAll('#movie_player, ytd-player, .html5-video-player');
        console.log("🚀 ~ checkAndBindPlayers ~ players:", players)
        
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
                if (!window.location.pathname.startsWith('/shorts/') && p.id === 'movie_player') {
                    const osd = createOSD();
                    if (!p.contains(osd)) p.appendChild(osd);
                }
            }
        });
        
        // Update global reference for fallback
        const mainPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (mainPlayer) player = mainPlayer;
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

    window.addEventListener('yt-navigate-finish', () => {
        log('SPA navigation completed, refreshing bindings...');
        init();
    });

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

    // Polling observer to catch dynamically added players (Shorts infinite scroll)
    const observer = new MutationObserver(() => {
        checkAndBindPlayers();
    });
    observer.observe(document.body, { childList: true, subtree: true });

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