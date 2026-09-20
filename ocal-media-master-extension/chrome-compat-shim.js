/**
 * Ocal Browser - Universal Chrome Extension Compatibility Polyfill Engine
 * Provides comprehensive stubs, polyfills, and event emulators for Chrome Extension APIs
 * that are missing or incomplete in Electron (chrome.windows, chrome.storage.sync,
 * chrome.action, chrome.scripting, chrome.declarativeContent, chrome.alarms, etc.).
 */

(function () {
    if (typeof self === 'undefined' && typeof window === 'undefined' && typeof global === 'undefined') return;
    const g = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window);
    if (!g.chrome) g.chrome = {};
    const chrome = g.chrome;

    function createEventObject() {
        const listeners = new Set();
        return {
            addListener: function (fn) {
                if (typeof fn === 'function') listeners.add(fn);
            },
            removeListener: function (fn) {
                listeners.delete(fn);
            },
            hasListener: function (fn) {
                return listeners.has(fn);
            },
            hasListeners: function () {
                return listeners.size > 0;
            },
            _dispatch: function (...args) {
                for (const fn of listeners) {
                    try { fn(...args); } catch (err) { console.warn('[Ocal Extension Polyfill Event]:', err); }
                }
            }
        };
    }

    // ── 1. chrome.windows API (Missing in Electron) ───────────────────────────
    if (!chrome.windows) chrome.windows = {};
    if (!chrome.windows.onFocusChanged) chrome.windows.onFocusChanged = createEventObject();
    if (!chrome.windows.onCreated) chrome.windows.onCreated = createEventObject();
    if (!chrome.windows.onRemoved) chrome.windows.onRemoved = createEventObject();
    if (!chrome.windows.onBoundsChanged) chrome.windows.onBoundsChanged = createEventObject();

    chrome.windows.WINDOW_ID_NONE = -1;
    chrome.windows.WINDOW_ID_CURRENT = -2;

    const mockWindow = {
        id: 1,
        focused: true,
        top: 0,
        left: 0,
        width: 1280,
        height: 800,
        type: 'normal',
        state: 'normal',
        alwaysOnTop: false,
        incognito: false
    };

    if (!chrome.windows.getCurrent) {
        chrome.windows.getCurrent = function (getInfo, cb) {
            const callback = typeof getInfo === 'function' ? getInfo : cb;
            if (typeof callback === 'function') setTimeout(() => callback(mockWindow), 0);
            return Promise.resolve(mockWindow);
        };
    }
    if (!chrome.windows.getLastFocused) {
        chrome.windows.getLastFocused = function (getInfo, cb) {
            const callback = typeof getInfo === 'function' ? getInfo : cb;
            if (typeof callback === 'function') setTimeout(() => callback(mockWindow), 0);
            return Promise.resolve(mockWindow);
        };
    }
    if (!chrome.windows.getAll) {
        chrome.windows.getAll = function (getInfo, cb) {
            const callback = typeof getInfo === 'function' ? getInfo : cb;
            if (typeof callback === 'function') setTimeout(() => callback([mockWindow]), 0);
            return Promise.resolve([mockWindow]);
        };
    }
    if (!chrome.windows.get) {
        chrome.windows.get = function (windowId, getInfo, cb) {
            const callback = typeof getInfo === 'function' ? getInfo : cb;
            if (typeof callback === 'function') setTimeout(() => callback(mockWindow), 0);
            return Promise.resolve(mockWindow);
        };
    }
    if (!chrome.windows.create) {
        chrome.windows.create = function (createData, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(mockWindow), 0);
            return Promise.resolve(mockWindow);
        };
    }
    if (!chrome.windows.update) {
        chrome.windows.update = function (windowId, updateInfo, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(mockWindow), 0);
            return Promise.resolve(mockWindow);
        };
    }
    if (!chrome.windows.remove) {
        chrome.windows.remove = function (windowId, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(), 0);
            return Promise.resolve();
        };
    }

    // ── 2. chrome.storage.sync & session Fallbacks ────────────────────────────
    if (!chrome.storage) chrome.storage = {};

    const createStorageFallback = () => {
        const store = new Map();
        return {
            get: function (keys, cb) {
                const res = {};
                if (typeof keys === 'string') {
                    if (store.has(keys)) res[keys] = store.get(keys);
                } else if (Array.isArray(keys)) {
                    keys.forEach(k => { if (store.has(k)) res[k] = store.get(k); });
                } else if (keys && typeof keys === 'object') {
                    Object.keys(keys).forEach(k => {
                        res[k] = store.has(k) ? store.get(k) : keys[k];
                    });
                } else {
                    store.forEach((v, k) => { res[k] = v; });
                }
                if (typeof cb === 'function') setTimeout(() => cb(res), 0);
                return Promise.resolve(res);
            },
            set: function (items, cb) {
                if (items && typeof items === 'object') {
                    Object.entries(items).forEach(([k, v]) => store.set(k, v));
                }
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            },
            remove: function (keys, cb) {
                const arr = Array.isArray(keys) ? keys : [keys];
                arr.forEach(k => store.delete(k));
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            },
            clear: function (cb) {
                store.clear();
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            },
            getBytesInUse: function (keys, cb) {
                if (typeof cb === 'function') setTimeout(() => cb(0), 0);
                return Promise.resolve(0);
            }
        };
    };

    const fallbackStore = createStorageFallback();

    if (chrome.storage.local && chrome.storage.local.get) {
        const originalLocalGet = chrome.storage.local.get.bind(chrome.storage.local);
        chrome.storage.local.get = function (keys, cb) {
            const callback = typeof keys === 'function' ? keys : cb;
            const targetKeys = typeof keys === 'function' ? null : keys;
            try {
                return originalLocalGet(targetKeys, function (res) {
                    const safeRes = res || {};
                    if (targetKeys && typeof targetKeys === 'object' && !Array.isArray(targetKeys)) {
                        Object.keys(targetKeys).forEach(k => {
                            if (safeRes[k] === undefined) safeRes[k] = targetKeys[k];
                        });
                    }
                    if (typeof callback === 'function') callback(safeRes);
                });
            } catch (err) {
                return fallbackStore.get(keys, cb);
            }
        };
    } else {
        chrome.storage.local = fallbackStore;
    }

    chrome.storage.sync = chrome.storage.local || fallbackStore;
    if (!chrome.storage.session) {
        chrome.storage.session = createStorageFallback();
    }

    // ── 3. chrome.action & chrome.browserAction & chrome.pageAction ───────────
    const createActionShim = () => ({
        onClicked: createEventObject(),
        setTitle: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        getTitle: function (details, cb) { if (typeof cb === 'function') cb(''); return Promise.resolve(''); },
        setIcon: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        setPopup: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        getPopup: function (details, cb) { if (typeof cb === 'function') cb(''); return Promise.resolve(''); },
        setBadgeText: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        getBadgeText: function (details, cb) { if (typeof cb === 'function') cb(''); return Promise.resolve(''); },
        setBadgeBackgroundColor: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        getBadgeBackgroundColor: function (details, cb) { if (typeof cb === 'function') cb([0, 0, 0, 0]); return Promise.resolve([0, 0, 0, 0]); },
        setBadgeTextColor: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        getBadgeTextColor: function (details, cb) { if (typeof cb === 'function') cb([255, 255, 255, 255]); return Promise.resolve([255, 255, 255, 255]); },
        enable: function (tabId, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        disable: function (tabId, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        getUserSettings: function (cb) { const s = { isOnToolbar: true }; if (typeof cb === 'function') cb(s); return Promise.resolve(s); },
        openPopup: function (options, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); }
    });

    const shimAction = createActionShim();
    if (!chrome.action) chrome.action = shimAction;
    else {
        for (const k in shimAction) {
            if (typeof chrome.action[k] === 'undefined') chrome.action[k] = shimAction[k];
        }
    }

    const shimBrowserAction = createActionShim();
    if (!chrome.browserAction) chrome.browserAction = shimBrowserAction;
    else {
        for (const k in shimBrowserAction) {
            if (typeof chrome.browserAction[k] === 'undefined') chrome.browserAction[k] = shimBrowserAction[k];
        }
    }

    if (!chrome.pageAction) {
        chrome.pageAction = {
            ...createActionShim(),
            show: function (tabId, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
            hide: function (tabId, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); }
        };
    }

    // ── Privacy & Identity Stubs for Extensions like uBlock Origin & Return YouTube Dislike ──
    const createPrivacySettingStub = () => ({
        get: function (details, cb) { const res = { value: true, levelOfControl: 'controllable_by_this_extension' }; if (typeof cb === 'function') cb(res); return Promise.resolve(res); },
        set: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        clear: function (details, cb) { if (typeof cb === 'function') cb(); return Promise.resolve(); },
        onChange: createEventObject()
    });
    if (!chrome.privacy) chrome.privacy = {};
    if (!chrome.privacy.network) chrome.privacy.network = {};
    if (!chrome.privacy.network.networkPredictionEnabled) chrome.privacy.network.networkPredictionEnabled = createPrivacySettingStub();
    if (!chrome.privacy.network.webRTCIPHandlingPolicy) chrome.privacy.network.webRTCIPHandlingPolicy = createPrivacySettingStub();
    if (!chrome.privacy.websites) chrome.privacy.websites = {};
    if (!chrome.privacy.websites.hyperlinkAuditingEnabled) chrome.privacy.websites.hyperlinkAuditingEnabled = createPrivacySettingStub();
    if (!chrome.privacy.services) chrome.privacy.services = {};

    if (!chrome.identity) chrome.identity = {
        getAuthToken: function (details, cb) { if (typeof cb === 'function') cb(''); return Promise.resolve(''); },
        getProfileUserInfo: function (details, cb) { const info = { email: '', id: '' }; if (typeof cb === 'function') cb(info); return Promise.resolve(info); },
        onSignInChanged: createEventObject()
    };

    // ── 4. chrome.scripting API (MV3 Script Injection) ────────────────────────
    if (!chrome.scripting) {
        chrome.scripting = {
            executeScript: function (injection, cb) {
                if (typeof cb === 'function') setTimeout(() => cb([{ result: true }]), 0);
                return Promise.resolve([{ result: true }]);
            },
            insertCSS: function (injection, cb) {
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            },
            removeCSS: function (injection, cb) {
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            },
            registerContentScripts: function (scripts, cb) {
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            },
            getRegisteredContentScripts: function (filter, cb) {
                if (typeof cb === 'function') setTimeout(() => cb([]), 0);
                return Promise.resolve([]);
            },
            unregisterContentScripts: function (filter, cb) {
                if (typeof cb === 'function') setTimeout(() => cb(), 0);
                return Promise.resolve();
            }
        };
    }

    // ── 5. chrome.tabs Polyfills ──────────────────────────────────────────────
    if (!chrome.tabs) chrome.tabs = {};
    if (!chrome.tabs.onActivated) chrome.tabs.onActivated = createEventObject();
    if (!chrome.tabs.onUpdated) chrome.tabs.onUpdated = createEventObject();
    if (!chrome.tabs.onCreated) chrome.tabs.onCreated = createEventObject();
    if (!chrome.tabs.onRemoved) chrome.tabs.onRemoved = createEventObject();
    if (!chrome.tabs.onHighlighted) chrome.tabs.onHighlighted = createEventObject();

    const mockTab = {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        url: 'https://google.com',
        title: 'New Tab',
        status: 'complete',
        incognito: false,
        width: 1280,
        height: 800
    };

    if (!chrome.tabs.query) {
        chrome.tabs.query = function (queryInfo, cb) {
            if (typeof cb === 'function') setTimeout(() => cb([mockTab]), 0);
            return Promise.resolve([mockTab]);
        };
    }
    if (!chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent = function (cb) {
            if (typeof cb === 'function') setTimeout(() => cb(mockTab), 0);
            return Promise.resolve(mockTab);
        };
    }
    if (!chrome.tabs.get) {
        chrome.tabs.get = function (tabId, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(mockTab), 0);
            return Promise.resolve(mockTab);
        };
    }
    if (!chrome.tabs.create) {
        chrome.tabs.create = function (createProperties, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(mockTab), 0);
            return Promise.resolve(mockTab);
        };
    }
    if (!chrome.tabs.update) {
        chrome.tabs.update = function (tabId, updateProperties, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(mockTab), 0);
            return Promise.resolve(mockTab);
        };
    }
    if (!chrome.tabs.sendMessage) {
        chrome.tabs.sendMessage = function (tabId, message, options, responseCallback) {
            const cb = typeof options === 'function' ? options : responseCallback;
            if (typeof cb === 'function') setTimeout(() => cb({ success: true }), 0);
            return Promise.resolve({ success: true });
        };
    }

    // ── 6. chrome.runtime Polyfills ───────────────────────────────────────────
    if (!chrome.runtime) chrome.runtime = {};
    if (!chrome.runtime.onInstalled) chrome.runtime.onInstalled = createEventObject();
    if (!chrome.runtime.onStartup) chrome.runtime.onStartup = createEventObject();
    if (!chrome.runtime.onSuspend) chrome.runtime.onSuspend = createEventObject();
    if (!chrome.runtime.onUpdateAvailable) chrome.runtime.onUpdateAvailable = createEventObject();
    if (!chrome.runtime.onConnect) chrome.runtime.onConnect = createEventObject();
    if (!chrome.runtime.onMessage) chrome.runtime.onMessage = createEventObject();

    if (!chrome.runtime.setUninstallURL) {
        chrome.runtime.setUninstallURL = function (url, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(), 0);
            return Promise.resolve();
        };
    }
    if (!chrome.runtime.requestUpdateCheck) {
        chrome.runtime.requestUpdateCheck = function (cb) {
            if (typeof cb === 'function') setTimeout(() => cb('no_update'), 0);
            return Promise.resolve({ status: 'no_update' });
        };
    }

    // ── 7. chrome.declarativeContent (Used by Page Action extensions) ──────────
    if (!chrome.declarativeContent) {
        chrome.declarativeContent = {
            onPageChanged: createEventObject(),
            PageStateMatcher: function (options) { this.options = options; },
            ShowAction: function () {},
            ShowPageAction: function () {}
        };
    }

    // ── 8. chrome.alarms API ──────────────────────────────────────────────────
    if (!chrome.alarms) {
        chrome.alarms = {
            onAlarm: createEventObject(),
            create: function (name, alarmInfo) {},
            get: function (name, cb) { if (typeof cb === 'function') cb(null); return Promise.resolve(null); },
            getAll: function (cb) { if (typeof cb === 'function') cb([]); return Promise.resolve([]); },
            clear: function (name, cb) { if (typeof cb === 'function') cb(true); return Promise.resolve(true); },
            clearAll: function (cb) { if (typeof cb === 'function') cb(true); return Promise.resolve(true); }
        };
    }

    // ── 9. chrome.permissions API ─────────────────────────────────────────────
    if (!chrome.permissions) {
        chrome.permissions = {
            contains: function (perms, cb) { if (typeof cb === 'function') cb(true); return Promise.resolve(true); },
            request: function (perms, cb) { if (typeof cb === 'function') cb(true); return Promise.resolve(true); },
            remove: function (perms, cb) { if (typeof cb === 'function') cb(true); return Promise.resolve(true); },
            getAll: function (cb) { const r = { permissions: [], origins: [] }; if (typeof cb === 'function') cb(r); return Promise.resolve(r); },
            onAdded: createEventObject(),
            onRemoved: createEventObject()
        };
    }

    // ── 10. chrome.identity API ───────────────────────────────────────────────
    if (!chrome.identity) {
        chrome.identity = {
            onSignInChanged: createEventObject(),
            getAuthToken: function (details, cb) { if (typeof cb === 'function') cb(null); return Promise.resolve(null); },
            getProfileUserInfo: function (details, cb) { const u = { email: '', id: '' }; if (typeof cb === 'function') cb(u); return Promise.resolve(u); },
            launchWebAuthFlow: function (details, cb) { if (typeof cb === 'function') cb(''); return Promise.resolve(''); }
        };
    }

    // ── 11. chrome.management API ─────────────────────────────────────────────
    if (!chrome.management) chrome.management = {};
    if (!chrome.management.onInstalled) chrome.management.onInstalled = createEventObject();
    if (!chrome.management.onUninstalled) chrome.management.onUninstalled = createEventObject();
    if (!chrome.management.onEnabled) chrome.management.onEnabled = createEventObject();
    if (!chrome.management.onDisabled) chrome.management.onDisabled = createEventObject();

    if (!chrome.management.getSelf) {
        chrome.management.getSelf = function (cb) {
            const selfInfo = {
                id: (chrome.runtime && chrome.runtime.id) || 'ocal-ext',
                name: 'Extension',
                enabled: true,
                installType: 'normal',
                type: 'extension'
            };
            if (typeof cb === 'function') setTimeout(() => cb(selfInfo), 0);
            return Promise.resolve(selfInfo);
        };
    }

    // ── 12. chrome.commands API ───────────────────────────────────────────────
    if (!chrome.commands) chrome.commands = {};
    if (!chrome.commands.onCommand) chrome.commands.onCommand = createEventObject();
    if (!chrome.commands.getAll) {
        chrome.commands.getAll = function (cb) {
            if (typeof cb === 'function') setTimeout(() => cb([]), 0);
            return Promise.resolve([]);
        };
    }

    // ── 13. chrome.notifications API ──────────────────────────────────────────
    if (!chrome.notifications) chrome.notifications = {};
    if (!chrome.notifications.onClicked) chrome.notifications.onClicked = createEventObject();
    if (!chrome.notifications.onClosed) chrome.notifications.onClosed = createEventObject();
    if (!chrome.notifications.create) {
        chrome.notifications.create = function (id, options, cb) {
            const nId = id || ('notif_' + Date.now());
            const callback = typeof options === 'function' ? options : cb;
            if (typeof callback === 'function') setTimeout(() => callback(nId), 0);
            return Promise.resolve(nId);
        };
    }
    if (!chrome.notifications.clear) {
        chrome.notifications.clear = function (id, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(true), 0);
            return Promise.resolve(true);
        };
    }

    // ── 14. chrome.contextMenus API ───────────────────────────────────────────
    if (!chrome.contextMenus) chrome.contextMenus = {};
    if (!chrome.contextMenus.onClicked) chrome.contextMenus.onClicked = createEventObject();
    if (!chrome.contextMenus.create) {
        chrome.contextMenus.create = function (properties, cb) {
            if (typeof cb === 'function') cb();
            return properties && properties.id ? properties.id : ('menu_' + Date.now());
        };
    }
    if (!chrome.contextMenus.remove) {
        chrome.contextMenus.remove = function (id, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(), 0);
            return Promise.resolve();
        };
    }
    if (!chrome.contextMenus.removeAll) {
        chrome.contextMenus.removeAll = function (cb) {
            if (typeof cb === 'function') setTimeout(() => cb(), 0);
            return Promise.resolve();
        };
    }

    // ── 15. chrome.webNavigation API ──────────────────────────────────────────
    if (!chrome.webNavigation) chrome.webNavigation = {};
    const navEvents = [
        'onBeforeNavigate', 'onCommitted', 'onDOMContentLoaded',
        'onCompleted', 'onErrorOccurred', 'onCreatedNavigationTarget',
        'onReferenceFragmentUpdated', 'onTabReplaced', 'onHistoryStateUpdated'
    ];
    navEvents.forEach(evt => {
        if (!chrome.webNavigation[evt]) chrome.webNavigation[evt] = createEventObject();
    });
    if (!chrome.webNavigation.getFrame) {
        chrome.webNavigation.getFrame = function (details, cb) {
            if (typeof cb === 'function') setTimeout(() => cb(null), 0);
            return Promise.resolve(null);
        };
    }
    if (!chrome.webNavigation.getAllFrames) {
        chrome.webNavigation.getAllFrames = function (details, cb) {
            if (typeof cb === 'function') setTimeout(() => cb([]), 0);
            return Promise.resolve([]);
        };
    }

    // Sync global browser with chrome if in webext environment
    if (typeof g.browser === 'undefined') {
        try { g.browser = g.chrome; } catch (e) {}
    } else if (g.browser && typeof g.browser === 'object') {
        if (!g.browser.webNavigation) g.browser.webNavigation = chrome.webNavigation;
        else {
            navEvents.forEach(evt => {
                if (!g.browser.webNavigation[evt]) g.browser.webNavigation[evt] = chrome.webNavigation[evt];
            });
        }
    }
})();
