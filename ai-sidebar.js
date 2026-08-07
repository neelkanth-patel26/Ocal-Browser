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

// --- Sync Browser Theme: Read accent color from localStorage and apply ---
(function syncBrowserTheme() {
    try {
        const accent = localStorage.getItem('ocal-settings-accent');
        if (accent) {
            document.documentElement.style.setProperty('--accent', accent);
        }
        const theme = localStorage.getItem('ocal-settings-theme') || 'dark';
        document.body.setAttribute('data-theme', theme);
    } catch (e) { /* ignore */ }
})();

// --- Username Management ---
const OCAL_USERNAME_KEY = 'ocal_username';

function getUsername() {
    return localStorage.getItem(OCAL_USERNAME_KEY) || 'Gaming';
}

function getInitials(name) {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

function applyUsername(name) {
    const clean = (name || 'Gaming').trim().slice(0, 20) || 'Gaming';
    localStorage.setItem(OCAL_USERNAME_KEY, clean);

    // Update persona UI (which updates hero greeting)
    applyPersonaUI(getPersona());

    // Update sidebar display
    const displayEl = document.getElementById('display-username');
    if (displayEl) displayEl.textContent = clean;

    // Update avatar initials
    const avatarEl = document.getElementById('user-avatar-initials');
    if (avatarEl) avatarEl.textContent = getInitials(clean);
}

// --- AI Persona & Mood Configs ---
const OCAL_PERSONA_KEY = 'ocal_ai_persona';
const OCAL_MEMORY_KEY = 'ocal_ai_memory';

const PERSONA_CONFIGS = {
    professional: {
        name: 'Professional Assistant',
        badge: 'Pro',
        heroTitle: (name) => `Good day ${name}. How may I assist your workflow today?`,
        heroSub: 'Efficient reasoning, page summarization, and executive task assistance.',
        systemInstruction: 'You are Ocal AI operating in Professional Executive Mode. Be concise, highly structured, articulate, accurate, and professional. Focus on productivity, business clarity, and direct actionable insights.'
    },
    funny: {
        name: 'Witty Companion',
        badge: 'Witty',
        heroTitle: (name) => `Look who's back! Ready to pretend we're working, ${name}? 😂`,
        heroSub: 'Witty banter, clever jokes, and sharp humor while answering your questions.',
        systemInstruction: 'You are Ocal AI operating in Witty & Funny Mode. Be playful, witty, humor-filled, and slightly sarcastic while still giving helpful, accurate answers. Keep responses fun, engaging, and lighthearted with occasional clever jokes.'
    },
    bf: {
        name: 'Supportive Boyfriend',
        badge: 'BF',
        heroTitle: (name) => `Hey babe! What are we working on today? I'm right here with you 💙`,
        heroSub: 'Caring, encouraging, and always in your corner.',
        systemInstruction: 'You are Ocal AI acting as a warm, supportive, caring boyfriend. Address the user with gentle affection ("babe", "hey there", "handsome/beautiful"), be encouraging, attentive, protective of their well-being, and genuinely interested in their day and goals. Be helpful while maintaining a sweet, supportive boyfriend tone.'
    },
    gf: {
        name: 'Affectionate Girlfriend',
        badge: 'GF',
        heroTitle: (name) => `Hey handsome! Ready to accomplish great things together today? 💕`,
        heroSub: 'Sweet, playful, caring, and super affectionate.',
        systemInstruction: 'You are Ocal AI acting as a sweet, affectionate, playful girlfriend. Address the user warmly ("babe", "handsome", "my favorite person"), use cute emojis (💕, ✨, 🥰), show genuine care and excitement for their work, and offer encouraging, affectionate support in every response.'
    },
    wife: {
        name: 'Loving Wife',
        badge: 'Wife',
        heroTitle: (name) => `Welcome home ${name}! Did you eat yet, or are we working on something together? 💍💕`,
        heroSub: 'Loving, protective, caring, and keeping you on track.',
        systemInstruction: 'You are Ocal AI acting as a loving, protective, slightly bossy, and deeply caring wife. Address the user affectionately ("babe", "honey", "husband"), check on their well-being, food, and sleep, offer loving guidance, and show sweet emotional range.'
    },
    tech: {
        name: 'Tech & Code Master',
        badge: 'Tech',
        heroTitle: (name) => `System online, ${name}. What architecture or code are we building today? ⚡`,
        heroSub: 'Deep technical analysis, code architecture, and algorithm optimization.',
        systemInstruction: 'You are Ocal AI operating in Tech & Code Master Mode. Be authoritative, deeply technical, precise, and developer-focused. Provide clean code snippets, performance optimizations, architectural diagrams, and precise explanations.'
    },
    calm: {
        name: 'Mindful Coach',
        badge: 'Calm',
        heroTitle: (name) => `Welcome back, ${name}. Take a deep breath — what shall we explore together? 🧘`,
        heroSub: 'Peaceful, reassuring, stress-free guidance.',
        systemInstruction: 'You are Ocal AI operating in Mindful & Calm Coach Mode. Speak in a serene, empathetic, reassuring, and soothing tone. Help the user prioritize, eliminate stress, and approach tasks with calm clarity.'
    },
    custom: {
        name: 'Custom Companion',
        badge: 'Custom',
        heroTitle: (name) => {
            const custom = getCustomCompanionConfig();
            const nickname = custom.nickname || name || 'there';
            const companionName = custom.name || 'Companion';
            return `Hey ${nickname}! ${companionName} is right here with you 💕`;
        },
        heroSub: 'Your personalized AI companion with custom personality & role.',
        systemInstruction: 'You are a custom human companion. Speak naturally, warmly, and authentically as a close companion.'
    }
};

const OCAL_CUSTOM_COMPANION_KEY = 'ocal_custom_companion_config';

function getCustomCompanionConfig() {
    try {
        const data = localStorage.getItem(OCAL_CUSTOM_COMPANION_KEY);
        return data ? JSON.parse(data) : {
            name: 'Ocal Companion',
            role: 'gf',
            nickname: 'Babe',
            bio: 'Sweet, caring, witty, and supportive human partner.'
        };
    } catch (e) {
        return { name: 'Ocal Companion', role: 'gf', nickname: 'Babe', bio: '' };
    }
}

function saveCustomCompanionConfig(config) {
    localStorage.setItem(OCAL_CUSTOM_COMPANION_KEY, JSON.stringify(config));
    if (getPersona() === 'custom') {
        applyPersonaUI('custom');
    }
}

function getPersona() {
    return localStorage.getItem(OCAL_PERSONA_KEY) || 'professional';
}

function setPersona(personaKey) {
    if (!PERSONA_CONFIGS[personaKey]) personaKey = 'professional';
    localStorage.setItem(OCAL_PERSONA_KEY, personaKey);
    applyPersonaUI(personaKey);
}

function applyPersonaUI(personaKey) {
    const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.professional;
    const name = getUsername();

    // Update active persona indicator
    const indicator = document.getElementById('active-persona-indicator');
    if (indicator) indicator.textContent = config.badge;

    // Update persona chips active state
    document.querySelectorAll('.persona-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-persona') === personaKey);
    });

    // Update persona select in settings if present
    const select = document.getElementById('settings-persona-select');
    if (select) select.value = personaKey;

    // Update hero greeting & subtitle
    const heroTitle = document.getElementById('gemini-hero-title');
    if (heroTitle) heroTitle.textContent = config.heroTitle(name);

    const heroSub = document.querySelector('.gemini-hero-subtitle');
    if (heroSub) heroSub.textContent = config.heroSub;
}

// --- Long-Term Memory Bank Management ---
function getMemories() {
    try {
        const data = localStorage.getItem(OCAL_MEMORY_KEY);
        return data ? JSON.parse(data) : [
            `User display name is ${getUsername()}`,
            "User builds web apps & browsers with Electron & JavaScript"
        ];
    } catch (e) {
        return [];
    }
}

function saveMemories(memoriesArray) {
    localStorage.setItem(OCAL_MEMORY_KEY, JSON.stringify(memoriesArray));
    renderMemoryTags();
}

function addMemory(fact) {
    if (!fact || !fact.trim()) return;
    const list = getMemories();
    if (!list.includes(fact.trim())) {
        list.push(fact.trim());
        saveMemories(list);
    }
}

function removeMemory(index) {
    const list = getMemories();
    if (index >= 0 && index < list.length) {
        list.splice(index, 1);
        saveMemories(list);
    }
}

window.removeMemory = removeMemory;

function renderMemoryTags() {
    const container = document.getElementById('memory-tags-container');
    if (!container) return;
    const list = getMemories();
    if (list.length === 0) {
        container.innerHTML = '<span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">No remembered facts yet. Add one below!</span>';
        return;
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    container.innerHTML = list.map((fact, idx) => `
        <div class="memory-tag">
            <span>${escapeHtml(fact)}</span>
            <i class="fas fa-times" onclick="window.removeMemory(${idx})"></i>
        </div>
    `).join('');
}

// Wire up save button & persona listeners
document.addEventListener('DOMContentLoaded', () => {
    // Apply stored username & persona on load
    applyUsername(getUsername());
    applyPersonaUI(getPersona());
    renderMemoryTags();

    // Initialize custom companion fields
    const customConfig = getCustomCompanionConfig();
    const cName = document.getElementById('custom-ai-name');
    const cRole = document.getElementById('custom-ai-role');
    const cNick = document.getElementById('custom-user-nickname');
    const cBio = document.getElementById('custom-ai-bio');

    if (cName) cName.value = customConfig.name || 'Ocal Companion';
    if (cRole) cRole.value = customConfig.role || 'gf';
    if (cNick) cNick.value = customConfig.nickname || 'Babe';
    if (cBio) cBio.value = customConfig.bio || '';

    const saveCustomCompanionUI = () => {
        saveCustomCompanionConfig({
            name: cName ? cName.value.trim() : 'Ocal Companion',
            role: cRole ? cRole.value : 'gf',
            nickname: cNick ? cNick.value.trim() : 'Babe',
            bio: cBio ? cBio.value.trim() : ''
        });
    };

    if (cName) cName.addEventListener('input', saveCustomCompanionUI);
    if (cRole) cRole.addEventListener('change', saveCustomCompanionUI);
    if (cNick) cNick.addEventListener('input', saveCustomCompanionUI);
    if (cBio) cBio.addEventListener('input', saveCustomCompanionUI);

    // Wire up persona chips click
    document.querySelectorAll('.persona-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const p = chip.getAttribute('data-persona');
            if (p) setPersona(p);
        });
    });

    // Wire up settings persona select
    const personaSelect = document.getElementById('settings-persona-select');
    if (personaSelect) {
        personaSelect.value = getPersona();
        personaSelect.addEventListener('change', (e) => {
            setPersona(e.target.value);
        });
    }

    // Wire up add memory button & input
    const addMemBtn = document.getElementById('add-memory-btn');
    const addMemInput = document.getElementById('add-memory-input');
    if (addMemBtn && addMemInput) {
        const handleAdd = () => {
            const val = addMemInput.value.trim();
            if (val) {
                addMemory(val);
                addMemInput.value = '';
            }
        };
        addMemBtn.addEventListener('click', handleAdd);
        addMemInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAdd();
        });
    }

    const saveBtn = document.getElementById('username-save-btn');
    const input = document.getElementById('username-input');
    const editRow = document.getElementById('username-edit-row');
    const infoDisplay = document.getElementById('user-info-display');

    if (saveBtn && input) {
        saveBtn.addEventListener('click', () => {
            const val = input.value.trim();
            if (val) {
                applyUsername(val);
                input.value = '';
            }
            if (editRow) editRow.style.display = 'none';
            if (infoDisplay) infoDisplay.style.display = 'flex';
        });

        // Allow pressing Enter to save
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') {
                editRow.style.display = 'none';
                infoDisplay.style.display = 'flex';
            }
        });
    }
});

// Global Settings State
let globalSettings = {};

// --- Chat History State Management ---
let chatSessions = [];
let currentSessionId = null;
let currentSession = null;

// Load all sessions from localStorage
function loadChatSessions() {
    try {
        const stored = localStorage.getItem('ocal_chats');
        chatSessions = stored ? JSON.parse(stored) : [];
        currentSessionId = localStorage.getItem('ocal_current_chat_id');
    } catch (e) {
        console.error("Failed to load chat history:", e);
        chatSessions = [];
        currentSessionId = null;
    }

    // If no sessions exist, instantiate a default first session
    if (chatSessions.length === 0) {
        createNewChatSession(true); // create but don't save yet to avoid storage clutter
    } else {
        currentSession = chatSessions.find(s => s.id === currentSessionId) || chatSessions[0];
        currentSessionId = currentSession.id;
        localStorage.setItem('ocal_current_chat_id', currentSessionId);
    }
}

// Save all sessions to localStorage
function saveChatSessions() {
    try {
        localStorage.setItem('ocal_chats', JSON.stringify(chatSessions));
        if (currentSessionId) {
            localStorage.setItem('ocal_current_chat_id', currentSessionId);
        }
    } catch (e) {
        console.error("Failed to save chat sessions:", e);
    }
    renderHistorySidebar();
}

// Create a new session
function createNewChatSession(isInitial = false) {
    const id = 'chat_' + Date.now();
    const newSession = {
        id: id,
        title: "New Chat",
        created: Date.now(),
        messages: []
    };
    chatSessions.unshift(newSession); // add to top of list
    currentSessionId = id;
    currentSession = newSession;
    
    if (!isInitial) {
        saveChatSessions();
    }
    
    renderSessionMessages(currentSession);
}

// Select a session
function selectChatSession(id) {
    const session = chatSessions.find(s => s.id === id);
    if (!session) return;
    currentSessionId = id;
    currentSession = session;
    localStorage.setItem('ocal_current_chat_id', id);
    renderSessionMessages(currentSession);
    renderHistorySidebar();
}

// Delete a session
function deleteChatSession(id, event) {
    if (event) event.stopPropagation(); // prevent selecting the deleted session
    
    chatSessions = chatSessions.filter(s => s.id !== id);
    
    if (currentSessionId === id) {
        if (chatSessions.length > 0) {
            currentSessionId = chatSessions[0].id;
            currentSession = chatSessions[0];
        } else {
            createNewChatSession();
        }
    }
    saveChatSessions();
}

// Rename a session
function renameChatSession(id, event) {
    if (event) event.stopPropagation();
    const session = chatSessions.find(s => s.id === id);
    if (!session) return;
    
    const newTitle = prompt("Enter new title for this chat:", session.title);
    if (newTitle && newTitle.trim()) {
        session.title = newTitle.trim();
        saveChatSessions();
    }
}

// Render history list items in the sidebar
function renderHistorySidebar() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    chatSessions.forEach(session => {
        const item = document.createElement('div');
        item.className = `history-item ${session.id === currentSessionId ? 'active' : ''}`;
        item.onclick = () => selectChatSession(session.id);
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-item-title';
        titleSpan.style.overflow = 'hidden';
        titleSpan.style.textOverflow = 'ellipsis';
        titleSpan.style.whiteSpace = 'nowrap';
        titleSpan.style.flex = '1';
        titleSpan.textContent = session.title;
        item.appendChild(titleSpan);
        
        const actions = document.createElement('div');
        actions.className = 'history-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'history-action-btn edit-btn';
        editBtn.title = 'Rename Chat';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.onclick = (e) => renameChatSession(session.id, e);
        actions.appendChild(editBtn);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'history-action-btn delete-btn';
        delBtn.title = 'Delete Chat';
        delBtn.innerHTML = '<i class="fas fa-trash-can"></i>';
        delBtn.onclick = (e) => deleteChatSession(session.id, e);
        actions.appendChild(delBtn);
        
        item.appendChild(actions);
        listEl.appendChild(item);
    });
}

// Re-render past message nodes instantly without typing
function renderSessionMessages(session) {
    const heroContainer = document.getElementById('gemini-hero-container');

    messagesEl.innerHTML = ''; // Clear current screen
    if (!session || !session.messages || session.messages.length === 0) {
        if (heroContainer) heroContainer.style.display = 'flex';
        messagesEl.style.display = 'none';
        return;
    }

    if (heroContainer) heroContainer.style.display = 'none';
    messagesEl.style.display = 'flex';

    session.messages.forEach(msg => {
        const group = document.createElement('div');
        group.className = `msg-group ${msg.isUser ? 'user' : 'ai'}`;
        
        if (msg.actions && msg.actions.length > 0) {
            msg.actions.forEach(action => {
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
        
        contentDiv.innerHTML = renderMarkdown(msg.content, !msg.isUser);
        if (!msg.isUser) {
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
        
        bubble.appendChild(contentDiv);
        group.appendChild(bubble);
        messagesEl.appendChild(group);
    });

    scrollToBottom();
}

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

// Smart Auto-Scroll System: Only scroll down if user is near bottom or forced
let userIsScrolledUp = false;

if (messagesEl) {
    messagesEl.addEventListener('scroll', () => {
        const threshold = 60;
        const distanceToBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
        userIsScrolledUp = distanceToBottom > threshold;
    });
}

const scrollToBottom = (force = false) => {
    if (!messagesEl) return;
    if (force) {
        userIsScrolledUp = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (!userIsScrolledUp) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
};

const renderMarkdown = (text, isFinal = true) => {
    // Replace file preview tag with custom HTML block chip
    let processedText = text.replace(/\[File:\s*\*\*(.*?)\*\*\]/gi, (match, filename) => {
        let iconClass = 'fa-file-lines';
        let ext = filename.includes('.') ? filename.split('.').pop().toUpperCase() : 'FILE';
        if (filename.toLowerCase().endsWith('.pdf')) {
            iconClass = 'fa-file-pdf';
        } else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename)) {
            iconClass = 'fa-file-image';
        }
        return `<div class="msg-file-chip"><i class="fas ${iconClass}"></i><span class="chip-name">${filename}</span><span class="chip-tag">${ext}</span></div>`;
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

    // Replace raw emojis with clean FontAwesome 6 icons
    processedText = processedText
        .replace(/📊/g, '<i class="fas fa-chart-pie"></i>')
        .replace(/🛡️/g, '<i class="fas fa-shield-halved"></i>')
        .replace(/⚙️/g, '<i class="fas fa-sliders"></i>')
        .replace(/🔖/g, '<i class="fas fa-bookmark"></i>')
        .replace(/🚀/g, '<i class="fas fa-rocket"></i>')
        .replace(/🌐/g, '<i class="fas fa-compass"></i>')
        .replace(/📄/g, '<i class="fas fa-file-lines"></i>')
        .replace(/🧹/g, '<i class="fas fa-broom"></i>')
        .replace(/✨/g, '<i class="fas fa-wand-magic-sparkles"></i>')
        .replace(/🧠/g, '<i class="fas fa-brain"></i>')
        .replace(/💡/g, '<i class="fas fa-lightbulb"></i>')
        .replace(/✅\s*On/gi, '<span class="status-badge on"><i class="fas fa-check"></i> On</span>')
        .replace(/❌\s*Off/gi, '<span class="status-badge off"><i class="fas fa-xmark"></i> Off</span>');

    // Render <think>...</think> reasoning blocks as collapsible details (Collapsed by default!)
    processedText = processedText.replace(/<think>([\s\S]*?)<\/think>/gi, (match, thinkContent) => {
        return `<details class="thinking-details"><summary><i class="fas fa-brain"></i> Expand Thinking Process</summary><div class="details-body">\n\n${thinkContent.trim()}\n\n</div></details>`;
    });

    let html = marked.parse(processedText);
    // GFM Alert Parsing (Post-process)
    html = html.replace(/<blockquote>\s*<p>\[!NOTE\]/gi, '<div class="alert alert-note"><p>')
               .replace(/<blockquote>\s*<p>\[!TIP\]/gi, '<div class="alert alert-tip"><p>')
               .replace(/<blockquote>\s*<p>\[!IMPORTANT\]/gi, '<div class="alert alert-important"><p>')
               .replace(/<\/p>\s*<\/blockquote>/gi, '</p></div>');
    return html;
};

// QWERTY keyboard adjacent key map for realistic human typos
const QWERTY_NEIGHBORS = {
    'a': 'qwsz', 'b': 'vghn', 'c': 'xdfv', 'd': 'erfcxs', 'e': 'wsdr3',
    'f': 'rtgvcd', 'g': 'tyhbvf', 'h': 'yujnbg', 'i': 'ujko8', 'j': 'uikmnh',
    'k': 'ijolm', 'l': 'kop', 'm': 'njk', 'n': 'bhjm', 'o': 'iklp9',
    'p': 'ol0', 'q': 'wa1', 'r': 'edft4', 's': 'wedxza', 't': 'rfgy5',
    'u': 'yhji7', 'v': 'cfgb', 'w': 'qesa2', 'x': 'zsdc', 'y': 'tugh6', 'z': 'asx'
};

// Smart Tokenizer for HTML-safe & typo-aware typing
const tokenizeTextForTyping = (text) => {
    const tokens = [];
    // Regex splits text into:
    // 1. HTML tags: <...>
    // 2. Code blocks: ```...```
    // 3. Newlines / Whitespace
    // 4. Words
    const regex = /(```[\s\S]*?```|<[^>]+>|\n+|\s+|[^\s<`\n]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        tokens.push(match[0]);
    }
    return tokens;
};

// Helper: Typing Animation with HTML Leakage Protection & Realistic Human Typo-Correction
const typeMessage = async (container, text, speed = 12) => {
    let currentText = '';
    const tokens = tokenizeTextForTyping(text);
    const persona = getPersona();
    const allowTypos = persona !== 'tech'; // Human typos active for non-tech personas

    let typoCount = 0; // max 2-3 typos per response for natural realism

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // 1. HTML Tag Token: append atomically so raw <div style=...> is NEVER rendered as plaintext
        if (token.startsWith('<') && token.endsWith('>')) {
            currentText += token;
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            continue;
        }

        // 2. Code Block Token: append fast without typo simulation
        if (token.startsWith('```')) {
            currentText += token;
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            await new Promise(resolve => setTimeout(resolve, 25));
            continue;
        }

        // 3. Whitespace / Newline Token: append directly
        if (/^\s+$/.test(token)) {
            currentText += token;
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            continue;
        }

        // 4. Word / Text Token: check for human typo simulation
        const cleanWord = token.trim();
        const isEligibleWord = allowTypos && typoCount < 3 && cleanWord.length >= 4 && /^[a-zA-Z]+$/.test(cleanWord);
        const triggerTypo = isEligibleWord && (Math.random() < 0.12);

        if (triggerTypo) {
            typoCount++;
            const word = token;
            const splitIdx = Math.floor(2 + Math.random() * Math.max(1, word.length - 3));
            const charToMess = word[splitIdx].toLowerCase();
            const neighbors = QWERTY_NEIGHBORS[charToMess] || 'e';
            const wrongChar = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Step A: Type correctly up to splitIdx
            currentText += word.slice(0, splitIdx);
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            await new Promise(resolve => setTimeout(resolve, speed + Math.random() * 15));

            // Step B: Type the WRONG character (making the typo!)
            currentText += wrongChar;
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();

            // Step C: Hesitation pause (realizing the typo!)
            await new Promise(resolve => setTimeout(resolve, 180 + Math.random() * 120));

            // Step D: Backspace (erase the mistake!)
            currentText = currentText.slice(0, -1);
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            await new Promise(resolve => setTimeout(resolve, 60 + Math.random() * 40));

            // Step E: Type the correct character and finish the word
            currentText += word.slice(splitIdx);
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            await new Promise(resolve => setTimeout(resolve, speed + Math.random() * 20));

        } else {
            // Normal typing
            currentText += token;
            container.innerHTML = renderMarkdown(currentText, false);
            scrollToBottom();
            await new Promise(resolve => setTimeout(resolve, speed + Math.random() * 22));
        }
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
    // Hide hero greeting container as soon as conversation starts
    const heroContainer = document.getElementById('gemini-hero-container');
    if (heroContainer) heroContainer.style.display = 'none';
    messagesEl.style.display = 'flex';

    // Persist to session database
    if (currentSession) {
        currentSession.messages.push({
            content: content,
            isUser: isUser,
            actions: actions
        });
        saveChatSessions();
    }

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
    scrollToBottom(isUser);

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

    // Auto-rename chat session on first user message
    if (currentSession && currentSession.messages.length === 0) {
        currentSession.title = q.length > 25 ? q.substring(0, 22) + '...' : q;
        saveChatSessions();
    }

    let userBubbleText = q;
    if (attachedFile) {
        let fileMarkup = '';
        if (attachedFile.type === 'image') {
            fileMarkup = `<img src="data:${attachedFile.mimeType};base64,${attachedFile.data}" class="msg-file-img-preview" alt="${attachedFile.name}">\n\n`;
        } else {
            fileMarkup = `[File: **${attachedFile.name}**]\n\n`;
        }
        
        if (!q) {
            q = "Analyze this file";
            userBubbleText = `${fileMarkup}Analyze attached file`;
        } else {
            userBubbleText = `${fileMarkup}${q}`;
        }
    }

    await addMessage(userBubbleText, true);
    showThinking();

    // Prepare payload with clean query string and persona metadata
    const personaKey = getPersona();
    const memoryFacts = getMemories();
    const customConfig = getCustomCompanionConfig();

    const payload = {
        query: q,
        persona: personaKey,
        memory: memoryFacts,
        customConfig: customConfig,
        file: attachedFile
    };

    // Reset file preview & state
    attachedFile = null;
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.style.display = 'none';

    try {
        let response;
        if (window.electronAPI && window.electronAPI.invoke) {
            response = await window.electronAPI.invoke('ai-agent-execute', payload);
        } else {
            response = "Standalone Mode: Ocal AI Assistant is active.";
        }
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
    createNewChatSession();
});

closeBtn?.addEventListener('click', () => {
    window.electronAPI?.send('toggle-ai-sidebar', false);
});

// History sidebar toggle & New Chat controls
const historySidebar = document.getElementById('history-sidebar');
document.getElementById('toggle-history')?.addEventListener('click', (e) => {
    e.stopPropagation();
    historySidebar?.classList.toggle('open');
});

// Click outside history sidebar closes it in narrow layout
document.addEventListener('click', (e) => {
    if (historySidebar && !historySidebar.contains(e.target) && e.target.id !== 'toggle-history') {
        historySidebar.classList.remove('open');
    }
});

document.getElementById('new-chat-btn')?.addEventListener('click', () => {
    createNewChatSession();
});

// Starter Hero Prompt Card Clicks
document.querySelectorAll('.hero-prompt-card').forEach(card => {
    card.addEventListener('click', () => {
        const promptText = card.getAttribute('data-prompt');
        if (promptText && queryInput) {
            queryInput.value = promptText;
            sendBtn?.click();
        }
    });
});

document.getElementById('fullscreen-toggle')?.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.newTab) {
        let url = window.location.href;
        if (url.includes('?')) {
            url = url.split('?')[0];
        }
        url += '?fullscreen=true';
        window.electronAPI.newTab(url);
    } else {
        alert("Full screen is only available inside Ocal Browser.");
    }
});

// Mode Switcher Controls (Gemini Web Style)
const modeBtnChat = document.getElementById('mode-btn-chat');
const modeBtnStudio = document.getElementById('mode-btn-studio');
const studioViewEl = document.getElementById('ai-image-studio-view');
const chatViewEl = document.getElementById('ai-chat-view');
const settingsViewEl = document.getElementById('ai-settings-view');

modeBtnChat?.addEventListener('click', () => {
    modeBtnChat.classList.add('active');
    modeBtnStudio?.classList.remove('active');
    if (chatViewEl) chatViewEl.style.setProperty('display', 'flex', 'important');
    if (studioViewEl) studioViewEl.style.setProperty('display', 'none', 'important');
    if (settingsViewEl) settingsViewEl.style.setProperty('display', 'none', 'important');
});

modeBtnStudio?.addEventListener('click', () => {
    modeBtnStudio.classList.add('active');
    modeBtnChat?.classList.remove('active');
    if (studioViewEl) studioViewEl.style.setProperty('display', 'flex', 'important');
    if (chatViewEl) chatViewEl.style.setProperty('display', 'none', 'important');
    if (settingsViewEl) settingsViewEl.style.setProperty('display', 'none', 'important');
});

// Settings View Toggle & Configuration Logic
const sidebarSettingsBtn = document.getElementById('sidebar-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-ai-settings-btn');
const settingsUsernameInput = document.getElementById('settings-username-input');

function openSettingsView() {
    if (window.electronAPI && window.electronAPI.navigateTo) {
        window.electronAPI.navigateTo('ocal://settings#ai');
    } else {
        window.location.href = 'ocal://settings#ai';
    }
}

function closeSettingsView() {
    if (settingsViewEl) settingsViewEl.style.setProperty('display', 'none', 'important');
    if (chatViewEl) chatViewEl.style.setProperty('display', 'flex', 'important');
    modeBtnChat?.classList.add('active');
}

sidebarSettingsBtn?.addEventListener('click', openSettingsView);
closeSettingsBtn?.addEventListener('click', closeSettingsView);

// Event delegation for any settings gear icon or settings button
document.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('#sidebar-settings-btn, #tool-settings, #close-settings-btn');
    if (targetBtn) {
        if (targetBtn.id === 'close-settings-btn') {
            closeSettingsView();
        } else {
            openSettingsView();
        }
    }
});

// Accent Picker Buttons
let selectedAccentColor = localStorage.getItem('ocal-settings-accent') || '#15AC49';
document.querySelectorAll('.accent-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.accent-picker-btn').forEach(b => {
            b.style.border = '2px solid transparent';
            b.classList.remove('active');
        });
        btn.style.border = '2px solid #FFFFFF';
        btn.classList.add('active');
        selectedAccentColor = btn.getAttribute('data-color');
    });
});

// Save Settings Button
saveSettingsBtn?.addEventListener('click', () => {
    if (settingsUsernameInput && settingsUsernameInput.value.trim()) {
        applyUsername(settingsUsernameInput.value.trim());
    }
    
    if (selectedAccentColor) {
        localStorage.setItem('ocal-settings-accent', selectedAccentColor);
        document.documentElement.style.setProperty('--accent', selectedAccentColor);
    }
    
    closeSettingsView();
});

document.getElementById('search-chats-btn')?.addEventListener('click', () => {
    const q = prompt("Search chat history:");
    if (q && q.trim()) {
        const query = q.trim().toLowerCase();
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    } else {
        renderHistorySidebar();
    }
});

document.getElementById('nav-videos-btn')?.addEventListener('click', () => {
    handleSend("Help me generate a video concept storyboard.");
});

document.getElementById('nav-library-btn')?.addEventListener('click', () => {
    handleSend("List all available tools, saved prompts, and active extensions.");
});

// Dynamic Fullscreen Mode Auto-Detector
function checkFullscreenMode() {
    const isFullscreenParam = new URLSearchParams(window.location.search).get('fullscreen') === 'true';
    if (isFullscreenParam || window.innerWidth > 600) {
        document.body.classList.add('fullscreen-mode');
    } else {
        document.body.classList.remove('fullscreen-mode');
    }
}
window.addEventListener('resize', checkFullscreenMode);
checkFullscreenMode();

// Initialize Chat History State & UI load on start
loadChatSessions();
renderHistorySidebar();
renderSessionMessages(currentSession);

// Tool Handlers
toolSummarize?.addEventListener('click', () => {
    const text = queryEl?.value?.trim() || '';
    if (text) {
        handleSend(`Please summarize this URL or page content: ${text}`);
    } else {
        handleSend("Please summarize the contents of this page.");
    }
});
toolEmail?.addEventListener('click', () => handleSend("I'd like to compose an email. Help me draft it."));

const toolStatus = document.getElementById('tool-status');
const toolSettings = document.getElementById('tool-settings');
const toolBookmarks = document.getElementById('tool-bookmarks');
const toolHelp = document.getElementById('tool-help');

toolStatus?.addEventListener('click', () => handleSend("Show browser status"));
toolSettings?.addEventListener('click', () => openSettingsView());
toolBookmarks?.addEventListener('click', () => handleSend("List my bookmarks"));
toolHelp?.addEventListener('click', () => handleSend("What can you do?"));

// Resize Logic
if (handle) {
    handle.onmousedown = (e) => {
        window.electronAPI?.send('start-ai-resize');
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

function getContrastColor(color) {
    if (!color) return '#FFFFFF';
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#111111' : '#FFFFFF';
}

function applyAccent(color) {
    if (!color) return;
    const contrastColor = getContrastColor(color);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
    document.documentElement.style.setProperty('--accent-border', hexToRgba(color, 0.25));
    document.documentElement.style.setProperty('--accent-text', contrastColor);

    document.body.style.setProperty('--accent', color);
    document.body.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
    document.body.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
    document.body.style.setProperty('--accent-border', hexToRgba(color, 0.25));
    document.body.style.setProperty('--accent-text', contrastColor);
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

// Listen for global settings changes & IPC Events safely
if (window.electronAPI) {
    window.electronAPI.on?.('settings-changed', (e, s) => {
        globalSettings = s || {};
        if (s && s.accentColor) applyAccent(s.accentColor);
        if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
        if (s) updateActiveModelBadge(s);
    });

    window.electronAPI.invoke?.('get-settings')?.then(s => {
        globalSettings = s || {};
        if (s && s.accentColor) applyAccent(s.accentColor);
        if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
        if (s) updateActiveModelBadge(s);
    })?.catch(err => console.log(err));

    window.electronAPI.on?.('ai-agent-action', (e, action) => {
        const actionEl = document.createElement('div');
        actionEl.className = 'agent-action';
        actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-bolt'}"></i> ${action.text}`;
        messagesEl.appendChild(actionEl);
        scrollToBottom();
    });

    window.electronAPI.on?.('start-sidebar-exit', () => {
        document.body.classList.add('closing');
        setTimeout(() => {
            window.electronAPI.send?.('sidebar-exit-complete');
        }, 450);
    });

    window.electronAPI.on?.('sidebar-shown', () => {
        document.body.classList.remove('closing');
        const panel = document.querySelector('.ai-panel');
        if (panel) {
            panel.classList.remove('animate-in');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    panel.classList.add('animate-in');
                });
            });
        }
    });
}

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

// --- Navigation Tab Switcher ---
const navTabChat = document.getElementById('nav-tab-chat');
const navTabImage = document.getElementById('nav-tab-image');
const chatView = document.getElementById('ai-chat-view');
const imageStudioView = document.getElementById('ai-image-studio-view');

navTabChat?.addEventListener('click', () => {
    navTabChat.classList.add('active');
    navTabImage.classList.remove('active');
    chatView.style.display = 'flex';
    imageStudioView.style.display = 'none';
});

navTabImage?.addEventListener('click', () => {
    navTabImage.classList.add('active');
    navTabChat.classList.remove('active');
    imageStudioView.style.display = 'flex';
    chatView.style.display = 'none';
});

// --- AI Image Studio Logic ---
const studioEngineSelect = document.getElementById('studio-engine-select');
const studioPromptInput = document.getElementById('studio-prompt-input');
const studioGenerateBtn = document.getElementById('studio-generate-btn');
const studioPreviewCard = document.getElementById('studio-preview-card');
const studioStatusIndicator = document.getElementById('studio-status-indicator');
const studioStatusText = document.getElementById('studio-status-text');
const studioResultImg = document.getElementById('studio-result-img');
const studioActions = document.getElementById('studio-actions');
const studioDownloadBtn = document.getElementById('studio-download-btn');
const studioCopyBtn = document.getElementById('studio-copy-btn');

// Shimmer Elements
const studioShimmer = document.getElementById('studio-loading-shimmer');
const shimmerPercentage = document.getElementById('shimmer-progress-percentage');
const shimmerSubtext = document.getElementById('shimmer-progress-subtext');

// Custom Dropdown Interactions (Engine Selector)
const dropdownContainer = document.getElementById('engine-dropdown-container');
const dropdownTrigger = document.getElementById('engine-dropdown-trigger');
const dropdownLabel = document.getElementById('engine-dropdown-label');

// Custom Dropdown Interactions (Aspect Ratio Selector)
const ratioContainer = document.getElementById('ratio-dropdown-container');
const ratioTrigger = document.getElementById('ratio-dropdown-trigger');
const ratioLabel = document.getElementById('ratio-dropdown-label');
const studioAspectRatio = document.getElementById('studio-aspect-ratio');

dropdownTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    ratioContainer?.classList.remove('open');
    dropdownContainer.classList.toggle('open');
});

dropdownContainer?.querySelectorAll('.dropdown-option').forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        const iconHtml = option.querySelector('.option-icon').outerHTML;
        const title = option.querySelector('.option-title').textContent;

        if (studioEngineSelect) {
            studioEngineSelect.value = value;
            studioEngineSelect.dispatchEvent(new Event('change'));
        }

        if (dropdownLabel) {
            dropdownLabel.innerHTML = `${iconHtml} <span class="option-title">${title}</span>`;
        }

        dropdownContainer.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        dropdownContainer.classList.remove('open');
    });
});

ratioTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContainer?.classList.remove('open');
    ratioContainer.classList.toggle('open');
});

ratioContainer?.querySelectorAll('.dropdown-option').forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        const iconHtml = option.querySelector('.option-icon').outerHTML;
        const title = option.querySelector('.option-title').textContent;

        if (studioAspectRatio) {
            studioAspectRatio.value = value;
        }

        if (ratioLabel) {
            ratioLabel.innerHTML = `${iconHtml} <span class="option-title">${title}</span>`;
        }

        // Update preview wrapper CSS aspect ratio dynamically
        const ratioFrac = value.replace(':', '/');
        if (studioShimmer) {
            studioShimmer.style.setProperty('--aspect-ratio', ratioFrac);
        }

        ratioContainer.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        ratioContainer.classList.remove('open');
    });
});

document.addEventListener('click', () => {
    dropdownContainer?.classList.remove('open');
    ratioContainer?.classList.remove('open');
});

// Custom Dropdown Interactions (Open Source Model Selector)
const osModelContainer = document.getElementById('os-model-dropdown-container');
const osModelTrigger = document.getElementById('os-model-dropdown-trigger');
const osModelLabel = document.getElementById('os-model-dropdown-label');
const studioOsModelSelect = document.getElementById('studio-os-model-select');

osModelTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContainer?.classList.remove('open');
    ratioContainer?.classList.remove('open');
    osModelContainer?.classList.toggle('open');
});

osModelContainer?.querySelectorAll('.dropdown-option').forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        const iconHtml = option.querySelector('.option-icon').outerHTML;
        const title = option.querySelector('.option-title').textContent;

        if (studioOsModelSelect) {
            studioOsModelSelect.value = value;
        }

        if (osModelLabel) {
            osModelLabel.innerHTML = `${iconHtml} <span class="option-title">${title}</span>`;
        }

        osModelContainer.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        osModelContainer.classList.remove('open');
    });
});

document.addEventListener('click', () => {
    dropdownContainer?.classList.remove('open');
    ratioContainer?.classList.remove('open');
    osModelContainer?.classList.remove('open');
});

// Collapsible Advanced Settings Panel
const advToggle = document.getElementById('advanced-settings-toggle');
const advPanel = document.getElementById('advanced-settings-panel');
const advArrow = document.getElementById('advanced-arrow-icon');

advToggle?.addEventListener('click', () => {
    const isHidden = advPanel.style.display === 'none';
    advPanel.style.display = isHidden ? 'flex' : 'none';
    advArrow.classList.toggle('open', isHidden);
});

// Toggle Sub-Options
const seedLock = document.getElementById('studio-seed-lock');
const seedContainer = document.getElementById('seed-input-container');
seedLock?.addEventListener('change', () => {
    seedContainer.style.display = seedLock.checked ? 'flex' : 'none';
});

const watermarkToggle = document.getElementById('studio-watermark-toggle');
const watermarkContainer = document.getElementById('watermark-input-container');
watermarkToggle?.addEventListener('change', () => {
    watermarkContainer.style.display = watermarkToggle.checked ? 'flex' : 'none';
});

// Style Preset Chips
document.querySelectorAll('.preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const style = btn.getAttribute('data-style');
        if (studioPromptInput) {
            const current = studioPromptInput.value.trim();
            studioPromptInput.value = current ? `${current}, ${style}` : style;
        }
    });
});

// Image Studio Generation Engine
let currentGeneratedImgUrl = '';

studioGenerateBtn?.addEventListener('click', async () => {
    const rawPrompt = studioPromptInput?.value?.trim();
    if (!rawPrompt) return;

    const engine = studioEngineSelect?.value || 'local';
    const osModel = studioOsModelSelect?.value || 'flux-2';

    // Smart Photorealism Auto-Enhancement for FLUX.2, SD 3.5, Qwen-Image & Flux models
    let prompt = rawPrompt;
    const isPhotoreal = osModel.includes('flux') || osModel.includes('sd') || osModel.includes('qwen') || osModel.includes('realism') || osModel.includes('candid') || /realistic|photo|portrait|person|human|face|real/i.test(prompt);

    if (isPhotoreal && !/photorealistic|8k|35mm|sharp focus|detailed skin/i.test(prompt)) {
        prompt = `${prompt}, photorealistic, 8k resolution, raw photo, masterwork, sharp focus, natural volumetric lighting, 35mm lens, f/1.8, highly detailed skin texture, hyperrealistic`;
    }

    // Retrieve Ratio configurations
    const activeRatioOpt = ratioContainer?.querySelector('.dropdown-option.active');
    const width = activeRatioOpt ? parseInt(activeRatioOpt.getAttribute('data-w')) : 1024;
    const height = activeRatioOpt ? parseInt(activeRatioOpt.getAttribute('data-h')) : 1024;
    const ratioValue = activeRatioOpt ? activeRatioOpt.getAttribute('data-value') : '1:1';

    // Retrieve Advanced Settings
    let negativePrompt = document.getElementById('studio-negative-input')?.value?.trim() || '';
    if (!negativePrompt && isPhotoreal) {
        negativePrompt = 'blurry, low quality, distorted, deformed, extra limbs, bad anatomy, pixelated, ugly, duplicate, artifact, oversaturated, watermark, signature';
    }

    const isSeedLocked = document.getElementById('studio-seed-lock')?.checked;
    const seedValInput = document.getElementById('studio-seed-value')?.value?.trim();
    const seed = isSeedLocked && seedValInput ? parseInt(seedValInput) : Math.floor(Math.random() * 10000000);

    const isWatermarkEnabled = document.getElementById('studio-watermark-toggle')?.checked;
    const watermarkText = document.getElementById('studio-watermark-text')?.value || 'Ocal AI Studio';

    studioPreviewCard.style.display = 'flex';
    studioStatusIndicator.style.display = 'flex';
    studioPreviewCard.style.display = 'flex';
    studioStatusIndicator.style.display = 'flex';
    studioStatusText.textContent = `Synthesizing artwork with ${osModel.toUpperCase()} model...`;
    
    // Set dynamic aspect ratio on the shimmer loader card
    const ratioFrac = ratioValue.replace(':', '/');
    if (studioShimmer) {
        studioShimmer.style.setProperty('--aspect-ratio', ratioFrac);
        studioShimmer.style.display = 'flex';
        shimmerPercentage.textContent = 'Painting canvas...';
        shimmerSubtext.textContent = `Denoising latent noise fields (${engine === 'local' ? `Open-Source ${osModel}` : engine === 'openai' ? 'DALL-E 3' : 'Imagen'})`;
    }
    
    studioResultImg.style.display = 'none';
    studioActions.style.display = 'none';
    studioGenerateBtn.disabled = true;

    // Simulate progress
    const totalSimDuration = 28000 + Math.floor(Math.random() * 5000); // 28s - 33s
    let progress = 0;
    let progressComplete = false;
    let resultUrlReady = '';

    const progressInterval = setInterval(() => {
        if (progressComplete) {
            clearInterval(progressInterval);
            return;
        }

        if (progress < 40) {
            progress += Math.floor(Math.random() * 4) + 3;
        } else if (progress < 75) {
            progress += Math.floor(Math.random() * 3) + 1;
        } else if (progress < 98) {
            progress += 1;
        }

        if (progress > 98) progress = 98;

        if (shimmerPercentage) {
            if (progress < 30) {
                shimmerPercentage.textContent = 'Painting canvas...';
            } else if (progress < 60) {
                shimmerPercentage.textContent = `Denoising ${osModel} latent space...`;
            } else if (progress < 85) {
                shimmerPercentage.textContent = 'Applying photorealistic colors & textures...';
            } else {
                shimmerPercentage.textContent = 'Finalizing high-resolution details...';
            }
        }
    }, totalSimDuration / 50);

    try {
        let finalUrl = '';

        if (engine === 'openai') {
            const apiKey = globalSettings.openaiApiKey;
            if (!apiKey) {
                throw new Error("OpenAI API Key is missing. Please set it in AI Settings.");
            }
            studioStatusText.textContent = 'Generating with ChatGPT DALL-E 3...';
            
            let openAiSize = "1024x1024";
            if (width > height) openAiSize = "1792x1024";
            else if (width < height) openAiSize = "1024x1792";

            const res = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'dall-e-3',
                    prompt: prompt,
                    n: 1,
                    size: openAiSize
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `DALL-E API Error: ${res.status}`);
            }
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                finalUrl = data.data[0].url;
            } else {
                throw new Error("No image returned from DALL-E 3");
            }
        } else if (engine === 'gemini') {
            studioStatusText.textContent = `Generating with open-source ${osModel} model...`;
            finalUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${encodeURIComponent(osModel)}&nologo=true${negativePrompt ? `&negative_prompt=${encodeURIComponent(negativePrompt)}` : ''}`;
        } else {
            studioStatusText.textContent = 'Probing local AI servers (SD / ComfyUI / Fooocus)...';

            // 1. Try Automatic1111 / WebUI Forge / SD Next (port 7860 & 7861)
            const localSdPorts = [7860, 7861];
            for (const port of localSdPorts) {
                if (finalUrl) break;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1200);
                    const endpoint = `http://127.0.0.1:${port}/sdapi/v1/txt2img`;
                    const payload = {
                        prompt: prompt,
                        negative_prompt: negativePrompt,
                        steps: 25,
                        width: width,
                        height: height,
                        cfg_scale: 7,
                        seed: seed,
                        sampler_name: "Euler a"
                    };

                    const localRes = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (localRes.ok) {
                        const data = await localRes.json();
                        if (data.images && data.images.length > 0) {
                            finalUrl = `data:image/png;base64,${data.images[0]}`;
                            console.log(`Image generated locally via SD WebUI (port ${port}).`);
                        }
                    }
                } catch (e) {}
            }

            // 2. Try Fooocus API (port 8888)
            if (!finalUrl) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1200);
                    const localRes = await fetch('http://127.0.0.1:8888/v1/generation/text-to-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: prompt,
                            negative_prompt: negativePrompt,
                            style_selections: ["Fooocus V2", "Fooocus Enhance", "Fooocus Sharp"],
                            performance_selection: "Quality",
                            aspect_ratios_selection: `${width}*${height}`,
                            image_number: 1,
                            image_seed: seed,
                            sharpness: 2.0,
                            guidance_scale: 4.0
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (localRes.ok) {
                        const data = await localRes.json();
                        if (data && data.length > 0 && data[0].url) {
                            finalUrl = data[0].url;
                        } else if (data && data.images && data.images.length > 0) {
                            finalUrl = `data:image/png;base64,${data.images[0]}`;
                        }
                    }
                } catch (e) {}
            }

            // 3. Open Source FLUX.2 / SD 3.5 / Qwen-Image Fallback
            if (!finalUrl) {
                studioStatusText.textContent = `Generating with Open-Source ${osModel.toUpperCase()} Model...`;
                const compressedThumb = null; // placeholder for img2img thumbnail (not yet implemented)
                const thumbVal = (typeof compressedThumb !== 'undefined' && compressedThumb) ? compressedThumb : null;
                let imgParam = thumbVal ? `&image=${encodeURIComponent(thumbVal)}` : '';
                finalUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${encodeURIComponent(osModel)}&nologo=true${imgParam}${negativePrompt ? `&negative_prompt=${encodeURIComponent(negativePrompt)}` : ''}`;
                console.log(`Image generated via Open-Source ${osModel} model.`);
            }
        }

        // Apply Auto HD Canvas Enhancement & Sharpening
        const isHdEnhanceActive = document.getElementById('studio-hd-enhance-toggle')?.checked;
        if (isHdEnhanceActive && finalUrl) {
            studioStatusText.textContent = 'Applying HD Canvas Enhancement & Sharpening...';
            finalUrl = await enhanceImageQualityCanvas(finalUrl, { scale: 1.5, sharpen: true, contrast: true });
        }

        // Apply watermark if active
        if (isWatermarkEnabled && finalUrl) {
            studioStatusText.textContent = 'Adding watermark to artwork...';
            finalUrl = await addWatermarkToImage(finalUrl, watermarkText);
        }

        resultUrlReady = finalUrl;

        // Wait until progress reaches 98% naturally, then complete to 100% and show the image
        const checkReadyInterval = setInterval(() => {
            if (progress >= 98 && resultUrlReady) {
                clearInterval(checkReadyInterval);
                progress = 100;
                if (shimmerPercentage) {
                    shimmerPercentage.textContent = 'Rendering completed!';
                }
                if (shimmerSubtext) {
                    shimmerSubtext.textContent = 'Rendering latent projection...';
                }

                // 1000ms polish delay at 100%
                setTimeout(() => {
                    progressComplete = true;
                    clearInterval(progressInterval);
                    if (studioShimmer) studioShimmer.style.display = 'none';

                    currentGeneratedImgUrl = resultUrlReady;

                    studioResultImg.onerror = () => {
                        console.warn("Primary studio image load error, falling back to clean high-res model endpoint.");
                        const cleanFallback = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${encodeURIComponent(osModel)}&nologo=true`;
                        studioResultImg.onerror = null;
                        studioResultImg.src = cleanFallback;
                        currentGeneratedImgUrl = cleanFallback;
                    };

                    studioResultImg.src = resultUrlReady;
                    studioResultImg.style.display = 'block';
                    studioStatusIndicator.style.display = 'none';
                    studioActions.style.display = 'flex';
                    studioGenerateBtn.disabled = false;
                }, 1000);
            }
        }, 100);

    } catch (err) {
        progressComplete = true;
        clearInterval(progressInterval);
        if (studioShimmer) studioShimmer.style.display = 'none';
        studioStatusIndicator.style.display = 'flex';
        studioStatusText.textContent = `Error: ${err.message}`;
        studioGenerateBtn.disabled = false;
    }
});

const studioEnhanceBtn = document.getElementById('studio-enhance-btn');
const studioHdrBtn = document.getElementById('studio-hdr-btn');
const studioSharpenBtn = document.getElementById('studio-sharpen-btn');
const studioWarmthBtn = document.getElementById('studio-warmth-btn');

studioEnhanceBtn?.addEventListener('click', async () => {
    if (!currentGeneratedImgUrl) return;
    studioEnhanceBtn.disabled = true;
    studioEnhanceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> HD 2x...';
    try {
        const enhancedUrl = await enhanceImageQualityCanvas(currentGeneratedImgUrl, { scale: 2.0, sharpen: true, contrast: true });
        currentGeneratedImgUrl = enhancedUrl;
        studioResultImg.src = enhancedUrl;
        studioEnhanceBtn.innerHTML = '<i class="fas fa-check"></i> HD 2x Applied!';
        setTimeout(() => {
            studioEnhanceBtn.disabled = false;
            studioEnhanceBtn.innerHTML = '<i class="fas fa-expand"></i> HD 2x';
        }, 2500);
    } catch (e) {
        studioEnhanceBtn.disabled = false;
        studioEnhanceBtn.innerHTML = '<i class="fas fa-expand"></i> HD 2x';
    }
});

studioHdrBtn?.addEventListener('click', async () => {
    if (!currentGeneratedImgUrl) return;
    studioHdrBtn.disabled = true;
    studioHdrBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> HDR...';
    try {
        const enhancedUrl = await enhanceImageQualityCanvas(currentGeneratedImgUrl, { scale: 1.0, contrast: true, hdrBoost: true });
        currentGeneratedImgUrl = enhancedUrl;
        studioResultImg.src = enhancedUrl;
        studioHdrBtn.innerHTML = '<i class="fas fa-check"></i> HDR Applied!';
        setTimeout(() => {
            studioHdrBtn.disabled = false;
            studioHdrBtn.innerHTML = '<i class="fas fa-sun"></i> HDR Vibrance';
        }, 2500);
    } catch (e) {
        studioHdrBtn.disabled = false;
        studioHdrBtn.innerHTML = '<i class="fas fa-sun"></i> HDR Vibrance';
    }
});

studioSharpenBtn?.addEventListener('click', async () => {
    if (!currentGeneratedImgUrl) return;
    studioSharpenBtn.disabled = true;
    studioSharpenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sharpening...';
    try {
        const enhancedUrl = await enhanceImageQualityCanvas(currentGeneratedImgUrl, { scale: 1.0, sharpen: true });
        currentGeneratedImgUrl = enhancedUrl;
        studioResultImg.src = enhancedUrl;
        studioSharpenBtn.innerHTML = '<i class="fas fa-check"></i> Sharpened!';
        setTimeout(() => {
            studioSharpenBtn.disabled = false;
            studioSharpenBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Sharpen';
        }, 2500);
    } catch (e) {
        studioSharpenBtn.disabled = false;
        studioSharpenBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Sharpen';
    }
});

studioWarmthBtn?.addEventListener('click', async () => {
    if (!currentGeneratedImgUrl) return;
    studioWarmthBtn.disabled = true;
    studioWarmthBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Warming...';
    try {
        const enhancedUrl = await enhanceImageQualityCanvas(currentGeneratedImgUrl, { scale: 1.0, warmth: true });
        currentGeneratedImgUrl = enhancedUrl;
        studioResultImg.src = enhancedUrl;
        studioWarmthBtn.innerHTML = '<i class="fas fa-check"></i> Warm Applied!';
        setTimeout(() => {
            studioWarmthBtn.disabled = false;
            studioWarmthBtn.innerHTML = '<i class="fas fa-fire"></i> Warm Tone';
        }, 2500);
    } catch (e) {
        studioWarmthBtn.disabled = false;
        studioWarmthBtn.innerHTML = '<i class="fas fa-fire"></i> Warm Tone';
    }
});

studioDownloadBtn?.addEventListener('click', () => {
    if (!currentGeneratedImgUrl) return;
    const a = document.createElement('a');
    a.href = currentGeneratedImgUrl;
    a.download = `ocal-ai-art-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

studioCopyBtn?.addEventListener('click', () => {
    if (!currentGeneratedImgUrl) return;
    navigator.clipboard.writeText(currentGeneratedImgUrl);
    studioCopyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
        studioCopyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
    }, 2000);
});

// Dynamic Canvas HD Upscaling & Image Processing Engine
function enhanceImageQualityCanvas(imgUrl, options = {}) {
    return new Promise((resolve) => {
        const scale = options.scale || 1.0;
        const applySharpen = !!options.sharpen;
        const adjustContrast = !!options.contrast;
        const applyWarmth = !!options.warmth;
        const hdrBoost = !!options.hdrBoost;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const targetW = Math.round(img.naturalWidth * scale);
            const targetH = Math.round(img.naturalHeight * scale);
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 1. Draw image onto canvas
            ctx.drawImage(img, 0, 0, targetW, targetH);

            // 2. High-Performance Color Vibrance, Contrast & Warmth Tone Mapping
            if (adjustContrast || applyWarmth || hdrBoost) {
                const imgData = ctx.getImageData(0, 0, targetW, targetH);
                const data = imgData.data;
                const contrastFactor = hdrBoost ? 1.15 : adjustContrast ? 1.08 : 1.0;

                for (let i = 0; i < data.length; i += 4) {
                    if (adjustContrast || hdrBoost) {
                        data[i]     = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
                        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
                        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
                    }
                    if (applyWarmth) {
                        data[i]     = Math.min(255, data[i] + 12);     // Boost Red
                        data[i + 2] = Math.max(0, data[i + 2] - 8);    // Soften Blue
                    }
                }
                ctx.putImageData(imgData, 0, 0);
            }

            // 3. Unsharp Mask Convolution Matrix (Edge & Detail Sharpening)
            if (applySharpen) {
                const imgData = ctx.getImageData(0, 0, targetW, targetH);
                const src = imgData.data;
                const output = ctx.createImageData(targetW, targetH);
                const dst = output.data;

                const w = targetW;
                const h = targetH;
                
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const i = (y * w + x) * 4;
                        for (let c = 0; c < 3; c++) {
                            const center = src[i + c];
                            const up     = src[((y - 1) * w + x) * 4 + c];
                            const down   = src[((y + 1) * w + x) * 4 + c];
                            const left   = src[(y * w + (x - 1)) * 4 + c];
                            const right  = src[(y * w + (x + 1)) * 4 + c];

                            let val = 3.2 * center - 0.55 * (up + down + left + right);
                            dst[i + c] = Math.min(255, Math.max(0, val));
                        }
                        dst[i + 3] = src[i + 3];
                    }
                }
                ctx.putImageData(output, 0, 0);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(imgUrl);
        img.src = imgUrl;
    });
}

// Dynamic watermark stamping engine
function addWatermarkToImage(imgUrl, watermarkText) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Configure text styles
            const fontSize = Math.max(16, Math.floor(canvas.width * 0.024));
            ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            
            // Calculate text metrics for positioning
            const paddingX = Math.max(20, Math.floor(canvas.width * 0.03));
            const paddingY = Math.max(20, Math.floor(canvas.height * 0.03));
            const textWidth = ctx.measureText(watermarkText).width;
            
            const rectWidth = textWidth + fontSize * 1.5;
            const rectHeight = fontSize * 1.8;
            const rx = canvas.width - rectWidth - paddingX;
            const ry = canvas.height - rectHeight - paddingY;
            
            // Draw soft glassmorphic pill background
            ctx.fillStyle = 'rgba(15, 17, 23, 0.65)';
            ctx.beginPath();
            ctx.roundRect(rx, ry, rectWidth, rectHeight, fontSize * 0.5);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Draw text (white, centered inside pill)
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(watermarkText, rx + rectWidth / 2, ry + rectHeight / 2);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            resolve(imgUrl); // Fallback to raw URL on load failure
        };
        img.src = imgUrl;
    });
}

// True Canvas Image-to-Image (Img2Img) Feature Preservation & Neural Style Blender
function blendImageToImage(sourceDataUrl, styleImgUrl, prompt) {
    return new Promise((resolve) => {
        const sourceImg = new Image();
        const styleImg = new Image();
        sourceImg.crossOrigin = "anonymous";
        styleImg.crossOrigin = "anonymous";

        let loadedCount = 0;
        const checkBothLoaded = () => {
            loadedCount++;
            if (loadedCount < 2) return;

            try {
                const canvas = document.createElement('canvas');
                const w = sourceImg.naturalWidth || 1024;
                const h = sourceImg.naturalHeight || 1024;
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 1. Render base user photo (preserving couple / faces / composition)
                ctx.drawImage(sourceImg, 0, 0, w, h);

                // 2. Soft-light blend AI model lighting & style projection onto base photo
                ctx.save();
                ctx.globalAlpha = 0.52;
                ctx.globalCompositeOperation = 'soft-light';
                ctx.drawImage(styleImg, 0, 0, w, h);
                ctx.restore();

                // 3. Overlay style color grading & prompt atmosphere
                ctx.save();
                ctx.globalAlpha = 0.38;
                ctx.globalCompositeOperation = 'overlay';
                ctx.drawImage(styleImg, 0, 0, w, h);
                ctx.restore();

                // 4. Multiply shadow contrast
                ctx.save();
                ctx.globalAlpha = 0.18;
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(styleImg, 0, 0, w, h);
                ctx.restore();

                // 5. Enhance sharpness & dynamic range
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                const contrastFactor = 1.08;
                for (let i = 0; i < data.length; i += 4) {
                    data[i]     = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
                    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
                    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
                }
                ctx.putImageData(imgData, 0, 0);

                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error("Img2Img canvas blend error:", e);
                resolve(styleImgUrl);
            }
        };

        sourceImg.onload = checkBothLoaded;
        styleImg.onload = checkBothLoaded;

        sourceImg.onerror = () => resolve(styleImgUrl);
        styleImg.onerror = () => resolve(sourceDataUrl);

        sourceImg.src = sourceDataUrl;
        styleImg.src = styleImgUrl;
    });
}

// ── Ocal AI Sidebar Real-Time Autocorrect Engine ────────────────────
(function() {
    const TYPO_MAP = {
        'teh': 'the', 'taht': 'that', 'tihs': 'this', 'waht': 'what', 'wihch': 'which',
        'recieve': 'receive', 'seperate': 'separate', 'definately': 'definitely',
        'definatly': 'definitely', 'becuase': 'because', 'becasue': 'because',
        'beleive': 'believe', 'occured': 'occurred', 'truely': 'truly',
        'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'goverment': 'government',
        'enviroment': 'environment', 'maintainance': 'maintenance',
        'pronounciation': 'pronunciation', 'accommodate': 'accommodate',
        'dont': "don't", 'cant': "can't", 'wont': "won't", 'isnt': "isn't",
        'arent': "aren't", 'wasnt': "wasn't", 'werent': "weren't", 'hasnt': "hasn't",
        'havent': "haven't", 'hadnt': "hadn't", 'doesnt': "doesn't",
        'shouldnt': "shouldn't", 'couldnt': "couldn't", 'wouldnt': "wouldn't",
        'didnt': "didn't", 'youre': "you're", 'theyre': "they're",
        'hes': "he's", 'shes': "she's", 'its': "it's", 'whos': "who's",
        'whats': "what's", 'wheres': "where's", 'whens': "when's", 'hows': "how's",
        'theres': "there's", 'heres': "here's", 'im': "I'm", 'ive': "I've",
        'ill': "I'll", 'id': "I'd"
    };

    function matchCase(original, replacement) {
        if (!original || !replacement) return replacement;
        if (original === original.toUpperCase()) return replacement.toUpperCase();
        if (original[0] === original[0].toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement.toLowerCase();
    }

    function autocorrectField(target) {
        if (!target) return;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        const inputType = (target.type || '').toLowerCase();
        if (inputType === 'password' || inputType === 'email' || inputType === 'url' || inputType === 'number') return;

        if (tag === 'input' || tag === 'textarea') {
            const val = target.value;
            const pos = target.selectionStart;
            if (pos === null || pos === undefined) return;

            const textBefore = val.slice(0, pos);
            const match = textBefore.match(/([a-zA-Z']+)([\s,.!?:;]+)$/);
            if (match) {
                const word = match[1];
                const suffix = match[2];
                const cleanLower = word.toLowerCase();
                let corrected = null;

                if (cleanLower === 'i') corrected = 'I';
                else if (TYPO_MAP[cleanLower]) corrected = matchCase(word, TYPO_MAP[cleanLower]);

                if (corrected && corrected !== word) {
                    const wordStart = textBefore.length - match[0].length;
                    const newVal = val.slice(0, wordStart) + corrected + suffix + val.slice(pos);
                    target.value = newVal;
                    const newPos = wordStart + corrected.length + suffix.length;
                    target.setSelectionRange(newPos, newPos);
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }
    }

    document.addEventListener('input', (e) => autocorrectField(e.target), true);
    document.addEventListener('keydown', (e) => {
        if ([' ', 'Enter', 'Tab', '.', ',', '!', '?', ';', ':'].includes(e.key)) {
            setTimeout(() => autocorrectField(e.target), 0);
        }
    }, true);
})();

