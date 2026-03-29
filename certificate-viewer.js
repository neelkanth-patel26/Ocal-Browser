const urlParams = new URLSearchParams(window.location.search);
const hostname = urlParams.get('host') || 'www.google.com';

const tabs = document.querySelectorAll('.tab');
const screens = document.querySelectorAll('.screen');
const loading = document.getElementById('loading');
const fieldDisplay = document.getElementById('field-value-display');
const fieldsContainer = document.getElementById('fields-container');

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
    document.getElementById('viewer-title').textContent = `Certificate Viewer: ${hostname}`;
    
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
    loading.innerHTML = `<i class="fas fa-circle-exclamation" style="font-size:30px; color:#ef4444;"></i>
                        <div style="font-size:14px; margin-top:10px;">PROBE FAILED</div>
                        <div style="font-size:11px; opacity:0.6; max-width:300px; text-align:center;">${msg}</div>`;
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
    document.getElementById('hier-root').textContent = cert.issuer.CN || 'Issuer';
    document.getElementById('hier-leaf').textContent = cert.subject.CN || 'Subject';

    const fields = [
        { name: 'Version', value: 'v3' },
        { name: 'Serial Number', value: cert.serialNumber || '-' },
        { name: 'Signature Algorithm', value: 'sha256WithRSAEncryption' },
        { name: 'Issuer', value: JSON.stringify(cert.issuer, null, 2) },
        { name: 'Validity', value: `Not Before: ${cert.valid_from}\nNot After: ${cert.valid_to}` },
        { name: 'Subject', value: JSON.stringify(cert.subject, null, 2) },
        { name: 'Public Key', value: cert.pubkey || 'Data not accessible via quick probe' }
    ];

    fieldsContainer.innerHTML = '';
    fields.forEach(f => {
        const row = document.createElement('div');
        row.className = 'field-row';
        row.innerHTML = `<div class="field-name">${f.name}</div><div class="field-summary">${f.value.split('\n')[0]}</div>`;
        row.onclick = () => {
            fieldDisplay.textContent = f.value;
        };
        fieldsContainer.appendChild(row);
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatFingerprint(fp) {
    if (!fp) return '-';
    // Add colons every 2 chars if not present
    if (!fp.includes(':')) {
        return fp.match(/.{2}/g).join(':').toUpperCase();
    }
    return fp.toUpperCase();
}

init();
