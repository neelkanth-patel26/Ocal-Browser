const urlParams = new URLSearchParams(window.location.search);
const hostname = urlParams.get('host') || 'www.google.com';

const tabs = document.querySelectorAll('.tab');
const screens = document.querySelectorAll('.screen');
const loading = document.getElementById('loading');
const fieldDisplay = document.getElementById('field-value-display');
const fieldsContainer = document.getElementById('fields-container');

// Helper to convert hex accent to rgba values
function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(9, 240, 160, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Applies active window accents and colors
function applyTheme(settings) {
    if (!settings) return;
    if (settings.themeMode) {
        document.body.setAttribute('data-theme', settings.themeMode);
    }
    if (settings.accentColor) {
        const color = settings.accentColor;
        document.body.style.setProperty('--accent', color);
        document.body.style.setProperty('--accent-glow', hexToRgba(color, 0.25));
        document.body.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
    }
}

// Tab Switching
tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        screens.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        const screenId = `${tab.dataset.screen}-screen`;
        document.getElementById(screenId).classList.add('active');
    };
});

async function init() {
    document.getElementById('viewer-title').textContent = `${hostname}`;
    
    // Sync current settings
    try {
        const settings = await window.electronAPI.invoke('get-settings');
        applyTheme(settings);
    } catch (e) {
        console.error('Failed to resolve theme settings:', e);
    }

    try {
        const cert = await window.electronAPI.invoke('get-certificate-info', hostname);
        
        if (cert.error) {
            showError(cert.error);
            return;
        }

        populateGeneral(cert);
        populateDetails(cert);
        
        // Hide loader
        loading.style.opacity = '0';
        setTimeout(() => loading.style.display = 'none', 400);

    } catch (err) {
        showError(err.message);
    }
}

function showError(msg) {
    loading.innerHTML = `<i class="fas fa-circle-exclamation" style="font-size:24px; color:#ef4444;"></i>
                        <div style="font-size:12px; font-weight: 700; margin-top:10px; letter-spacing: 1px;">PROBE FAILED</div>
                        <div style="font-size:10px; opacity:0.6; max-width:300px; text-align:center; margin-top:4px;">${msg}</div>`;
}

function populateGeneral(cert) {
    // Issued To
    document.getElementById('sub-cn').textContent = cert.subject.CN || '-';
    document.getElementById('sub-o').textContent = cert.subject.O || '<Not Part Of Certificate>';
    document.getElementById('sub-ou').textContent = cert.subject.OU || '<Not Part Of Certificate>';
    
    // Issued By
    document.getElementById('iss-cn').textContent = cert.issuer.CN || '-';
    document.getElementById('iss-o').textContent = cert.issuer.O || '<Not Part Of Certificate>';
    document.getElementById('iss-ou').textContent = cert.issuer.OU || '<Not Part Of Certificate>';

    // Validity
    document.getElementById('valid-from').textContent = formatDate(cert.valid_from);
    document.getElementById('valid-to').textContent = formatDate(cert.valid_to);

    // Fingerprints
    document.getElementById('sha1').textContent = formatFingerprint(cert.fingerprint);
    document.getElementById('sha256').textContent = formatFingerprint(cert.fingerprint256);
}

function populateDetails(cert) {
    document.getElementById('hier-root').textContent = cert.issuer.CN || 'Issuer Authority';
    document.getElementById('hier-leaf').textContent = cert.subject.CN || 'End Entity Certificate';

    const fields = [
        { name: 'Version', value: 'v3' },
        { name: 'Serial Number', value: cert.serialNumber || '-' },
        { name: 'Signature Algorithm', value: 'sha256WithRSAEncryption' },
        { name: 'Issuer', value: JSON.stringify(cert.issuer, null, 2) },
        { name: 'Validity Span', value: `Not Before: ${cert.valid_from}\nNot After:  ${cert.valid_to}` },
        { name: 'Subject Mappings', value: JSON.stringify(cert.subject, null, 2) },
        { name: 'Public Key Info', value: cert.pubkey || 'Data not accessible via quick probe' }
    ];

    fieldsContainer.innerHTML = '';
    fields.forEach((f, idx) => {
        const row = document.createElement('div');
        row.className = 'field-row';
        row.innerHTML = `<div class="field-name">${f.name}</div><div class="field-summary">${f.value.split('\n')[0]}</div>`;
        row.onclick = () => {
            document.querySelectorAll('.field-row').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            fieldDisplay.textContent = f.value;
        };
        fieldsContainer.appendChild(row);
        
        // Select first item by default
        if (idx === 0) {
            row.classList.add('selected');
            fieldDisplay.textContent = f.value;
        }
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatFingerprint(fp) {
    if (!fp) return '-';
    if (!fp.includes(':')) {
        return fp.match(/.{2}/g).join(':').toUpperCase();
    }
    return fp.toUpperCase();
}

// IPC settings changed listener via bridge
window.electronAPI.on('settings-changed', (e, s) => {
    applyTheme(s);
});

init();
