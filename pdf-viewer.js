const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── Application State ──
let pdfDoc = null;
let currentPdfData = null; // Uint8Array or ArrayBuffer for download / re-render
let currentFileName = 'document.pdf';
let pageNum = 1;
let scale = 1.15;
let rotation = 0;
let currentTool = 'hand'; // 'hand' | 'pen' | 'highlight' | 'text' | 'stamp' | 'eraser'
let penWidth = 2.5;
let selectedColor = '#15AC49';
let readingMode = 'normal'; // 'normal' | 'invert'
let currentTheme = 'dark';
let activeStamp = null; // { type: 'badge'|'signature', text, dataUrl, color }
let annotations = {}; // pageNum -> array of annotation objects
let undoHistory = []; // stack of { pageNum, annotation } for undo
let pageTextData = {}; // pageNum -> items array
let allExtractedText = '';
let searchResults = [];
let currentSearchIdx = -1;
let currentSearchId = 0;
let isRestoringScroll = false;
let renderTaskIdCounter = 0;

// ── DOM References ──
const viewport = document.getElementById('viewport');
const pageContainer = document.getElementById('page-container-wrapper');
const emptyStateView = document.getElementById('empty-state-view');
const thumbnails = document.getElementById('thumbnails');
const outlineTree = document.getElementById('outline-tree');
const docTitle = document.getElementById('doc-title');
const pageNumInput = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const zoomVal = document.getElementById('zoom-val');
const zoomValBtn = document.getElementById('zoom-val-btn');
const zoomMenu = document.getElementById('zoom-menu');
const filePickerInput = document.getElementById('file-picker-input');
const colorWell = document.getElementById('color-well-btn');
const colorWellCircle = document.getElementById('color-well-circle');
const chromaCard = document.getElementById('chroma-card');
const chromaGrid = document.getElementById('chroma-grid');
const chromaHex = document.getElementById('chroma-hex');
const chromaCurrentHex = document.getElementById('chroma-current-hex');
const nativePickerBtn = document.getElementById('open-native-picker-btn');
const nativeColorPicker = document.getElementById('native-color-picker');
const searchBarFloating = document.getElementById('search-bar-floating');
const searchInput = document.getElementById('search-input');
const searchCount = document.getElementById('search-count');
const floatingOverlay = document.getElementById('floating-input-overlay');
const floatingInput = document.getElementById('floating-text-input');
const penWidthSelect = document.getElementById('pen-width-select');
const signatureModal = document.getElementById('signature-modal');
const sigCanvas = document.getElementById('signature-canvas');
const inspectorModal = document.getElementById('inspector-modal');
const toastContainer = document.getElementById('toast-container');
const printContainer = document.getElementById('print-container');

let userHasChosenColor = false;

// ── Palette Presets ──
const PALETTE = [
    '#15AC49', '#10B981', '#06B6D4', '#3B82F6', '#6366F1',
    '#A855F7', '#EC4899', '#EF4444', '#F97316', '#F59E0B',
    '#0F172A', '#D4FC2B', '#E11D48', '#84CC16', '#FFFFFF'
];

function hexToRgba(hex, alpha = 1) {
    if (!hex || !hex.startsWith('#')) return `rgba(21, 172, 73, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function showToast(message, duration = 2400, icon = 'fa-check') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 260);
    }, duration);
}

// ── Settings & Theme Harmonization ──
function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.3));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.1));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(color, 0.35));
    if (!userHasChosenColor) {
        updateColorDisplay(color);
    }
}

if (window.electronAPI && window.electronAPI.invoke) {
    window.electronAPI.invoke('get-settings').then(s => {
        if (s) {
            if (s.accentColor) applyAccent(s.accentColor);
            if (s.themeMode) {
                currentTheme = s.themeMode;
                document.body.setAttribute('data-theme', currentTheme);
            }
        }
    }).catch(() => {});
}

if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('settings-changed', (e, s) => {
        if (s) {
            if (s.accentColor) applyAccent(s.accentColor);
            if (s.themeMode && s.themeMode !== currentTheme) {
                currentTheme = s.themeMode;
                document.body.setAttribute('data-theme', currentTheme);
            }
        }
    });
}

// ── Chroma Controller & Real-Time Color Well ──
function updateColorDisplay(color) {
    if (!color) return;
    selectedColor = color;
    if (colorWellCircle) colorWellCircle.style.backgroundColor = color;
    if (chromaCurrentHex) {
        chromaCurrentHex.textContent = color.toUpperCase();
        chromaCurrentHex.style.color = color;
    }
    if (chromaHex) chromaHex.value = color.replace('#', '').toUpperCase();
    if (nativeColorPicker && color.startsWith('#') && color.length === 7) {
        nativeColorPicker.value = color;
    }
    // Update active ring on swatches
    document.querySelectorAll('.chroma-swatch').forEach(swatch => {
        if (swatch.dataset.color && swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
            swatch.classList.add('active');
        } else {
            swatch.classList.remove('active');
        }
    });
}

function selectColor(color) {
    if (!color) return;
    userHasChosenColor = true;
    updateColorDisplay(color);
    if (chromaCard) chromaCard.style.display = 'none';
    showToast(`Ink color: ${color.toUpperCase()}`, 1400, 'fa-palette');
}

function toggleColorPicker(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (!chromaCard || !colorWell) return;

    if (chromaCard.style.display === 'block') {
        chromaCard.style.display = 'none';
        return;
    }

    // Precision positioning directly under the color button
    const rect = colorWell.getBoundingClientRect();
    chromaCard.style.position = 'fixed';
    chromaCard.style.top = `${rect.bottom + 8}px`;

    let leftPos = rect.left + (rect.width / 2) - 125;
    if (leftPos < 12) leftPos = 12;
    if (leftPos + 260 > window.innerWidth) leftPos = window.innerWidth - 270;
    chromaCard.style.left = `${leftPos}px`;
    chromaCard.style.zIndex = '3500';
    chromaCard.style.display = 'block';

    updateColorDisplay(selectedColor);
}

function initChroma() {
    updateColorDisplay(selectedColor);
    if (!chromaGrid) return;
    chromaGrid.innerHTML = '';
    PALETTE.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'chroma-swatch';
        swatch.dataset.color = color;
        swatch.style.backgroundColor = color;
        if (color.toLowerCase() === selectedColor.toLowerCase()) swatch.classList.add('active');
        swatch.onclick = (e) => {
            e.stopPropagation();
            selectColor(color);
        };
        chromaGrid.appendChild(swatch);
    });

    if (colorWell) {
        colorWell.onclick = toggleColorPicker;
    }

    if (nativePickerBtn && nativeColorPicker) {
        nativePickerBtn.onclick = (e) => {
            e.stopPropagation();
            nativeColorPicker.click();
        };
        nativeColorPicker.oninput = (e) => {
            updateColorDisplay(e.target.value);
        };
        nativeColorPicker.onchange = (e) => {
            selectColor(e.target.value);
        };
    }

    if (chromaHex) {
        chromaHex.oninput = (e) => {
            let val = e.target.value.trim();
            if (val && !val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                updateColorDisplay(val);
            }
        };
        chromaHex.onkeydown = (e) => {
            if (e.key === 'Enter') {
                let val = e.target.value.trim();
                if (val && !val.startsWith('#')) val = '#' + val;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    selectColor(val);
                }
            }
        };
    }

    document.addEventListener('click', (e) => {
        if (chromaCard && !chromaCard.contains(e.target) && colorWell && !colorWell.contains(e.target) && e.target !== nativeColorPicker) {
            chromaCard.style.display = 'none';
        }
    });
}

initChroma();

// ── Document Loading & Empty State ──
function showEmptyState() {
    viewport.style.display = 'none';
    emptyStateView.style.display = 'flex';
    docTitle.textContent = 'Ocal Document Studio';
    pageNumInput.value = '0';
    pageCountSpan.textContent = '0';
    document.getElementById('info-filename').textContent = '-';
    document.getElementById('info-pages').textContent = '0';
    document.getElementById('info-size').textContent = '-';
}

function showDocumentView() {
    emptyStateView.style.display = 'none';
    viewport.style.display = 'flex';
}

async function loadPDF(source, name = 'document.pdf') {
    try {
        showToast('Loading document...', 1200, 'fa-spinner fa-spin');
        currentFileName = name;
        docTitle.textContent = name;
        document.title = `${name} - Ocal PDF Studio`;

        let loadingTask;
        if (typeof source === 'string') {
            loadingTask = pdfjsLib.getDocument({ url: source });
        } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
            currentPdfData = source;
            loadingTask = pdfjsLib.getDocument({ data: source });
        } else {
            throw new Error('Unsupported source format');
        }

        pdfDoc = await loadingTask.promise;
        showDocumentView();

        pageCountSpan.textContent = pdfDoc.numPages;
        pageNumInput.value = '1';
        pageNum = 1;
        annotations = {};
        undoHistory = [];
        pageTextData = {};
        allExtractedText = '';

        renderThumbnails();
        renderOutline();
        await renderAllPages();
        updateDocStats(source);

        showToast('Document ready', 1500, 'fa-check');
    } catch (err) {
        console.error('Failed to load PDF:', err);
        showToast('Could not load PDF document', 3000, 'fa-triangle-exclamation');
        showEmptyState();
    }
}

// ── Sample Document Generator (Immediate Play with zero external file needed) ──
async function createAndLoadSampleDoc() {
    try {
        showToast('Building sample PDF...', 1500, 'fa-wand-magic-sparkles');
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const pdfDocSample = await PDFDocument.create();
        const fontBold = await pdfDocSample.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDocSample.embedFont(StandardFonts.Helvetica);

        // Page 1: Welcome & Overview
        const page1 = pdfDocSample.addPage([600, 840]);
        const emerald = rgb(0.08, 0.67, 0.28);
        const darkSlate = rgb(0.06, 0.09, 0.16);
        const lightGray = rgb(0.4, 0.45, 0.55);

        // Header Banner
        page1.drawRectangle({
            x: 40,
            y: 720,
            width: 520,
            height: 80,
            color: rgb(0.94, 0.98, 0.95),
            borderColor: emerald,
            borderWidth: 1.5,
        });

        page1.drawText('OCAL DOCUMENT STUDIO', {
            x: 60,
            y: 765,
            size: 20,
            font: fontBold,
            color: emerald,
        });

        page1.drawText('Interactive Multi-Page Demonstration & Feature Guide', {
            x: 60,
            y: 742,
            size: 11,
            font: fontRegular,
            color: darkSlate,
        });

        // Body Content
        page1.drawText('Welcome to your modern, built-in PDF workstation.', {
            x: 40,
            y: 670,
            size: 14,
            font: fontBold,
            color: darkSlate,
        });

        const paragraphs = [
            'Ocal PDF Studio is engineered from the ground up for high-performance reading, markup,',
            'and documentation workflows. Every tool is optimized for zero latency and razor-sharp clarity.',
            '',
            'Key Capabilities:',
            '  * Freehand Pen & Highlighter with customizable stroke thickness and palette swatches.',
            '  * Digital Signature Pad & One-Click Enterprise Approval Stamps.',
            '  * In-Document Search (Ctrl+F) with real-time match stepping.',
            '  * Document Inspector with live word count, character count, and text extractor.',
            '  * Native High-Resolution Printing with true-to-scale page preservation.',
            '  * Distraction-Free Presentation Mode (F11) with keyboard page turning.',
            '',
            'Try using the Pen or Highlighter in the toolbar above to mark this text,',
            'or click "Signatures & Stamps" to place an enterprise APPROVED stamp on this page!'
        ];

        let curY = 635;
        for (const line of paragraphs) {
            page1.drawText(line, {
                x: 40,
                y: curY,
                size: 11,
                font: line.startsWith('Key Capabilities') ? fontBold : fontRegular,
                color: darkSlate,
            });
            curY -= 20;
        }

        // Page 2: Analytics & Spec Sheet
        const page2 = pdfDocSample.addPage([600, 840]);
        page2.drawText('Technical Specifications & Verification', {
            x: 40,
            y: 760,
            size: 18,
            font: fontBold,
            color: emerald,
        });

        page2.drawText('This second page proves multi-page scrolling, thumbnail navigation, and continuous rendering.', {
            x: 40,
            y: 730,
            size: 11,
            font: fontRegular,
            color: lightGray,
        });

        // Spec Table Box
        page2.drawRectangle({
            x: 40,
            y: 450,
            width: 520,
            height: 250,
            color: rgb(0.98, 0.99, 1.0),
            borderColor: rgb(0.85, 0.9, 0.95),
            borderWidth: 1,
        });

        page2.drawText('Feature Benchmark Matrix', {
            x: 60,
            y: 670,
            size: 13,
            font: fontBold,
            color: darkSlate,
        });

        const specs = [
            ['Rendering Pipeline', 'PDF.js High-DPI Canvas + Vector Overlay'],
            ['Text Selection', 'Native Browser Text Layer Selection & Copy'],
            ['Print System', 'Lossless 300-DPI Composited Print Containers'],
            ['Color Harmony', 'Dynamic Accent Sync with Ocal Browser'],
            ['Signing Studio', 'Freehand Touch/Mouse Signature & Status Stamps'],
            ['Export Integrity', 'Direct Binary Embedding via PDF-Lib']
        ];

        let tableY = 635;
        specs.forEach(([k, v]) => {
            page2.drawText(k, { x: 60, y: tableY, size: 10.5, font: fontBold, color: darkSlate });
            page2.drawText(v, { x: 230, y: tableY, size: 10.5, font: fontRegular, color: lightGray });
            tableY -= 26;
        });

        const sampleBytes = await pdfDocSample.save();
        await loadPDF(sampleBytes.buffer, 'Ocal_Interactive_Sample.pdf');
    } catch (e) {
        console.error('Failed to create sample PDF:', e);
        showToast('Error generating sample PDF', 2500, 'fa-triangle-exclamation');
    }
}

// ── Document Outline (Table of Contents) ──
async function renderOutline() {
    outlineTree.innerHTML = '';
    try {
        const outline = await pdfDoc.getOutline();
        if (!outline || outline.length === 0) {
            outlineTree.innerHTML = `
                <div style="padding:16px 10px; text-align:center; color:var(--text-dim); font-size:12px;">
                    <i class="fas fa-bookmark" style="font-size:20px; opacity:0.3; margin-bottom:8px; display:block;"></i>
                    No bookmarks outline found in this document.
                </div>
            `;
            return;
        }

        function createOutlineNode(item) {
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `<i class="fas fa-angle-right"></i><span>${item.title}</span>`;
            div.onclick = async () => {
                if (typeof item.dest === 'string') {
                    const dest = await pdfDoc.getDestination(item.dest);
                    if (dest) {
                        const pageIndex = await pdfDoc.getPageIndex(dest[0]);
                        scrollToPage(pageIndex + 1);
                    }
                } else if (Array.isArray(item.dest)) {
                    const pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
                    scrollToPage(pageIndex + 1);
                }
            };
            outlineTree.appendChild(div);

            if (item.items && item.items.length > 0) {
                const subWrap = document.createElement('div');
                subWrap.style.paddingLeft = '14px';
                item.items.forEach(child => {
                    const cDiv = document.createElement('div');
                    cDiv.className = 'outline-item';
                    cDiv.innerHTML = `<i class="fas fa-file-lines"></i><span>${child.title}</span>`;
                    cDiv.onclick = async () => {
                        if (typeof child.dest === 'string') {
                            const dest = await pdfDoc.getDestination(child.dest);
                            if (dest) {
                                const pageIndex = await pdfDoc.getPageIndex(dest[0]);
                                scrollToPage(pageIndex + 1);
                            }
                        } else if (Array.isArray(child.dest)) {
                            const pageIndex = await pdfDoc.getPageIndex(child.dest[0]);
                            scrollToPage(pageIndex + 1);
                        }
                    };
                    subWrap.appendChild(cDiv);
                });
                outlineTree.appendChild(subWrap);
            }
        }

        outline.forEach(item => createOutlineNode(item));
    } catch (e) {
        console.warn('Outline not available:', e);
    }
}

// ── Thumbnails ──
let thumbRenderCounter = 0;
async function renderThumbnails() {
    const curId = ++thumbRenderCounter;
    thumbnails.innerHTML = '';
    const dpr = window.devicePixelRatio || 1;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (curId !== thumbRenderCounter) return;

        const page = await pdfDoc.getPage(i);
        const group = document.createElement('div');
        group.className = 'thumb-group';

        const thumbWrap = document.createElement('div');
        thumbWrap.className = `thumb ${i === pageNum ? 'active' : ''}`;
        thumbWrap.id = `thumb-${i}`;

        const canvas = document.createElement('canvas');
        const v = page.getViewport({ scale: 0.25 * dpr, rotation });
        canvas.width = v.width;
        canvas.height = v.height;

        await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
        if (curId !== thumbRenderCounter) return;

        thumbWrap.appendChild(canvas);
        thumbWrap.onclick = () => scrollToPage(i);

        const num = document.createElement('div');
        num.className = 'thumb-num';
        num.textContent = `Page ${i}`;

        group.appendChild(thumbWrap);
        group.appendChild(num);
        thumbnails.appendChild(group);
    }
}

// ── Main Page Rendering with TextLayer & Annotations ──
async function renderAllPages() {
    const savedPage = pageNum;
    const renderId = ++renderTaskIdCounter;
    const dpr = window.devicePixelRatio || 1;
    const RENDER_SCALE_BOOST = 1.5;

    pageContainer.innerHTML = '';
    allExtractedText = '';

    const renderTasks = [];

    // 1. Create layout wrappers immediately so scroll sizing is stable
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (renderId !== renderTaskIdCounter) return;

        const page = await pdfDoc.getPage(i);
        const displayViewport = page.getViewport({ scale: scale, rotation });
        const renderViewport = page.getViewport({ scale: scale * RENDER_SCALE_BOOST * dpr, rotation });

        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        wrapper.id = `wrapper-${i}`;
        wrapper.style.width = displayViewport.width + 'px';
        wrapper.style.height = displayViewport.height + 'px';

        // Background PDF Canvas
        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.className = 'pdf-canvas';
        pdfCanvas.width = renderViewport.width;
        pdfCanvas.height = renderViewport.height;
        wrapper.appendChild(pdfCanvas);

        // Text Layer for real text selection & search highlight
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = displayViewport.width + 'px';
        textLayerDiv.style.height = displayViewport.height + 'px';
        wrapper.appendChild(textLayerDiv);

        // Drawing / Annotations Layer
        const drawingCanvas = document.createElement('canvas');
        drawingCanvas.className = 'drawing-layer';
        drawingCanvas.width = renderViewport.width;
        drawingCanvas.height = renderViewport.height;
        drawingCanvas.style.pointerEvents = currentTool === 'hand' ? 'none' : 'auto';
        setupDrawing(drawingCanvas, i, renderViewport);
        wrapper.appendChild(drawingCanvas);

        pageContainer.appendChild(wrapper);
        renderTasks.push({ page, pdfCanvas, textLayerDiv, drawingCanvas, i, v: renderViewport, dv: displayViewport });
    }

    // Restore scroll position
    if (renderId === renderTaskIdCounter && savedPage > 1) {
        scrollToPage(savedPage, 'auto');
    }

    // 2. Render contents prioritizing the currently visible page
    renderTasks.sort((a, b) => {
        if (a.i === savedPage) return -1;
        if (b.i === savedPage) return 1;
        return Math.abs(a.i - savedPage) - Math.abs(b.i - savedPage);
    });

    for (const task of renderTasks) {
        if (renderId !== renderTaskIdCounter) return;

        // Render PDF graphics
        await task.page.render({ canvasContext: task.pdfCanvas.getContext('2d'), viewport: task.v }).promise;

        // Render Text Content & Extraction
        const textContent = await task.page.getTextContent();
        pageTextData[task.i] = textContent.items;

        const pageWords = textContent.items.map(item => item.str).join(' ');
        allExtractedText += `--- Page ${task.i} ---\n${pageWords}\n\n`;

        // Populate TextLayer spans for selection
        if (pdfjsLib.renderTextLayer) {
            try {
                task.textLayerDiv.innerHTML = '';
                pdfjsLib.renderTextLayer({
                    textContentSource: textContent,
                    container: task.textLayerDiv,
                    viewport: task.dv,
                    textDivs: []
                });
            } catch (te) {
                console.warn('Text layer render notice:', te);
            }
        }

        // Redraw existing annotations
        if (annotations[task.i]) {
            redrawAnnotations(task.drawingCanvas, task.i);
        }
    }

    updateInspectorData();
}

// ── Annotations & Freehand Ink Drawing ──
let textToolState = null;

function setupDrawing(canvas, pageIdx, viewport) {
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let strokePoints = [];

    canvas.onmousedown = (e) => {
        if (currentTool === 'hand') return;

        const rect = canvas.getBoundingClientRect();
        const curX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const curY = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (currentTool === 'text') {
            showFloatingInput(e.clientX, e.clientY, pageIdx, curX, curY, canvas);
            return;
        }

        if (currentTool === 'stamp') {
            placeStamp(pageIdx, curX, curY, canvas);
            return;
        }

        if (currentTool === 'eraser') {
            if (eraseAt(pageIdx, curX, curY, canvas)) {
                redrawAnnotations(canvas, pageIdx);
            }
            return;
        }

        isDrawing = true;
        lastX = curX;
        lastY = curY;
        strokePoints = [{ x: lastX, y: lastY }];
    };

    canvas.onmousemove = (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const curX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const curY = (e.clientY - rect.top) * (canvas.height / rect.height);

        const dpr = window.devicePixelRatio || 1;
        const drawScale = scale * 1.5 * dpr;

        if (currentTool === 'pen') {
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = penWidth * drawScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(curX, curY);
            ctx.stroke();

            strokePoints.push({ x: curX, y: curY });
        } else if (currentTool === 'highlight') {
            ctx.strokeStyle = hexToRgba(selectedColor, 0.28);
            ctx.lineWidth = 18 * drawScale;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'bevel';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(curX, curY);
            ctx.stroke();

            strokePoints.push({ x: curX, y: curY });
        }

        lastX = curX;
        lastY = curY;
    };

    const finishStroke = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (strokePoints.length > 1) {
            if (!annotations[pageIdx]) annotations[pageIdx] = [];
            const strokeRecord = {
                type: 'stroke',
                tool: currentTool,
                color: currentTool === 'highlight' ? hexToRgba(selectedColor, 0.28) : selectedColor,
                width: currentTool === 'highlight' ? 18 : penWidth,
                points: strokePoints.map(p => ({
                    x_pct: p.x / canvas.width,
                    y_pct: p.y / canvas.height
                }))
            };
            annotations[pageIdx].push(strokeRecord);
            undoHistory.push({ pageIdx, item: strokeRecord });
        }
        strokePoints = [];
    };

    canvas.onmouseup = finishStroke;
    canvas.onmouseleave = finishStroke;
}

function showFloatingInput(screenX, screenY, pageIdx, canvasX, canvasY, canvas) {
    textToolState = { pageIdx, x: canvasX, y: canvasY, canvas };
    floatingOverlay.style.display = 'block';
    floatingOverlay.style.left = `${Math.min(screenX, window.innerWidth - 300)}px`;
    floatingOverlay.style.top = `${Math.min(screenY, window.innerHeight - 80)}px`;
    floatingInput.value = '';
    setTimeout(() => floatingInput.focus(), 50);
}

floatingInput.onkeydown = (e) => {
    if (e.key === 'Enter' && floatingInput.value.trim()) {
        const { pageIdx, x, y, canvas } = textToolState;
        if (!annotations[pageIdx]) annotations[pageIdx] = [];
        const textRecord = {
            type: 'text',
            text: floatingInput.value.trim(),
            x_pct: x / canvas.width,
            y_pct: y / canvas.height,
            color: selectedColor
        };
        annotations[pageIdx].push(textRecord);
        undoHistory.push({ pageIdx, item: textRecord });
        redrawAnnotations(canvas, pageIdx);
        closeFloatingInput();
        showToast('Text note placed', 1500, 'fa-font');
    } else if (e.key === 'Escape') {
        closeFloatingInput();
    }
};

function closeFloatingInput() {
    floatingOverlay.style.display = 'none';
    textToolState = null;
}

// ── Eraser & Undo ──
function eraseAt(pageIdx, x, y, canvas) {
    if (!annotations[pageIdx] || annotations[pageIdx].length === 0) return false;
    const initialLen = annotations[pageIdx].length;

    annotations[pageIdx] = annotations[pageIdx].filter(item => {
        if (item.type === 'text') {
            const itemX = item.x_pct * canvas.width;
            const itemY = item.y_pct * canvas.height;
            const dist = Math.hypot(x - itemX, y - itemY);
            return dist > 50;
        }
        if (item.type === 'stamp') {
            const itemX = item.x_pct * canvas.width;
            const itemY = item.y_pct * canvas.height;
            const dist = Math.hypot(x - itemX, y - itemY);
            return dist > 60;
        }
        if (item.type === 'stroke') {
            return !item.points.some(p => {
                const px = p.x_pct * canvas.width;
                const py = p.y_pct * canvas.height;
                return Math.hypot(x - px, y - py) < 25;
            });
        }
        return true;
    });

    return annotations[pageIdx].length !== initialLen;
}

document.getElementById('undo-btn').onclick = () => {
    if (undoHistory.length === 0) {
        showToast('No annotations to undo', 1500, 'fa-info-circle');
        return;
    }
    const last = undoHistory.pop();
    if (annotations[last.pageIdx]) {
        const idx = annotations[last.pageIdx].lastIndexOf(last.item);
        if (idx !== -1) annotations[last.pageIdx].splice(idx, 1);
        const canv = document.querySelector(`#wrapper-${last.pageIdx} .drawing-layer`);
        if (canv) redrawAnnotations(canv, last.pageIdx);
        showToast('Annotation undone', 1200, 'fa-rotate-left');
    }
};

// ── Redraw Annotations on Canvas ──
function redrawAnnotations(canvas, pageIdx) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    const renderScale = scale * 1.5 * dpr;

    drawAnnotationsOntoContext(ctx, pageIdx, canvas.width, canvas.height, renderScale);
}

function drawAnnotationsOntoContext(ctx, pageIdx, width, height, renderScale) {
    const items = annotations[pageIdx] || [];

    items.forEach(item => {
        ctx.save();
        if (item.type === 'stroke') {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = item.width * renderScale;
            ctx.lineCap = item.tool === 'highlight' ? 'square' : 'round';
            ctx.lineJoin = item.tool === 'highlight' ? 'bevel' : 'round';
            ctx.beginPath();
            item.points.forEach((pt, idx) => {
                const px = pt.x_pct * width;
                const py = pt.y_pct * height;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        } else if (item.type === 'text') {
            ctx.fillStyle = item.color;
            ctx.font = `bold ${Math.round(18 * renderScale)}px "Geist Sans", sans-serif`;
            ctx.textBaseline = 'hanging';
            ctx.fillText(item.text, item.x_pct * width, item.y_pct * height);
        } else if (item.type === 'stamp') {
            const sx = item.x_pct * width;
            const sy = item.y_pct * height;

            if (item.stampType === 'badge') {
                const badgeW = 140 * renderScale;
                const badgeH = 46 * renderScale;
                ctx.translate(sx, sy);
                ctx.rotate(-0.08); // Slight organic slant
                ctx.strokeStyle = item.color;
                ctx.lineWidth = 3 * renderScale;
                ctx.strokeRect(-badgeW/2, -badgeH/2, badgeW, badgeH);
                ctx.fillStyle = hexToRgba(item.color, 0.12);
                ctx.fillRect(-badgeW/2, -badgeH/2, badgeW, badgeH);

                ctx.fillStyle = item.color;
                ctx.font = `800 ${Math.round(18 * renderScale)}px "Geist Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.text, 0, 0);
            } else if (item.stampType === 'signature' && item.img) {
                const sigW = 160 * renderScale;
                const sigH = (item.img.height / item.img.width) * sigW;
                ctx.drawImage(item.img, sx - sigW/2, sy - sigH/2, sigW, sigH);
            }
        }
        ctx.restore();
    });
}

// ── Signature & Stamp Studio ──
const sigCtx = sigCanvas.getContext('2d');
let sigDrawing = false;
let sigHasStrokes = false;

function initSignaturePad() {
    sigCtx.strokeStyle = '#0F172A';
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';

    sigCanvas.onmousedown = (e) => {
        sigDrawing = true;
        sigHasStrokes = true;
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.beginPath();
        sigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    sigCanvas.onmousemove = (e) => {
        if (!sigDrawing) return;
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        sigCtx.stroke();
    };

    sigCanvas.onmouseup = () => sigDrawing = false;
    sigCanvas.onmouseleave = () => sigDrawing = false;

    document.getElementById('clear-sig-btn').onclick = () => {
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        sigHasStrokes = false;
    };

    document.querySelectorAll('.stamp-badge-btn').forEach(btn => {
        btn.onclick = () => {
            const stampText = btn.dataset.stamp;
            const stampColor = btn.style.color;
            activeStamp = { stampType: 'badge', text: stampText, color: stampColor };
            signatureModal.style.display = 'none';
            setTool('stamp');
            showToast(`Stamp '${stampText}' selected — click on page to place`, 3000, 'fa-stamp');
        };
    });

    document.getElementById('use-sig-btn').onclick = () => {
        if (!sigHasStrokes) {
            showToast('Please sign on the pad first', 2000, 'fa-circle-exclamation');
            return;
        }
        const img = new Image();
        img.src = sigCanvas.toDataURL();
        img.onload = () => {
            activeStamp = { stampType: 'signature', img, color: '#0F172A' };
            signatureModal.style.display = 'none';
            setTool('stamp');
            showToast('Signature ready — click on page to place', 3000, 'fa-signature');
        };
    };

    document.getElementById('close-sig-modal').onclick = () => {
        signatureModal.style.display = 'none';
    };
}

initSignaturePad();

function placeStamp(pageIdx, x, y, canvas) {
    if (!activeStamp) {
        signatureModal.style.display = 'flex';
        return;
    }
    if (!annotations[pageIdx]) annotations[pageIdx] = [];
    const stampRecord = {
        type: 'stamp',
        stampType: activeStamp.stampType,
        text: activeStamp.text,
        img: activeStamp.img,
        color: activeStamp.color,
        x_pct: x / canvas.width,
        y_pct: y / canvas.height
    };
    annotations[pageIdx].push(stampRecord);
    undoHistory.push({ pageIdx, item: stampRecord });
    redrawAnnotations(canvas, pageIdx);
    showToast('Stamp placed on document', 1500, 'fa-stamp');
}

// ── In-Document Search (Ctrl+F) ──
async function performSearch(query) {
    const searchId = ++currentSearchId;
    if (!query || query.trim().length === 0) {
        searchResults = [];
        currentSearchIdx = -1;
        searchCount.textContent = '0/0';
        clearAllHighlights();
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
                    height: item.height
                });
            }
        });
    }

    if (searchResults.length > 0) {
        currentSearchIdx = 0;
        searchCount.textContent = `1/${searchResults.length}`;
        jumpToSearchMatch(searchResults[0]);
    } else {
        currentSearchIdx = -1;
        searchCount.textContent = '0/0';
        clearAllHighlights();
    }
}

function searchNext() {
    if (searchResults.length === 0) return;
    currentSearchIdx = (currentSearchIdx + 1) % searchResults.length;
    searchCount.textContent = `${currentSearchIdx + 1}/${searchResults.length}`;
    jumpToSearchMatch(searchResults[currentSearchIdx]);
}

function searchPrev() {
    if (searchResults.length === 0) return;
    currentSearchIdx = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    searchCount.textContent = `${currentSearchIdx + 1}/${searchResults.length}`;
    jumpToSearchMatch(searchResults[currentSearchIdx]);
}

function clearAllHighlights() {
    for (let i = 1; i <= (pdfDoc ? pdfDoc.numPages : 0); i++) {
        const wrapper = document.getElementById(`wrapper-${i}`);
        if (wrapper) {
            const draw = wrapper.querySelector('.drawing-layer');
            if (draw) redrawAnnotations(draw, i);
        }
    }
}

async function jumpToSearchMatch(res) {
    clearAllHighlights();
    scrollToPage(res.pageNum);

    const wrapper = document.getElementById(`wrapper-${res.pageNum}`);
    if (!wrapper) return;
    const draw = wrapper.querySelector('.drawing-layer');
    if (!draw) return;

    redrawAnnotations(draw, res.pageNum);

    const page = await pdfDoc.getPage(res.pageNum);
    const dpr = window.devicePixelRatio || 1;
    const v = page.getViewport({ scale: scale * 1.5 * dpr, rotation });
    const ctx = draw.getContext('2d');

    const [scX, skX, skY, scY, tx, ty] = res.transform;
    const charW = res.width / (res.str.length || 1);
    const offsetX = res.matchIdx * charW;
    const wordW = res.matchLen * charW;

    const [vx1, vy1] = v.convertToViewportPoint(tx + offsetX, ty);
    const [vx2, vy2] = v.convertToViewportPoint(tx + offsetX + wordW, ty + scY);

    const x = Math.min(vx1, vx2);
    const y = Math.min(vy1, vy2);
    const w = Math.max(Math.abs(vx2 - vx1), 12);
    const h = Math.max(Math.abs(vy2 - vy1), 12);

    ctx.save();
    ctx.fillStyle = 'rgba(21, 172, 73, 0.4)';
    ctx.strokeStyle = '#15AC49';
    ctx.lineWidth = 2 * (scale * 1.5 * dpr);
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    ctx.restore();
}

// ── Document Inspector & Word Counter ──
function updateInspectorData() {
    const text = allExtractedText.replace(/--- Page \d+ ---/g, '').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const readMin = Math.max(1, Math.round(words / 200));

    document.getElementById('info-words').textContent = words.toLocaleString();
    document.getElementById('info-readtime').textContent = `${readMin} min`;
    document.getElementById('modal-word-count').textContent = words.toLocaleString();
    document.getElementById('modal-char-count').textContent = chars.toLocaleString();
    document.getElementById('modal-read-time').textContent = `${readMin}m`;
    document.getElementById('extracted-text-area').value = allExtractedText;
}

function updateDocStats(source) {
    document.getElementById('info-filename').textContent = currentFileName;
    document.getElementById('info-pages').textContent = pdfDoc.numPages;

    if (source instanceof ArrayBuffer || (source && source.byteLength)) {
        const bytes = source.byteLength;
        const mb = (bytes / (1024 * 1024)).toFixed(2);
        document.getElementById('info-size').textContent = `${mb} MB`;
    } else {
        document.getElementById('info-size').textContent = 'Direct Stream';
    }

    pdfDoc.getPage(1).then(p => {
        const v = p.getViewport({ scale: 1.0 });
        const wMm = Math.round(v.width * 0.352778);
        const hMm = Math.round(v.height * 0.352778);
        document.getElementById('info-dim').textContent = `${wMm} × ${hMm} mm`;
    });
}

// ── Printing Pipeline (100% Reliable, Crisp & Unclipped) ──
async function triggerPrint() {
    if (!pdfDoc) {
        showToast('No PDF document loaded to print.', 2500, 'fa-circle-exclamation');
        return;
    }

    showToast('Rendering high-resolution print pages...', 4000, 'fa-print fa-spin');
    printContainer.innerHTML = '';

    try {
        const PRINT_DPI_SCALE = 2.0;

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const printViewport = page.getViewport({ scale: PRINT_DPI_SCALE, rotation });

            const canvas = document.createElement('canvas');
            canvas.width = printViewport.width;
            canvas.height = printViewport.height;
            const ctx = canvas.getContext('2d');

            // Render crisp PDF page
            await page.render({ canvasContext: ctx, viewport: printViewport }).promise;

            // Composite all annotations seamlessly
            if (annotations[i] && annotations[i].length > 0) {
                drawAnnotationsOntoContext(ctx, i, canvas.width, canvas.height, PRINT_DPI_SCALE);
            }

            const printPageWrap = document.createElement('div');
            printPageWrap.className = 'print-page';

            const printImg = document.createElement('img');
            printImg.src = canvas.toDataURL('image/jpeg', 0.95);
            printPageWrap.appendChild(printImg);

            printContainer.appendChild(printPageWrap);
        }

        // Trigger native print
        setTimeout(() => {
            if (window.electronAPI && window.electronAPI.print) {
                window.electronAPI.print();
            } else {
                window.print();
            }

            // Cleanup print container after dialog completes
            setTimeout(() => {
                printContainer.innerHTML = '';
            }, 5000);
        }, 400);

    } catch (e) {
        console.error('Print generation error:', e);
        showToast('Print preparation failed', 2500, 'fa-triangle-exclamation');
    }
}

// ── Export & Download with PDF-Lib ──
document.getElementById('download-btn').onclick = async () => {
    if (!pdfDoc) return;
    try {
        const btn = document.getElementById('download-btn');
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>';

        const { PDFDocument, rgb } = PDFLib;
        let bytes;
        if (currentPdfData) {
            bytes = currentPdfData;
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const pUrl = urlParams.get('file');
            if (pUrl) bytes = await fetch(pUrl).then(r => r.arrayBuffer());
            else throw new Error('No PDF source data found');
        }

        const pdf = await PDFDocument.load(bytes);
        const pgs = pdf.getPages();

        for (let i = 0; i < pgs.length; i++) {
            const pIdx = i + 1;
            const annots = annotations[pIdx] || [];
            if (annots.length === 0) continue;

            const pdfPage = pgs[i];
            const { width: pW, height: pH } = pdfPage.getSize();

            for (const it of annots) {
                const parseColor = (col) => {
                    if (!col) return rgb(0.08, 0.67, 0.28);
                    const hex = col.startsWith('#') ? col : '#15AC49';
                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                    return rgb(r, g, b);
                };

                if (it.type === 'text') {
                    const px = it.x_pct * pW;
                    const py = pH - (it.y_pct * pH) - 16;
                    pdfPage.drawText(it.text, {
                        x: px,
                        y: py,
                        size: 16,
                        color: parseColor(it.color)
                    });
                } else if (it.type === 'stroke') {
                    for (let s = 0; s < it.points.length - 1; s++) {
                        const pt1 = it.points[s];
                        const pt2 = it.points[s + 1];
                        pdfPage.drawLine({
                            start: { x: pt1.x_pct * pW, y: pH - (pt1.y_pct * pH) },
                            end: { x: pt2.x_pct * pW, y: pH - (pt2.y_pct * pH) },
                            thickness: it.tool === 'highlight' ? 14 : (it.width || 2),
                            color: parseColor(it.color),
                            opacity: it.tool === 'highlight' ? 0.35 : 1
                        });
                    }
                } else if (it.type === 'stamp' && it.stampType === 'badge') {
                    const px = it.x_pct * pW;
                    const py = pH - (it.y_pct * pH);
                    pdfPage.drawRectangle({
                        x: px - 60,
                        y: py - 18,
                        width: 120,
                        height: 36,
                        color: rgb(0.95, 0.98, 0.96),
                        borderColor: parseColor(it.color),
                        borderWidth: 2,
                    });
                    pdfPage.drawText(it.text || 'APPROVED', {
                        x: px - 46,
                        y: py - 6,
                        size: 14,
                        color: parseColor(it.color)
                    });
                }
            }
        }

        const savedBytes = await pdf.save();
        const blob = new Blob([savedBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Ocal_Annotated_${currentFileName}`;
        a.click();

        btn.innerHTML = origHTML;
        showToast('Document exported successfully', 2000, 'fa-download');
    } catch (e) {
        console.error('Export failed:', e);
        showToast('Export failed', 2500, 'fa-triangle-exclamation');
        document.getElementById('download-btn').innerHTML = '<i class="fas fa-download"></i><span>Export PDF</span>';
    }
};

// ── Tool Selection ──
function setTool(toolName) {
    currentTool = toolName;
    document.querySelectorAll('.btn[id^="tool-"]').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById(`tool-${toolName}`);
    if (targetBtn) targetBtn.classList.add('active');

    penWidthSelect.style.display = toolName === 'pen' ? 'flex' : 'none';

    document.querySelectorAll('.drawing-layer').forEach(c => {
        c.style.pointerEvents = toolName === 'hand' ? 'none' : 'auto';
    });
}

document.querySelectorAll('.btn[id^="tool-"]').forEach(btn => {
    btn.onclick = () => {
        const tool = btn.id.replace('tool-', '');
        if (tool === 'search') {
            const shown = searchBarFloating.style.display === 'flex';
            searchBarFloating.style.display = shown ? 'none' : 'flex';
            if (!shown) searchInput.focus();
            return;
        }
        if (tool === 'inspector') {
            inspectorModal.style.display = 'flex';
            return;
        }
        if (tool === 'stamp') {
            signatureModal.style.display = 'flex';
            return;
        }
        setTool(tool);
    };
});

// Stroke Width Selection
document.querySelectorAll('.stroke-dot').forEach(dot => {
    dot.onclick = () => {
        document.querySelectorAll('.stroke-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        penWidth = parseFloat(dot.dataset.width);
    };
});

// ── Zoom & Navigation Handlers ──
function scrollToPage(num, behavior = 'smooth') {
    const el = document.getElementById(`wrapper-${num}`);
    if (el) {
        isRestoringScroll = true;
        el.scrollIntoView({ behavior, block: 'start' });
        pageNum = num;
        pageNumInput.value = pageNum;
        syncThumbnails(pageNum);
        setTimeout(() => { isRestoringScroll = false; }, 150);
    }
}

function syncThumbnails(num) {
    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
    const t = document.getElementById(`thumb-${num}`);
    if (t) {
        t.classList.add('active');
        if (t.scrollIntoViewIfNeeded) t.scrollIntoViewIfNeeded({ behavior: 'smooth', block: 'nearest' });
    }
}

document.getElementById('prev-btn').onclick = () => {
    if (pageNum > 1) scrollToPage(pageNum - 1);
};

document.getElementById('next-btn').onclick = () => {
    if (pdfDoc && pageNum < pdfDoc.numPages) scrollToPage(pageNum + 1);
};

pageNumInput.onchange = (e) => {
    let val = parseInt(e.target.value);
    if (!isNaN(val) && pdfDoc && val >= 1 && val <= pdfDoc.numPages) {
        scrollToPage(val);
    } else {
        e.target.value = pageNum;
    }
};

document.getElementById('zoom-in').onclick = () => {
    scale = Math.min(3.5, scale + 0.2);
    applyZoom();
};

document.getElementById('zoom-out').onclick = () => {
    scale = Math.max(0.4, scale - 0.2);
    applyZoom();
};

function applyZoom() {
    zoomVal.textContent = `${Math.round(scale * 100)}%`;
    renderAllPages();
}

zoomValBtn.onclick = (e) => {
    e.stopPropagation();
    zoomMenu.style.display = zoomMenu.style.display === 'flex' ? 'none' : 'flex';
};

document.querySelectorAll('.zoom-option').forEach(opt => {
    opt.onclick = () => {
        zoomMenu.style.display = 'none';
        const z = opt.dataset.zoom;
        if (z === 'fit-width') fitToWidth();
        else if (z === 'fit-page') fitToPage();
        else {
            scale = parseFloat(z);
            applyZoom();
        }
    };
});

function fitToWidth() {
    if (!pdfDoc) return;
    pdfDoc.getPage(pageNum).then(p => {
        const v = p.getViewport({ scale: 1.0, rotation });
        const availW = viewport.clientWidth - 60;
        scale = Math.max(0.4, Math.min(3.0, availW / v.width));
        applyZoom();
        showToast('Fitted to window width', 1200);
    });
}

function fitToPage() {
    if (!pdfDoc) return;
    pdfDoc.getPage(pageNum).then(p => {
        const v = p.getViewport({ scale: 1.0, rotation });
        const availH = viewport.clientHeight - 80;
        scale = Math.max(0.4, Math.min(3.0, availH / v.height));
        applyZoom();
        showToast('Fitted to page height', 1200);
    });
}

document.getElementById('fit-width-btn').onclick = fitToWidth;

document.getElementById('rotate-btn').onclick = () => {
    rotation = (rotation + 90) % 360;
    renderAllPages();
    renderThumbnails();
    showToast(`Rotated to ${rotation}°`, 1200, 'fa-rotate-right');
};

// ── Reading Themes & Presentation ──
document.getElementById('theme-btn').onclick = () => {
    if (readingMode === 'invert') {
        readingMode = 'normal';
        document.body.removeAttribute('data-reading-mode');
        document.body.setAttribute('data-theme', 'dark');
        showToast('Theme: Dark Studio', 1200, 'fa-moon');
    } else {
        const t = document.body.getAttribute('data-theme');
        if (t === 'dark') {
            document.body.setAttribute('data-theme', 'light');
            showToast('Theme: Light Paper', 1200, 'fa-sun');
        } else if (t === 'light') {
            document.body.setAttribute('data-theme', 'sepia');
            showToast('Theme: Warm Sepia Eye-Care', 1200, 'fa-book-open');
        } else {
            readingMode = 'invert';
            document.body.setAttribute('data-reading-mode', 'invert');
            document.body.setAttribute('data-theme', 'dark');
            showToast('Theme: High-Contrast Inverted', 1200, 'fa-circle-half-stroke');
        }
    }
};

const presentationBtn = document.getElementById('presentation-btn');
const exitPresentationBtn = document.getElementById('exit-presentation-btn');

presentationBtn.onclick = () => {
    document.body.classList.add('presentation-mode');
    exitPresentationBtn.style.display = 'flex';
    fitToPage();
    showToast('Presentation mode active (Press Esc to exit)', 2500, 'fa-expand');
};

exitPresentationBtn.onclick = () => {
    document.body.classList.remove('presentation-mode');
    exitPresentationBtn.style.display = 'none';
};

// ── Print Listener ──
document.getElementById('print-btn').onclick = triggerPrint;

// ── Search & Popovers Events ──
document.getElementById('search-input').oninput = (e) => performSearch(e.target.value);
document.getElementById('search-next').onclick = searchNext;
document.getElementById('search-prev').onclick = searchPrev;
document.getElementById('search-close').onclick = () => {
    searchBarFloating.style.display = 'none';
    clearAllHighlights();
};
document.getElementById('search-input').onkeydown = (e) => {
    if (e.key === 'Enter') {
        if (e.shiftKey) searchPrev();
        else searchNext();
    } else if (e.key === 'Escape') {
        searchBarFloating.style.display = 'none';
        clearAllHighlights();
    }
};

// Sidebar Tabs
document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('pane-thumbnails').style.display = tab === 'thumbnails' ? 'block' : 'none';
        document.getElementById('pane-outline').style.display = tab === 'outline' ? 'block' : 'none';
        document.getElementById('pane-info').style.display = tab === 'info' ? 'block' : 'none';
    };
});

document.getElementById('hide-sidebar').onclick = () => document.getElementById('sidebar').classList.add('collapsed');
document.getElementById('show-sidebar').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');

// Modals close triggers
document.getElementById('close-inspector-modal').onclick = () => inspectorModal.style.display = 'none';

function copyExtractedText() {
    if (!allExtractedText) {
        showToast('No text available to copy', 1500, 'fa-circle-exclamation');
        return;
    }
    navigator.clipboard.writeText(allExtractedText).then(() => {
        showToast('All document text copied to clipboard!', 2000, 'fa-copy');
    });
}
document.getElementById('copy-all-text-btn').onclick = copyExtractedText;
document.getElementById('modal-copy-text-btn').onclick = copyExtractedText;

// ── File Open Handlers ──
function triggerFilePicker() {
    filePickerInput.click();
}

document.getElementById('app-bar-open-btn').onclick = triggerFilePicker;
document.getElementById('empty-open-btn').onclick = triggerFilePicker;
document.getElementById('load-sample-btn').onclick = createAndLoadSampleDoc;

filePickerInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        loadPDF(event.target.result, file.name);
    };
    reader.readAsArrayBuffer(file);
};

// Drag and drop PDF onto window
window.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.getElementById('dropzone').classList.add('drag-over');
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('drag-over');
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                loadPDF(event.target.result, file.name);
            };
            reader.readAsArrayBuffer(file);
        } else {
            showToast('Please drop a valid .pdf file', 2500, 'fa-circle-exclamation');
        }
    }
});

// Viewport Scroll Tracker
viewport.onscroll = () => {
    if (isRestoringScroll || !pdfDoc) return;
    const wrappers = pageContainer.querySelectorAll('.page-wrapper');
    const midY = viewport.clientHeight / 2;

    wrappers.forEach((w, idx) => {
        const rect = w.getBoundingClientRect();
        if (rect.top <= midY && rect.bottom >= midY) {
            pageNum = idx + 1;
            pageNumInput.value = pageNum;
            syncThumbnails(pageNum);
        }
    });
};

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    // Ctrl+F / Cmd+F -> Search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchBarFloating.style.display = 'flex';
        searchInput.focus();
        searchInput.select();
    }
    // Ctrl+P / Cmd+P -> Print
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerPrint();
    }
    // Escape -> dismiss popovers
    if (e.key === 'Escape') {
        if (document.body.classList.contains('presentation-mode')) {
            document.body.classList.remove('presentation-mode');
            exitPresentationBtn.style.display = 'none';
        }
        zoomMenu.style.display = 'none';
        chromaCard.style.display = 'none';
        searchBarFloating.style.display = 'none';
        signatureModal.style.display = 'none';
        inspectorModal.style.display = 'none';
        closeFloatingInput();
        clearAllHighlights();
    }
    // Left/Right Page arrows
    if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            if (pageNum < (pdfDoc ? pdfDoc.numPages : 0)) scrollToPage(pageNum + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            if (pageNum > 1) scrollToPage(pageNum - 1);
        }
    }
});

document.addEventListener('click', (e) => {
    if (!zoomMenu.contains(e.target) && e.target !== zoomValBtn) {
        zoomMenu.style.display = 'none';
    }
});

// ── Startup Initialization ──
(function init() {
    const urlParams = new URLSearchParams(window.location.search);
    let targetFile = urlParams.get('file');

    if (targetFile) {
        // Normalize raw paths
        if (!targetFile.startsWith('http') && !targetFile.startsWith('file://') && !targetFile.startsWith('ocal://')) {
            const isLocal = /^[a-zA-Z]:[/\\]/.test(targetFile) || targetFile.startsWith('/') || targetFile.startsWith('\\\\');
            if (isLocal) targetFile = 'file:///' + targetFile.replace(/\\/g, '/');
        }
        const fileName = decodeURIComponent(targetFile.split('/').pop().split('\\').pop().split('?')[0]);
        loadPDF(targetFile, fileName);
    } else {
        showEmptyState();
    }
})();
