// Ocal VPN Extension: Advanced Background Controller (MV3)
// Handles PAC generation and failover logic locally

const VPN_RESCUE_POOL = {
    'us': [
        'SOCKS5 161.35.63.136:3128', 'HTTPS 161.35.63.136:3128', 'SOCKS5 159.203.111.111:3128',
        'HTTPS 159.203.111.111:3128', 'PROXY 64.225.8.130:3128', 'SOCKS5 64.225.8.130:3128'
    ],
    'uk': [
        'SOCKS5 178.62.115.158:3128', 'HTTPS 178.62.115.158:3128', 'SOCKS5 139.59.59.59:3128',
        'HTTPS 139.59.59.59:3128', 'PROXY 46.101.59.214:3128', 'SOCKS5 46.101.59.214:3128'
    ],
    'de': [
        'SOCKS5 165.22.122.21:3128', 'HTTPS 165.22.122.21:3128', 'SOCKS5 138.68.68.68:3128',
        'HTTPS 138.68.68.68:3128', 'PROXY 161.35.21.31:3128', 'SOCKS5 161.35.21.31:3128'
    ],
    'jp': [
        'SOCKS5 160.16.202.12:3128', 'SOCKS5 153.127.18.232:3128', 'HTTPS 160.16.202.12:3128',
        'PROXY 118.27.14.28:3128', 'SOCKS5 118.27.14.28:3128', 'HTTPS 153.127.18.232:3128'
    ],
    'in': [
        'SOCKS5 139.59.59.59:3128', 'HTTPS 139.59.59.59:3128', 'SOCKS5 157.245.109.111:3128',
        'HTTPS 157.245.109.111:3128', 'PROXY 139.59.59.59:3128'
    ],
    'auto': [
        'SOCKS5 161.35.63.136:3128', 'SOCKS5 178.62.115.158:3128', 'SOCKS5 165.22.122.21:3128',
        'SOCKS5 160.16.202.12:3128', 'SOCKS5 139.59.59.59:3128', 'HTTPS 161.35.63.136:3128'
    ]
};

function generateVpnPAC(region = 'auto') {
    const pool = VPN_RESCUE_POOL[region] || VPN_RESCUE_POOL['auto'];
    const pacRules = pool.join('; ');

    // Bypass list for local, internal, and major Google services to prevent breaking main features
    return `function FindProxyForURL(url, host) {
        if (shExpMatch(host, "*.youtube.com") || 
            shExpMatch(host, "*.googlevideo.com") || 
            shExpMatch(host, "*.ytimg.com") ||
            shExpMatch(host, "*.ggpht.com") ||
            shExpMatch(host, "*.ocal") ||
            shExpMatch(host, "ocal://*") ||
            isPlainHostName(host) ||
            localHostOrDomainIs(host, "127.0.0.1") ||
            host === "localhost") {
            return "DIRECT";
        }
        return "${pacRules}; DIRECT";
    }`;
}

// Ocal extension communication bridge
// Since standard IPC is restricted in MV3 workers, we use console-based signaling 
// which is intercepted by the Ocal Browser main process.

function applyProxy(region, enabled) {
    if (!enabled) {
        console.log('SIGNAL_CLEAR_PROXY');
        return;
    }
    const pac = generateVpnPAC(region);
    console.log('SIGNAL_SET_PROXY', JSON.stringify({ pacCode: pac, region: region }));
}

// In MV3, we use chrome.runtime listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_VPN') {
        applyProxy(message.region || 'auto', message.enabled);
    } else if (message.type === 'SET_REGION') {
        applyProxy(message.region, true);
    }
    return true;
});

// Broadcast listener specifically for Electron's webContents.send
// This helps bridge the gap if the extension is loaded in a way that allows it.
if (typeof self !== 'undefined' && self.addEventListener) {
    self.addEventListener('message', (event) => {
        const message = event.data;
        if (message && message.type === 'vpn-extension-command') {
            const cmd = message.payload || message;
            if (cmd.type === 'TOGGLE_VPN') {
                applyProxy(cmd.region || 'auto', cmd.enabled);
            } else if (cmd.type === 'SET_REGION') {
                applyProxy(cmd.region, true);
            }
        }
    });
}

function applyProxy(region, enabled) {
    if (!enabled) {
        console.log('SIGNAL_CLEAR_PROXY');
        return;
    }
    const pac = generateVpnPAC(region);
    // Use a single template string to ensure signaling is captured as one message by Electron
    console.log(`SIGNAL_SET_PROXY ${JSON.stringify({ pacCode: pac, region: region })}`);
}

// Initial identity broadcast to help main.js discover this worker
console.log(`SIGNAL_INIT ${JSON.stringify({ type: 'vpn-extension', id: chrome.runtime.id, href: self.location.href })}`);

console.log('Ocal VPN Advanced Node Controller Initialised');

