/**
 * Ocal AI Assistant - Core Logic
 * Features: Typing animations, Markdown rendering, Tool Call support
 */

const messagesEl = document.getElementById('ai-chat-messages');
const queryEl = document.getElementById('ai-query');
const sendBtn = document.getElementById('ai-send');
const clearBtn = document.getElementById('clear-chat');
const closeBtn = document.getElementById('close-ai');
const handle = document.getElementById('resize-handle');

// Global Settings State
let globalSettings = {};

// File Upload & Preview State
let attachedFile = null;
const fileInput = document.getElementById('ai-file-input');
const attachBtn = document.getElementById('ai-attach-btn');
const filePreview = document.getElementById('ai-file-preview');
const fileNameEl = document.getElementById('ai-file-name');
const fileIconEl = document.getElementById('ai-file-icon');
const fileRemoveBtn = document.getElementById('ai-file-remove');

attachBtn?.addEventListener('click', () => fileInput?.click());

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function extractTextFromPdf(arrayBuffer) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
}

fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isText = file.type.startsWith('text/') || 
                   ['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.py', '.cpp', '.c', '.h', '.hpp', '.cs', '.java', '.go', '.rs', '.sh', '.bat', '.ps1', '.yaml', '.yml', '.xml', '.sql', '.ini', '.conf', '.log', '.md'].some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isImage && !isPdf && !isText) {
        addMessage(`⚠️ **Error:** Unsupported file format. Please attach text/code files, PDFs, or images.`, false);
        if (fileInput) fileInput.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
        const result = event.target.result;
        if (isImage) {
            attachedFile = {
                name: file.name,
                mimeType: file.type,
                type: 'image',
                data: result.split(',')[1] // Base64 payload without prefix
            };
            fileIconEl.className = 'fas fa-file-image';
            fileNameEl.textContent = file.name;
            filePreview.style.display = 'flex';
        } else if (isPdf) {
            try {
                fileNameEl.textContent = "Parsing PDF...";
                fileIconEl.className = 'fas fa-spinner fa-spin';
                filePreview.style.display = 'flex';
                
                const pdfText = await extractTextFromPdf(result);
                attachedFile = {
                    name: file.name,
                    mimeType: file.type,
                    type: 'text',
                    data: pdfText
                };
                
                fileIconEl.className = 'fas fa-file-pdf';
                fileNameEl.textContent = file.name;
            } catch (err) {
                console.error("PDF Parsing Error:", err);
                attachedFile = null;
                if (fileInput) fileInput.value = '';
                filePreview.style.display = 'none';
                await addMessage(`⚠️ **Error parsing PDF:** ${err.message}`, false);
            }
        } else {
            attachedFile = {
                name: file.name,
                mimeType: file.type,
                type: 'text',
                data: result // Plain text content
            };
            fileIconEl.className = 'fas fa-file-lines';
            fileNameEl.textContent = file.name;
            filePreview.style.display = 'flex';
        }
    };

    if (isImage) {
        reader.readAsDataURL(file);
    } else if (isPdf) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
});

fileRemoveBtn?.addEventListener('click', () => {
    attachedFile = null;
    if (fileInput) fileInput.value = '';
    filePreview.style.display = 'none';
});

// Quick Tools
const toolSummarize = document.getElementById('tool-summarize');
const toolEmail = document.getElementById('tool-email');

// Configure Highlight.js
hljs.configure({ ignoreUnescapedHTML: true });

// Configure Marked (Standard V9+ Parsing)
const renderer = new marked.Renderer();

// Custom image renderer to load pollinations.ai or sd:// images with a pulsing overlay loader
renderer.image = function(href, title, text) {
    const isGenerated = href.includes('pollinations.ai');
    const isSd = href.startsWith('sd://');
    
    if (isGenerated || isSd) {
        const uniqueId = 'img-' + Math.floor(Math.random() * 1000000);
        
        if (isSd) {
            const promptText = decodeURIComponent(href.replace('sd://', ''));
            setTimeout(async () => {
                const finalImg = document.getElementById(uniqueId);
                const container = document.getElementById(`container-${uniqueId}`);
                const textEl = document.getElementById(`text-${uniqueId}`);

                const setStatus = (msg) => {
                    if (textEl) textEl.textContent = msg;
                };

                const engine = globalSettings.aiEngine || 'local';

                // --- Google Imagen 3 ---
                if (engine === 'gemini') {
                    const apiKey = globalSettings.aiApiKey;
                    if (!apiKey) {
                        setStatus("Gemini API key is required.");
                        if (container) container.classList.add('error');
                        return;
                    }
                    setStatus("Generating with Google Imagen...");
                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                instances: [{ prompt: promptText }],
                                parameters: {
                                    sampleCount: 1,
                                    aspectRatio: "1:1",
                                    outputMimeType: "image/jpeg"
                                }
                            })
                        });
                        
                        if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            throw new Error(errData.error?.message || `Imagen API failed: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        if (data.predictions && data.predictions.length > 0) {
                            const prediction = data.predictions[0];
                            const base64Data = prediction.bytesBase64Encoded || prediction.image?.imageBytes;
                            const mimeType = prediction.mimeType || 'image/jpeg';
                            if (base64Data && finalImg && container) {
                                finalImg.src = `data:${mimeType};base64,${base64Data}`;
                                finalImg.classList.remove('loading');
                                container.classList.add('loaded');
                            }
                            return;
                        } else {
                            throw new Error("No image generated in predictions");
                        }
                    } catch (err) {
                        console.error("Google Imagen Gen Error:", err);
                        setStatus('Failed to generate image with Imagen.');
                        if (container) container.classList.add('error');
                        return;
                    }
                }

                // --- OpenAI DALL-E ---
                if (engine === 'openai') {
                    const apiKey = globalSettings.openaiApiKey;
                    if (!apiKey) {
                        setStatus("OpenAI API key is required.");
                        if (container) container.classList.add('error');
                        return;
                    }
                    setStatus("Generating with DALL-E 3...");
                    try {
                        const response = await fetch('https://api.openai.com/v1/images/generations', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({
                                model: 'dall-e-3',
                                prompt: promptText,
                                n: 1,
                                size: '1024x1024'
                            })
                        });
                        
                        if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            throw new Error(errData.error?.message || `DALL-E API failed: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        if (data.data && data.data.length > 0) {
                            const imgUrl = data.data[0].url;
                            if (finalImg && container) {
                                finalImg.src = imgUrl;
                                finalImg.classList.remove('loading');
                                container.classList.add('loaded');
                            }
                            return;
                        } else {
                            throw new Error("No image generated by DALL-E");
                        }
                    } catch (err) {
                        console.error("DALL-E Gen Error:", err);
                        setStatus('Failed to generate image with DALL-E.');
                        if (container) container.classList.add('error');
                        return;
                    }
                }

                // --- Local Stable Diffusion (AUTOMATIC1111) first ---
                try {
                    setStatus("Checking local Stable Diffusion...");
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for fast fail-over

                    const localRes = await fetch('http://127.0.0.1:7860/sdapi/v1/txt2img', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: promptText,
                            steps: 20,
                            width: 512,
                            height: 512,
                            cfg_scale: 7,
                            sampler_name: "Euler a"
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (localRes.ok) {
                        setStatus("Generating locally...");
                        const data = await localRes.json();
                        if (data.images && data.images.length > 0) {
                            if (finalImg && container) {
                                finalImg.src = `data:image/png;base64,${data.images[0]}`;
                                finalImg.classList.remove('loading');
                                container.classList.add('loaded');
                            }
                            return;
                        }
                    }
                } catch (e) {
                    console.log("Local Stable Diffusion not running or error:", e);
                }

                // --- Fall back to AI Horde (Decentralized Open Source SD API) ---
                try {
                    setStatus("Connecting to AI Horde...");
                    const apiResponse = await fetch('https://aihorde.net/api/v2/generate/async', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': '0000000000',
                            'Client-Agent': 'ocal-browser:1.0'
                        },
                        body: JSON.stringify({
                            prompt: promptText,
                            params: {
                                n: 1,
                                width: 512,
                                height: 512,
                                steps: 20,
                                sampler_name: "k_euler"
                            }
                        })
                    });

                    if (!apiResponse.ok) {
                        throw new Error(`AI Horde async call failed: ${apiResponse.status}`);
                    }

                    const submitData = await apiResponse.json();
                    const requestId = submitData.id;
                    if (!requestId) {
                        throw new Error("No request ID returned by AI Horde");
                    }

                    // Poll AI Horde
                    let finished = false;
                    let attempts = 0;
                    const maxAttempts = 60; // 3 minutes max

                    while (!finished && attempts < maxAttempts) {
                        attempts++;
                        setStatus(`In Queue... (${attempts * 3}s)`);
                        await new Promise(r => setTimeout(r, 3000));

                        const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${requestId}`);
                        if (checkRes.ok) {
                            const checkData = await checkRes.json();
                            if (checkData.done) {
                                finished = true;
                            } else if (checkData.wait_time) {
                                setStatus(`Queueing... Est: ${checkData.wait_time}s`);
                            }
                        }
                    }

                    if (!finished) {
                        throw new Error("Generation timed out");
                    }

                    setStatus("Downloading image...");
                    const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${requestId}`);
                    if (!statusRes.ok) {
                        throw new Error("Failed to retrieve final image status");
                    }

                    const statusData = await statusRes.json();
                    if (statusData.generations && statusData.generations.length > 0) {
                        const imgUrl = statusData.generations[0].img;
                        if (finalImg && container) {
                            finalImg.src = imgUrl;
                            finalImg.classList.remove('loading');
                            container.classList.add('loaded');
                        }
                        return;
                    } else {
                        throw new Error("No generations returned");
                    }

                } catch (err) {
                    console.error("AI Horde Gen Error:", err);
                    if (textEl) textEl.textContent = 'Failed to generate image.';
                    if (container) container.classList.add('error');
                }
            }, 100);
        }

        return `
            <span class="image-gen-container" id="container-${uniqueId}">
                <span class="image-gen-loader" id="loader-${uniqueId}">
                    <span class="pixel-spinner"></span>
                    <span class="loader-text" id="text-${uniqueId}">Synthesizing image...</span>
                </span>
                <img ${isSd ? '' : `src="${href}"`} alt="${text || 'Generated Image'}" class="generated-image loading" id="${uniqueId}" 
                    onload="document.getElementById('${uniqueId}').classList.remove('loading'); document.getElementById('container-${uniqueId}').classList.add('loaded');"
                    onerror="document.getElementById('${uniqueId}').parentElement.classList.add('error'); document.getElementById('text-${uniqueId}').textContent = 'Failed to generate image.';">
            </span>
        `;
    }
    
    return `<img src="${href}" alt="${text || ''}" title="${title || ''}">`;
};

marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
});

// Helper: Scroll to bottom
const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
};

const renderMarkdown = (text, isFinal = true) => {
    // Replace file preview tag with custom HTML span inline chip
    let processedText = text.replace(/\[File:\s*\*\*(.*?)\*\*\]/gi, (match, filename) => {
        let iconClass = 'fa-file-lines';
        if (filename.toLowerCase().endsWith('.pdf')) {
            iconClass = 'fa-file-pdf';
        } else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename)) {
            iconClass = 'fa-file-image';
        }
        return `<span class="msg-file-chip"><i class="fas ${iconClass}"></i><span>${filename}</span></span>`;
    });

    // Replace image markdown with custom placeholder spinner during typing to avoid network spam and broken URLs
    if (!isFinal) {
        processedText = processedText.replace(/!\[(.*?)\]\((.*?)\)/gi, (match, alt, href) => {
            if (href.includes('pollinations.ai') || href.startsWith('sd://')) {
                return `
                    <span class="image-gen-container">
                        <span class="image-gen-loader">
                            <span class="pixel-spinner"></span>
                            <span class="loader-text">Synthesizing image...</span>
                        </span>
                    </span>
                `;
            }
            return `[Image: ${alt}]`;
        });
    }

    let html = marked.parse(processedText);
    // GFM Alert Parsing (Post-process)
    html = html.replace(/<blockquote>\s*<p>\[!NOTE\]/gi, '<div class="alert alert-note"><p>')
               .replace(/<blockquote>\s*<p>\[!TIP\]/gi, '<div class="alert alert-tip"><p>')
               .replace(/<blockquote>\s*<p>\[!IMPORTANT\]/gi, '<div class="alert alert-important"><p>')
               .replace(/<\/p>\s*<\/blockquote>/gi, '</p></div>');
    return html;
};

// Helper: Typing Animation
const typeMessage = async (container, text, speed = 15) => {
    let currentText = '';
    const words = text.split(' ');
    
    // Smoothly reveal words for an "intelligent" feel
    for (const word of words) {
        currentText += (currentText === '' ? '' : ' ') + word;
        container.innerHTML = renderMarkdown(currentText, false);
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, speed + Math.random() * 20));
    }
    
    // Final Markdown Render
    container.innerHTML = renderMarkdown(text, true);
    
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
    scrollToBottom();
};

// Helper: Add Message
const addMessage = async (content, isUser = false, actions = []) => {
    const group = document.createElement('div');
    group.className = `msg-group ${isUser ? 'user' : 'ai'}`;
    
    // Actions (if any)
    if (actions && actions.length > 0) {
        actions.forEach(action => {
            const actionEl = document.createElement('div');
            actionEl.className = `agent-action ${action.url ? 'clickable' : ''}`;
            actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-cog fa-spin'}"></i> ${action.text}`;
            
            if (action.url) {
                actionEl.onclick = () => window.electronAPI.send('open-external', action.url);
            } else if (action.command) {
                actionEl.onclick = () => window.electronAPI.send('execute-agent-command', action);
            }
            
            group.appendChild(actionEl);
        });
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    
    bubble.appendChild(contentDiv);
    group.appendChild(bubble);
    messagesEl.appendChild(group);
    scrollToBottom();

    if (isUser) {
        contentDiv.innerHTML = renderMarkdown(content);
    } else {
        await typeMessage(contentDiv, content);
    }
    
    return group;
};

// Helper: Thinking State
let currentThinkingEl = null;

const showThinking = () => {
    if (currentThinkingEl) return;
    const group = document.createElement('div');
    group.className = 'msg-group ai';
    group.innerHTML = `
        <div class="thinking">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    messagesEl.appendChild(group);
    currentThinkingEl = group;
    scrollToBottom();
};

const hideThinking = () => {
    if (currentThinkingEl) {
        currentThinkingEl.remove();
        currentThinkingEl = null;
    }
};

// Main Handler
const handleSend = async (customQuery = null) => {
    let q = (customQuery || queryEl.value).trim();
    if (!q && !attachedFile) return;

    if (!customQuery) {
        queryEl.value = '';
        queryEl.style.height = 'auto';
    }

    let userBubbleText = q;
    if (attachedFile) {
        if (!q) {
            q = "Analyze this file";
            userBubbleText = `Analyze attached file: **${attachedFile.name}**`;
        } else {
            userBubbleText = `[File: **${attachedFile.name}**]\n\n${q}`;
        }
    }

    await addMessage(userBubbleText, true);
    showThinking();

    // Prepare payload
    const payload = attachedFile ? { query: q, file: attachedFile } : q;

    // Reset file preview & state
    attachedFile = null;
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.style.display = 'none';

    try {
        const response = await window.electronAPI.invoke('ai-agent-execute', payload);
        hideThinking();
        
        if (response.error) {
            await addMessage(`**Error:** ${response.error}`, false);
        } else {
            const text = typeof response === 'string' ? response : (response.text || "Action complete.");
            const actions = typeof response === 'object' ? (response.actions || []) : [];
            await addMessage(text, false, actions);
        }
    } catch (err) {
        hideThinking();
        await addMessage(`**System Error:** ${err.message}`, false);
    }
};

// Event Listeners
sendBtn?.addEventListener('click', () => handleSend());

queryEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

queryEl?.addEventListener('input', () => {
    queryEl.style.height = 'auto';
    queryEl.style.height = (queryEl.scrollHeight) + 'px';
});

clearBtn?.addEventListener('click', () => {
    messagesEl.innerHTML = '';
    const initialMsg = "Hello! I am your Ocal AI Assistant. I can help you manage tabs, summarize pages, and search the web. What can I do for you?";
    addMessage(initialMsg, false);
});

closeBtn?.addEventListener('click', () => {
    window.electronAPI.send('toggle-ai-sidebar', false);
});

// Tool Handlers
toolSummarize?.addEventListener('click', () => handleSend("Please summarize the contents of this page."));
toolEmail?.addEventListener('click', () => handleSend("I'd like to compose an email. Help me draft it."));

const toolStatus = document.getElementById('tool-status');
const toolSettings = document.getElementById('tool-settings');
const toolBookmarks = document.getElementById('tool-bookmarks');
const toolHelp = document.getElementById('tool-help');

toolStatus?.addEventListener('click', () => handleSend("Show browser status"));
toolSettings?.addEventListener('click', () => handleSend("Show my current settings"));
toolBookmarks?.addEventListener('click', () => handleSend("List my bookmarks"));
toolHelp?.addEventListener('click', () => handleSend("What can you do?"));

// Resize Logic
if (handle) {
    handle.onmousedown = (e) => {
        window.electronAPI.send('start-ai-resize');
    };
}

// Accent Color Synchronization
function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.08));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(color, 0.25));
}

async function updateActiveModelBadge(s) {
    const badge = document.getElementById('active-model-badge');
    if (!badge) return;
    
    const engine = s.aiEngine || 'local';
    let label = '';
    
    if (engine === 'gemini') {
        label = 'Gemini Pro';
    } else if (engine === 'openai') {
        label = 'ChatGPT';
    } else if (engine === 'custom') {
        label = s.customModel || 'Custom AI';
    } else {
        let model = s.localModel || 'gemma-4';
        if (model === 'auto') {
            let endpoint = s.localEndpoint || 'http://127.0.0.1:11434';
            if (endpoint.includes('localhost')) {
                endpoint = endpoint.replace('localhost', '127.0.0.1');
            }
            try {
                const url = `${endpoint.replace(/\/$/, '')}/api/tags`;
                const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
                if (res.ok) {
                    const data = await res.json();
                    if (data.models && data.models.length > 0) {
                        model = data.models[0].name;
                    } else {
                        model = 'gemma-4';
                    }
                } else {
                    model = 'gemma-4';
                }
            } catch (e) {
                model = 'gemma-4';
            }
        }
        label = `Local: ${model}`;
    }
    
    badge.textContent = label;
    badge.style.display = 'inline-block';
}

// Listen for global settings changes
window.electronAPI.on('settings-changed', (e, s) => {
    globalSettings = s || {};
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
    if (s) updateActiveModelBadge(s);
});

// Get initial settings on load
window.electronAPI.invoke('get-settings').then(s => {
    globalSettings = s || {};
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
    if (s) updateActiveModelBadge(s);
});


// Global Agent Actions
window.electronAPI.on('ai-agent-action', (e, action) => {
    const actionEl = document.createElement('div');
    actionEl.className = 'agent-action';
    actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-bolt'}"></i> ${action.text}`;
    messagesEl.appendChild(actionEl);
    scrollToBottom();
});

// Animation Handshake logic
window.electronAPI.on('start-sidebar-exit', () => {
    document.body.classList.add('closing');
    // Wait for the animation to finish before signaling completion
    // The CSS animation is 400ms, so 450ms is a safe buffer
    setTimeout(() => {
        window.electronAPI.send('sidebar-exit-complete');
    }, 450);
});

window.electronAPI.on('sidebar-shown', () => {
    document.body.classList.remove('closing');
    const panel = document.querySelector('.ai-panel');
    if (panel) {
        // Remove the class first
        panel.classList.remove('animate-in');
        
        // Wait for two frames to ensure the browser has registered the removal
        // and rendered the initial hidden state (prevents the "black" flash)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.classList.add('animate-in');
            });
        });
    }
});

// Intercept all link clicks inside the messages container to open them in a new browser tab
messagesEl.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href) {
        if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
            e.preventDefault();
            window.electronAPI.send('open-external', link.href);
        }
    }
});

