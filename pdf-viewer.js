const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let scale = 1.2;
let rotation = 0;
let currentTool = 'hand';
let currentTheme = 'dark';
let annotations = {}; 
let searchResults = [];
let lastSearchPageNum = -1;
let currentSearchIdx = -1;
let currentSearchId = 0;
let selectedColor = '#a855f7';
let pageTextData = {}; 

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(168, 85, 247, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccent(color) {
    if (!color) return;
    selectedColor = color;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.08));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(color, 0.25));
    if (colorWell) {
        colorWell.style.backgroundColor = color;
        colorWell.style.boxShadow = `0 0 15px ${color}40`;
    }
    // Update existing annotations that were using the previous "accent"
    Object.keys(annotations).forEach(pIdx => {
        annotations[pIdx].forEach(ann => {
            if (ann.isAccent) ann.color = ann.type === 'path' && ann.tool === 'marker' ? hexToRgba(color, 0.2) : color;
        });
        const canv = document.querySelector(`#wrapper-${pIdx} .drawing-layer`);
        if (canv) redrawAnnotations(canv, pIdx);
    });
}

// Initial Setup
window.electronAPI.invoke('get-settings').then(s => {
    if (s) {
        if (s.accentColor) applyAccent(s.accentColor);
        if (s.themeMode) {
            currentTheme = s.themeMode;
            document.body.setAttribute('data-theme', currentTheme);
        }
    }
});

// Settings Update Sync
window.electronAPI.on('settings-changed', (e, s) => {
    if (s) {
        if (s.accentColor) applyAccent(s.accentColor);
        if (s.themeMode && s.themeMode !== currentTheme) {
            currentTheme = s.themeMode;
            document.body.setAttribute('data-theme', currentTheme);
            renderAllPages(); 
        }
    }
});

const viewport = document.getElementById('viewport');
const pageContainer = document.getElementById('page-container-wrapper');
const thumbnails = document.getElementById('thumbnails');

const colorWell = document.getElementById('color-well-btn');
const chromaCard = document.getElementById('chroma-card');
const chromaGrid = document.getElementById('chroma-grid');
const chromaHex = document.getElementById('chroma-hex');

const floatingOverlay = document.getElementById('floating-input-overlay');
const floatingInput = document.getElementById('floating-text-input');

const urlParams = new URLSearchParams(window.location.search);
let pdfUrl = urlParams.get('file');

// Defensive Correction: if it's a raw local path (C:\ or /...) that missed the main process normalization
if (pdfUrl && !pdfUrl.startsWith('http') && !pdfUrl.startsWith('file://') && !pdfUrl.startsWith('ocal://')) {
    const isLocalDrive = /^[a-zA-Z]:[/\\]/.test(pdfUrl);
    const isAbsPath = pdfUrl.startsWith('/') || pdfUrl.startsWith('\\\\');
    if (isLocalDrive || isAbsPath) {
        pdfUrl = 'file:///' + pdfUrl.replace(/\\/g, '/');
    }
}

const CHROMA_PRESETS = [
    '#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', // Purples
    '#10b981', '#059669', '#3b82f6', '#2563eb', // Emerald & Sapphire
    '#ef4444', '#dc2626', '#f59e0b', '#fff'     // Rosewood, Gold, White
];

if (pdfUrl) {
    // If it's a remote URL, use Google Drive for compatibility as per user request
    if (pdfUrl.startsWith('http')) {
        tryGoogleFallback(pdfUrl);
    } else {
        // If it's a local file, use the custom Ocal PDF viewer
        loadPDF(pdfUrl);
    }
}

// ── Chroma Controller ──
function initChroma() {
    colorWell.style.backgroundColor = selectedColor;
    CHROMA_PRESETS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'chroma-swatch';
        swatch.style.cssText = `background:${color}; width:100%; aspect-ratio:1; border-radius:10px; cursor:pointer; border:2px solid transparent; transition:0.2s;`;
        swatch.onclick = () => selectColor(color);
        chromaGrid.appendChild(swatch);
    });

    colorWell.onclick = (e) => {
        e.stopPropagation();
        const shown = chromaCard.style.display === 'block';
        chromaCard.style.display = shown ? 'none' : 'block';
    };

    chromaHex.oninput = (e) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (val.length === 7) selectColor(val);
    };

    document.addEventListener('click', (e) => {
        if (!chromaCard.contains(e.target) && e.target !== colorWell) {
            chromaCard.style.display = 'none';
        }
    });
}

function selectColor(color) {
    selectedColor = color;
    updateColorWell();
    chromaHex.value = color.replace('#', '').toUpperCase();
    chromaCard.style.display = 'none';
}

function updateColorWell() {
    colorWell.style.backgroundColor = selectedColor;
    colorWell.style.boxShadow = `0 0 15px ${selectedColor}40`;
}

initChroma();

async function loadPDF(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        renderThumbnails();
        renderAllPages();
    } catch (e) {
        console.error(e);
        alert('Failed to load PDF.');
    }
}

function tryGoogleFallback(url) {
    console.warn('PDF.js failed locally. Switching to Google Drive Cloud Fallback...');
    
    // Hide Ocal Doc parts
    document.getElementById('sidebar').style.display = 'none';
    document.querySelector('main').style.display = 'none';
    document.querySelector('.sidebar-toggle').style.display = 'none';
    document.querySelector('.toolbar-anchor').style.display = 'none';
    
    // Show Fallback
    const fallback = document.getElementById('fallback-viewport');
    fallback.style.display = 'block';
    fallback.innerHTML = `<iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true"></iframe>`;
    
    // Final UI cleanup
    
    // Notify user
    document.getElementById('doc-title').textContent = "(Cloud Preview) " + decodeURIComponent(url.split('/').pop());
    document.getElementById('doc-title').style.opacity = '1';
}

let currentRenderId = 0;
let thumbRenderId = 0;

async function renderThumbnails() {
    const renderId = ++thumbRenderId;
    thumbnails.innerHTML = '';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (renderId !== thumbRenderId) return;
        
        const page = await pdfDoc.getPage(i);
        const group = document.createElement('div');
        group.className = 'thumb-group';
        
        const thumbWrap = document.createElement('div');
        thumbWrap.className = `thumb ${i === pageNum ? 'active' : ''}`;
        thumbWrap.id = `thumb-${i}`;
        
        const canvas = document.createElement('canvas');
        const v = page.getViewport({ scale: 0.2, rotation });
        canvas.width = v.width; canvas.height = v.height;
        
        if (renderId !== thumbRenderId) return;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
        
        if (renderId !== thumbRenderId) return;
        thumbWrap.appendChild(canvas);
        thumbWrap.onclick = () => scrollToPage(i);
        
        const num = document.createElement('div');
        num.className = 'thumb-num'; num.textContent = i;
        
        group.appendChild(thumbWrap);
        group.appendChild(num);
        thumbnails.appendChild(group);
    }
}

async function renderAllPages() {
    const savedNum = pageNum;
    const renderId = ++currentRenderId;
    
    // 1. Clear and Prepare
    pageContainer.innerHTML = '';
    
    // 2. Immediate Placeholder Creation (Fast)
    // Create all wrappers with correct dimensions so the scroll area is instantly correct
    const renderTasks = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (renderId !== currentRenderId) return;
        
        const page = await pdfDoc.getPage(i);
        const v = page.getViewport({ scale, rotation });
        
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        wrapper.id = `wrapper-${i}`;
        wrapper.style.width = v.width + 'px'; 
        wrapper.style.height = v.height + 'px';
        
        const canvas = document.createElement('canvas');
        canvas.width = v.width; canvas.height = v.height;
        wrapper.appendChild(canvas);
        
        const drawingCanvas = document.createElement('canvas');
        drawingCanvas.className = 'drawing-layer';
        drawingCanvas.width = v.width; drawingCanvas.height = v.height;
        drawingCanvas.style.position = 'absolute'; drawingCanvas.style.top = '0'; drawingCanvas.style.left = '0';
        drawingCanvas.style.pointerEvents = currentTool === 'hand' ? 'none' : 'auto';
        setupDrawing(drawingCanvas, i, v);
        wrapper.appendChild(drawingCanvas);
        
        pageContainer.appendChild(wrapper);
        renderTasks.push({ page, canvas, drawingCanvas, i, v });
    }

    // 3. Instant Position Restoration
    // Now that all wrappers exist with correct heights, we can jump back before rendering content
    if (renderId === currentRenderId) {
        scrollToPage(savedNum, 'auto');
    }

    // 4. Prioritized Content Rendering
    // Sort tasks to render the current page first, then others
    renderTasks.sort((a, b) => {
        if (a.i === savedNum) return -1;
        if (b.i === savedNum) return 1;
        return Math.abs(a.i - savedNum) - Math.abs(b.i - savedNum);
    });

    for (const task of renderTasks) {
        if (renderId !== currentRenderId) return;
        
        // Render PDF content
        await task.page.render({ canvasContext: task.canvas.getContext('2d'), viewport: task.v }).promise;
        
        // Refresh annotations
        if (annotations[task.i]) redrawAnnotations(task.drawingCanvas, task.i);
        
        // Capture text content for searching
        const textContent = await task.page.getTextContent();
        pageTextData[task.i] = textContent.items;
    }
}

// ── Drawing & Annotations ──
let textToolState = null;

function setupDrawing(canvas, pageIdx, viewport) {
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX, lastY;

    canvas.onmousedown = (e) => {
        if (currentTool === 'hand' || currentTool === 'search') return;
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
        lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
        if (currentTool === 'text') { showFloatingInput(e.clientX, e.clientY, pageIdx, lastX, lastY, canvas); drawing = false; }
        else if (currentTool === 'eraser' && smartEraseAt(pageIdx, lastX, lastY)) redrawAnnotations(canvas, pageIdx);
    };

    canvas.onmousemove = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        const configs = {
            pen: { color: selectedColor, width: 2.2 },
            marker: { color: hexToRgba(selectedColor, 0.2), width: 18 },
            highlight: { color: hexToRgba(selectedColor, 0.25), width: 0 },
            eraser: { color: null, width: 35 }
        };
        const cfg = configs[currentTool];
        if (!cfg) return;
        if (currentTool === 'eraser') {
            if (smartEraseAt(pageIdx, x, y)) redrawAnnotations(canvas, pageIdx);
            ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = cfg.width;
            ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
        } else if (currentTool === 'highlight') {
            const hit = findWordAt(pageIdx, x, y, viewport);
            if (hit) {
                const box = hit.box;
                if (!annotations[pageIdx]) annotations[pageIdx] = [];
                if (!annotations[pageIdx].some(a => a.type === 'rect' && a.id === hit.id)) {
                    annotations[pageIdx].push({ type: 'rect', id: hit.id, x: box.x, y: box.y, w: box.w, h: box.h, color: cfg.color });
                    redrawAnnotations(canvas, pageIdx);
                }
            }
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = cfg.color; ctx.lineWidth = cfg.width;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
            if (!annotations[pageIdx]) annotations[pageIdx] = [];
            annotations[pageIdx].push({ 
                type: 'path', x1: lastX, y1: lastY, x2: x, y2: y, 
                tool: currentTool, color: cfg.color, 
                isAccent: selectedColor === cfg.color // Mark as accent if matching
            });
        }
        lastX = x; lastY = y;
    };
    canvas.onmouseup = () => drawing = false;
}

function showFloatingInput(sX, sY, pIdx, cX, cY, canv) {
    if (!floatingOverlay) return;
    textToolState = { pageIdx: pIdx, x: cX, y: cY, canvas: canv };
    floatingOverlay.style.display = 'block';
    floatingOverlay.style.left = `${sX - 20}px`; floatingOverlay.style.top = `${sY - 20}px`;
    floatingInput.value = ''; setTimeout(() => floatingInput.focus(), 50);
}

floatingInput.onkeydown = (e) => {
    if (e.key === 'Enter' && floatingInput.value.trim()) {
        const { pageIdx, x, y, canvas } = textToolState;
        if (!annotations[pageIdx]) annotations[pageIdx] = [];
        annotations[pageIdx].push({ type: 'text', x, y, text: floatingInput.value.trim(), color: selectedColor });
        redrawAnnotations(canvas, pageIdx); closeFloatingInput();
    } else if (e.key === 'Escape') closeFloatingInput();
};

function closeFloatingInput() { floatingOverlay.style.display = 'none'; textToolState = null; }

function smartEraseAt(pageIdx, x, y) {
    if (!annotations[pageIdx]) return false;
    const count = annotations[pageIdx].length;
    annotations[pageIdx] = annotations[pageIdx].filter(item => {
        if (item.type === 'rect') return !(x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h);
        if (item.type === 'text') { const d = Math.sqrt(Math.pow(x - item.x, 2) + Math.pow(y - (item.y + 10), 2)); return d > 35; }
        return true;
    });
    return annotations[pageIdx].length !== count;
}

function findWordAt(pageIdx, x, y, viewport) {
    const items = pageTextData[pageIdx] || [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i]; const tx = item.transform;
        const fontHeight = Math.abs(tx[3]); const [vx, vy] = viewport.convertToViewportPoint(tx[4], tx[5]);
        const totalW = item.width * viewport.scale; const h = fontHeight * viewport.scale;
        if (x >= vx - 5 && x <= vx + totalW + 5 && y >= vy - h - 2 && y <= vy + 2) {
            const words = [...item.str.matchAll(/\S+/g)];
            const charW = totalW / item.str.length;
            for (const m of words) {
                const wW = m[0].length * charW; const wX = vx + (m.index * charW);
                if (x >= wX - 2 && x <= wX + wW + 2) return { id: `p-${pageIdx}-l-${i}-w-${m.index}`, box: { x: wX, y: vy - h, w: wW, h } };
            }
        }
    }
    return null;
}

function redrawAnnotations(canvas, pageIdx) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0, canvas.width, canvas.height); 
    (annotations[pageIdx] || []).forEach(item => {
        ctx.globalCompositeOperation = 'source-over'; 
        if (item.type === 'text') {
            ctx.font = 'bold 22px Outfit'; ctx.fillStyle = item.color;
            ctx.textBaseline = 'hanging'; ctx.fillText(item.text, item.x, item.y);
        } else if (item.type === 'path') {
            ctx.strokeStyle = item.color || selectedColor; ctx.lineWidth = item.tool === 'pen' ? 2.2 : 18;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(item.x1, item.y1); ctx.lineTo(item.x2, item.y2); ctx.stroke();
        } else if (item.type === 'rect') {
            ctx.fillStyle = item.color; ctx.fillRect(item.x, item.y, item.w, item.h);
        }
    });
}

// ── Search & Navigation ──
function clearAllSearchHighlights() {
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const wrapper = document.getElementById(`wrapper-${i}`);
        if (!wrapper) continue;
        const draw = wrapper.querySelector('.drawing-layer');
        if (draw) redrawAnnotations(draw, i);
    }
}

async function performSearch(query) {
    const searchId = ++currentSearchId;
    
    // Clear everything if starting fresh
    clearAllSearchHighlights();
    lastSearchPageNum = -1;
    
    if (!query || query.trim().length === 0) { 
        searchResults = []; 
        currentSearchIdx = -1; 
        updateSearchUI(); 
        return; 
    }
    
    searchResults = [];
    const q = query.toLowerCase();
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (searchId !== currentSearchId) return;
        const page = await pdfDoc.getPage(i); 
        const textContent = await page.getTextContent();
        textContent.items.forEach((item, idx) => {
            const str = item.str.toLowerCase();
            let lastIdx = -1;
            while ((lastIdx = str.indexOf(q, lastIdx + 1)) !== -1) {
                searchResults.push({ 
                    pageNum: i, 
                    itemIdx: idx, 
                    matchIdx: lastIdx,
                    matchLen: q.length,
                    str: item.str, 
                    transform: item.transform,
                    width: item.width,
                    height: item.height,
                    viewBox: page.viewBox
                });
            }
        });
    }
    
    if (searchResults.length > 0) {
        currentSearchIdx = 0;
        updateSearchUI();
    } else {
        currentSearchIdx = -1;
        document.getElementById('search-count').textContent = '0/0';
    }
}

function searchNext() {
    if (searchResults.length === 0) return;
    currentSearchIdx = (currentSearchIdx + 1) % searchResults.length;
    updateSearchUI();
}

function searchPrev() {
    if (searchResults.length === 0) return;
    currentSearchIdx = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    updateSearchUI();
}

function updateSearchUI() {
    const count = document.getElementById('search-count');
    count.textContent = currentSearchIdx === -1 ? '0/0' : `${currentSearchIdx + 1}/${searchResults.length}`;
    if (currentSearchIdx !== -1) {
        jumpToSearchResult(searchResults[currentSearchIdx]);
    }
}

async function jumpToSearchResult(res) {
    // Clear highlight on the PREVIOUS match page if it's different
    if (lastSearchPageNum !== -1 && lastSearchPageNum !== res.pageNum) {
        const prevWrap = document.getElementById(`wrapper-${lastSearchPageNum}`);
        if (prevWrap) {
            const prevDraw = prevWrap.querySelector('.drawing-layer');
            if (prevDraw) redrawAnnotations(prevDraw, lastSearchPageNum);
        }
    }
    
    lastSearchPageNum = res.pageNum;
    scrollToPage(res.pageNum);
    
    const page = await pdfDoc.getPage(res.pageNum);
    const v = page.getViewport({ scale, rotation });
    const wrapper = document.getElementById(`wrapper-${res.pageNum}`);
    const draw = wrapper.querySelector('.drawing-layer');
    const ctx = draw.getContext('2d');
    
    redrawAnnotations(draw, res.pageNum); 
    
    // transform: [scX, skX, skY, scY, tx, ty]
    const [scX, skX, skY, scY, tx, ty] = res.transform;
    const charWidth = res.width / res.str.length;
    const offsetX = res.matchIdx * charWidth;
    const wordWidth = res.matchLen * charWidth;

    // Convert PDF coordinates to viewport coordinates (respects rotation/scale)
    // tx, ty is the bottom-left of the text block in PDF space
    const [vx, vy] = v.convertToViewportPoint(tx + offsetX, ty);
    
    // PDF space is bottom-up, so ty+scY is the top. 
    // converToViewportPoint handles the Y-flip.
    const [vx2, vy2] = v.convertToViewportPoint(tx + offsetX + wordWidth, ty + scY);

    const x = Math.min(vx, vx2);
    const y = Math.min(vy, vy2);
    const w = Math.abs(vx2 - vx);
    const h = Math.abs(vy2 - vy);

    // Ultra-visible highlight
    ctx.fillStyle = 'rgba(255, 60, 0, 0.35)'; // Bright Red-Orange for contrast
    ctx.strokeStyle = '#ff3c00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillRect(x, y, w, h);
}

function itemWidthApprox(str, v) {
    return str.length * 8 * (v.width / v.viewBox[2]);
}

// ── Navigation Listeners ──
document.getElementById('prev-btn').onclick = () => {
    if (pageNum > 1) scrollToPage(pageNum - 1);
};
document.getElementById('next-btn').onclick = () => {
    if (pdfDoc && pageNum < pdfDoc.numPages) scrollToPage(pageNum + 1);
};

// ── Search Listeners ──
document.getElementById('search-next').onclick = searchNext;
document.getElementById('search-prev').onclick = searchPrev;
document.getElementById('search-input').onkeydown = (e) => {
    if (e.key === 'Enter') searchNext();
    if (e.key === 'Escape') {
        document.getElementById('search-box').style.display = 'none';
    }
};

document.getElementById('page-num').onchange = (e) => {
    let val = parseInt(e.target.value);
    if (!isNaN(val) && pdfDoc && val >= 1 && val <= pdfDoc.numPages) {
        scrollToPage(val);
    } else {
        e.target.value = pageNum;
    }
};

document.querySelectorAll('.btn[id^="tool-"]').forEach(btn => {
    btn.onclick = () => {
        if (btn.id === 'tool-search') {
            const box = document.getElementById('search-box');
            box.style.display = box.style.display === 'none' ? 'flex' : 'none'; return;
        }
        document.querySelectorAll('.btn[id^="tool-"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.id.replace('tool-', '');
        document.querySelectorAll('.drawing-layer').forEach(c => c.style.pointerEvents = currentTool === 'hand' ? 'none' : 'auto');
    };
});

document.getElementById('rotate-btn').onclick = () => { 
    rotation = (rotation + 90) % 360; 
    renderAllPages(); 
    renderThumbnails(); // Reworked: sync rotation to sidebar
};
document.getElementById('theme-btn').onclick = () => {
    currentTheme = currentTheme === 'dark' ? 'sepia' : (currentTheme === 'sepia' ? 'light' : 'dark');
    document.body.setAttribute('data-theme', currentTheme); renderAllPages();
};

let isRestoringScroll = false;
function scrollToPage(num, behavior = 'smooth') {
    const el = document.getElementById(`wrapper-${num}`);
    if (el) {
        isRestoringScroll = true;
        el.scrollIntoView({ behavior });
        // Clear the flag after a short delay to allow onscroll to settle
        setTimeout(() => { isRestoringScroll = false; }, 100);
    }
}

document.getElementById('download-btn').onclick = async () => {
    try {
        const btn = document.getElementById('download-btn'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const { PDFDocument, rgb } = PDFLib; const bytes = await fetch(pdfUrl).then(r => r.arrayBuffer());
        const pdf = await PDFDocument.load(bytes); const pgs = pdf.getPages();
        for (let i = 0; i < pgs.length; i++) {
            const pIdx = i + 1; const annots = annotations[pIdx] || []; if (annots.length === 0) continue;
            const pdfPage = pgs[i]; const { width: pW, height: pH } = pdfPage.getSize();
            const origPage = await pdfDoc.getPage(pIdx); const v = origPage.getViewport({ scale, rotation });
            for (const it of annots) {
                const hToR = (h) => { const r = parseInt(h.slice(1,3), 16)/255; const g = parseInt(h.slice(3,5), 16)/255; const b = parseInt(h.slice(5,7), 16)/255; return rgb(r, g, b); };
                const c = hToR(it.color || selectedColor);
                if (it.type === 'rect') {
                    const px = (it.x/v.width)*pW; const py = pH - ((it.y/v.height)*pH) - ((it.h/v.height)*pH);
                    pdfPage.drawRectangle({ x: px, y: py, width: (it.w/v.width)*pW, height: (it.h/v.height)*pH, color: c, opacity: 0.3 });
                } else if (it.type === 'text') {
                    const px = (it.x/v.width)*pW; const py = pH - ((it.y/v.height)*pH) - 16;
                    pdfPage.drawText(it.text, { x: px, y: py, size: 18, color: c });
                } else if (it.type === 'path') {
                    const x1 = (it.x1/v.width)*pW; const y1 = pH-((it.y1/v.height)*pH);
                    const x2 = (it.x2/v.width)*pW; const y2 = pH-((it.y2/v.height)*pH);
                    pdfPage.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: it.tool === 'pen' ? 1.5 : 12, color: c, opacity: it.tool === 'pen' ? 1 : 0.2 });
                }
            }
        }
        const sBytes = await pdf.save(); const b = new Blob([sBytes], { type: 'application/pdf' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `Ocal_${decodeURIComponent(pdfUrl.split('/').pop())}`; a.click();
        btn.innerHTML = '<i class="fas fa-download"></i>';
    } catch (e) {
        console.error(e); alert('Download failed.'); document.getElementById('download-btn').innerHTML = '<i class="fas fa-download"></i>';
    }
};

document.getElementById('zoom-in').onclick = () => { scale += 0.2; updateZoom(); };
document.getElementById('zoom-out').onclick = () => { if (scale > 0.4) scale -= 0.2; updateZoom(); };
function updateZoom() { document.getElementById('zoom-val').textContent = `${Math.round(scale * 100)}%`; renderAllPages(); }
document.getElementById('hide-sidebar').onclick = () => document.getElementById('sidebar').classList.add('collapsed');
document.getElementById('show-sidebar').onclick = () => document.getElementById('sidebar').classList.remove('collapsed');
document.getElementById('search-input').oninput = (e) => performSearch(e.target.value);
viewport.onscroll = () => {
    if (isRestoringScroll) return;
    const wraps = pageContainer.querySelectorAll('.page-wrapper');
    wraps.forEach((w, idx) => {
        const r = w.getBoundingClientRect(); 
        if (r.top < window.innerHeight/2 && r.bottom > window.innerHeight/2) {
            pageNum = idx + 1; 
            document.getElementById('page-num').value = pageNum;
            
            // Sync thumbnails
            document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
            const activeThumb = document.getElementById(`thumb-${pageNum}`);
            if (activeThumb) {
                activeThumb.classList.add('active');
                if (activeThumb.scrollIntoViewIfNeeded) activeThumb.scrollIntoViewIfNeeded({ behavior: 'smooth', block: 'center' });
                else activeThumb.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
};
