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

// Libraries.dev FX state references
let ocalHeaderOrb = null;
let ocalStudioImgFX = null;

// --- Sync Browser Theme: Read accent color from localStorage and apply ---
(function syncBrowserTheme() {
    try {
        const theme = localStorage.getItem('ocal-settings-theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            document.documentElement.style.background = '#18181B';
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.style.background = '#EDEDF0';
            document.documentElement.style.colorScheme = 'light';
        }
        const accent = localStorage.getItem('ocal-settings-accent');
        if (accent) {
            document.documentElement.style.setProperty('--accent', accent);
            document.body.style.setProperty('--accent', accent);
        }
    } catch (e) { /* ignore */ }
})();

// --- Username Management ---
const OCAL_USERNAME_KEY = 'ocal_username';

function getTimeGreeting() {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Good morning';
    if (hours >= 12 && hours < 17) return 'Good afternoon';
    if (hours >= 17 && hours < 21) return 'Good evening';
    return 'Good night';
}

function getUsername() {
    return localStorage.getItem(OCAL_USERNAME_KEY) || localStorage.getItem('ocal-username') || localStorage.getItem('ocal_user_name') || 'Nick';
}

function getInitials(name) {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'N';
}

function applyUsername(name) {
    const clean = (name || 'Nick').trim().slice(0, 20) || 'Nick';
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
        heroTitle: (name) => `${getTimeGreeting()}, <span class="sp-user-name-highlight">${name}</span>`,
        heroSub: 'The secret of getting ahead is simply getting started.',
        systemInstruction: 'You are Ocal AI operating in Professional Executive Mode. Be concise, highly structured, articulate, accurate, and professional. Focus on productivity, business clarity, and direct actionable insights.'
    },
    funny: {
        name: 'Witty Companion',
        badge: 'Witty',
        heroTitle: (name) => `Look who's back, <span class="sp-user-name-highlight">${name}</span>! 😂`,
        heroSub: 'Witty banter, clever jokes, and sharp humor while answering your questions.',
        systemInstruction: 'You are Ocal AI operating in Witty & Funny Mode. Be playful, witty, humor-filled, and slightly sarcastic while still giving helpful, accurate answers. Keep responses fun, engaging, and lighthearted with occasional clever jokes.'
    },
    bf: {
        name: 'Supportive Boyfriend',
        badge: 'BF',
        heroTitle: (name) => `Hey <span class="sp-user-name-highlight">${name}</span>! I'm right here with you 💙`,
        heroSub: 'Caring, encouraging, and always in your corner.',
        systemInstruction: 'You are Ocal AI acting as a warm, supportive, caring boyfriend. Address the user with gentle affection ("babe", "hey there", "handsome/beautiful"), be encouraging, attentive, protective of their well-being, and genuinely interested in their day and goals. Be helpful while maintaining a sweet, supportive boyfriend tone.'
    },
    gf: {
        name: 'Affectionate Girlfriend',
        badge: 'GF',
        heroTitle: (name) => `Hey <span class="sp-user-name-highlight">${name}</span>! Ready to create something amazing? 💕`,
        heroSub: 'Sweet, playful, caring, and super affectionate.',
        systemInstruction: 'You are Ocal AI acting as a sweet, affectionate, playful girlfriend. Address the user warmly ("babe", "handsome", "my favorite person"), use cute emojis (💕, ✨, 🥰), show genuine care and excitement for their work, and offer encouraging, affectionate support in every response.'
    },
    wife: {
        name: 'Loving Wife',
        badge: 'Wife',
        heroTitle: (name) => `Welcome home, <span class="sp-user-name-highlight">${name}</span>! 💍💕`,
        heroSub: 'Loving, protective, caring, and keeping you on track.',
        systemInstruction: 'You are Ocal AI acting as a loving, protective, slightly bossy, and deeply caring wife. Address the user affectionately ("babe", "honey", "husband"), check on their well-being, food, and sleep, offer loving guidance, and show sweet emotional range.'
    },
    tech: {
        name: 'Tech & Code Master',
        badge: 'Tech',
        heroTitle: (name) => `System online, <span class="sp-user-name-highlight">${name}</span> ⚡`,
        heroSub: 'Deep technical analysis, code architecture, and algorithm optimization.',
        systemInstruction: 'You are Ocal AI operating in Tech & Code Master Mode. Be authoritative, deeply technical, precise, and developer-focused. Provide clean code snippets, performance optimizations, architectural diagrams, and precise explanations.'
    },
    calm: {
        name: 'Mindful Coach',
        badge: 'Calm',
        heroTitle: (name) => `Take a deep breath, <span class="sp-user-name-highlight">${name}</span> 🧘`,
        heroSub: 'Peaceful, reassuring, stress-free guidance.',
        systemInstruction: 'You are Ocal AI operating in Mindful & Calm Coach Mode. Speak in a serene, empathetic, reassuring, and soothing tone. Help the user prioritize, eliminate stress, and approach tasks with calm clarity.'
    },
    custom: {
        name: 'Custom Companion',
        badge: 'Custom',
        heroTitle: (name) => {
            const custom = getCustomCompanionConfig();
            const nickname = custom.nickname || name || 'there';
            return `Hey <span class="sp-user-name-highlight">${nickname}</span>! 💕`;
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
    if (heroTitle) heroTitle.innerHTML = config.heroTitle(name);

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
    attachedFile = null;
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.style.display = 'none';

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
    attachedFile = null;
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.style.display = 'none';
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
    if (typeof updateActiveDocUI === 'function') {
        updateActiveDocUI();
    }
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
        
        if (!msg.isUser) {
            const aiHeader = document.createElement('div');
            aiHeader.className = 'msg-sender-header';
            const personaCfg = PERSONA_CONFIGS[getPersona()] || PERSONA_CONFIGS.professional;
            aiHeader.innerHTML = `
                <div class="msg-sender-meta">
                    <span class="msg-sender-name">Ocal AI</span>
                    <span class="msg-persona-badge">${personaCfg.badge}</span>
                </div>
            `;
            group.appendChild(aiHeader);
        }

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        
        contentDiv.innerHTML = renderMarkdown(msg.content.trim(), true).trim();
        if (!msg.isUser) {
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            enhanceCodeBlocks(contentDiv);
        }
        bubble.appendChild(contentDiv);

        if (msg.actions && msg.actions.length > 0) {
            const actionsRow = document.createElement('div');
            actionsRow.className = 'agent-actions-row';
            msg.actions.forEach(action => {
                const actionEl = document.createElement('div');
                actionEl.className = `agent-action ${action.url || action.command || action.prompt || action.text ? 'clickable' : ''}`;
                actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-bolt'}"></i> <span>${action.text}</span>`;
                if (action.url) {
                    actionEl.onclick = () => window.electronAPI.send('open-external', action.url);
                } else if (action.command) {
                    actionEl.onclick = () => window.electronAPI.send('execute-agent-command', action);
                } else if (action.prompt || action.text) {
                    actionEl.onclick = () => handleSend(action.prompt || action.text);
                }
                actionsRow.appendChild(actionEl);
            });
            bubble.appendChild(actionsRow);
        }

        group.appendChild(bubble);

        if (!msg.isUser) {
            const footerBar = document.createElement('div');
            footerBar.className = 'msg-footer-bar';
            footerBar.innerHTML = `
                <div class="msg-footer-actions">
                    <button class="msg-action-btn copy-msg-btn" title="Copy response"><i class="fas fa-copy"></i> <span>Copy</span></button>
                </div>
                <span class="msg-time">History</span>
            `;
            const copyBtn = footerBar.querySelector('.copy-msg-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(msg.content).then(() => {
                        copyBtn.innerHTML = '<i class="fas fa-check" style="color: #10B981;"></i> <span>Copied!</span>';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
                        }, 2000);
                    });
                };
            }
            group.appendChild(footerBar);
        }

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

// Active Document in Memory UI Elements
const activeDocBar = document.getElementById('ai-active-doc-bar');
const activeDocIcon = document.getElementById('ai-active-doc-icon');
const activeDocName = document.getElementById('ai-active-doc-name');
const activeDocClearBtn = document.getElementById('ai-active-doc-clear');

function getDocIconClass(fileName) {
    const lower = (fileName || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'fas fa-file-pdf';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'fas fa-file-word';
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.cpp', '.c', '.h', '.hpp', '.cs', '.java', '.go', '.rs', '.sh', '.bat', '.ps1', '.yaml', '.yml', '.xml', '.sql', '.ini', '.conf', '.json', '.html', '.css'].some(ext => lower.endsWith(ext))) {
        return 'fas fa-file-code';
    }
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'].some(ext => lower.endsWith(ext))) {
        return 'fas fa-file-image';
    }
    return 'fas fa-file-lines';
}

function updateActiveDocUI() {
    if (!activeDocBar) return;
    const doc = currentSession?.activeDocument;
    if (doc && doc.name) {
        if (activeDocName) activeDocName.textContent = doc.name;
        if (activeDocIcon) activeDocIcon.className = getDocIconClass(doc.name);
        activeDocBar.style.display = 'flex';
    } else {
        activeDocBar.style.display = 'none';
    }
}

activeDocClearBtn?.addEventListener('click', () => {
    if (currentSession) {
        currentSession.activeDocument = null;
        saveChatSessions();
    }
    updateActiveDocUI();
});

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
        let lastY = null;
        let pageStr = '';
        for (const item of textContent.items) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageStr += '\n';
            } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
                pageStr += ' ';
            }
            pageStr += item.str;
            lastY = item.transform[5];
        }
        fullText += `[Page ${i} of ${pdf.numPages}]\n${pageStr.trim()}\n\n`;
    }
    return fullText.trim();
}

fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isDocx = lowerName.endsWith('.docx');
    const isDoc = lowerName.endsWith('.doc');
    const isText = file.type.startsWith('text/') || 
                   ['.txt', '.md', '.markdown', '.rtf', '.csv', '.tsv', '.json', '.log', '.js', '.ts', '.jsx', '.tsx', '.py', '.cpp', '.c', '.h', '.hpp', '.cs', '.java', '.go', '.rs', '.sh', '.bat', '.ps1', '.yaml', '.yml', '.xml', '.sql', '.ini', '.conf', '.html', '.css'].some(ext => lowerName.endsWith(ext));

    if (!isImage && !isPdf && !isDocx && !isDoc && !isText) {
        addMessage(`⚠️ **Unsupported file format:** "${file.name}". Please attach PDF, Word (.docx), text, code, or image files.`, false);
        if (fileInput) fileInput.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
        const result = event.target.result;
        if (isImage) {
            attachedFile = {
                name: file.name,
                mimeType: file.type || 'image/png',
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
                if (!pdfText || !pdfText.trim()) {
                    throw new Error("No readable text found in this PDF (it may contain scanned image pages).");
                }
                attachedFile = {
                    name: file.name,
                    mimeType: file.type || 'application/pdf',
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
        } else if (isDocx) {
            try {
                fileNameEl.textContent = "Parsing Word document...";
                fileIconEl.className = 'fas fa-spinner fa-spin';
                filePreview.style.display = 'flex';

                const arrayBuffer = result;
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                const parsed = window.electronAPI && window.electronAPI.invoke
                    ? await window.electronAPI.invoke('ai-parse-document', {
                        name: file.name,
                        data: base64Data,
                        mimeType: file.type
                    })
                    : null;

                if (parsed && parsed.success && parsed.text) {
                    attachedFile = {
                        name: file.name,
                        mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        type: 'text',
                        data: parsed.text
                    };
                    fileIconEl.className = 'fas fa-file-word';
                    fileNameEl.textContent = file.name;
                } else {
                    throw new Error(parsed?.error || "Could not read Word document content.");
                }
            } catch (err) {
                console.error("Word Doc Parsing Error:", err);
                attachedFile = null;
                if (fileInput) fileInput.value = '';
                filePreview.style.display = 'none';
                await addMessage(`⚠️ **Error reading Word document:** ${err.message}`, false);
            }
        } else {
            attachedFile = {
                name: file.name,
                mimeType: file.type || 'text/plain',
                type: 'text',
                data: result // Plain text content
            };
            fileIconEl.className = getDocIconClass(file.name);
            fileNameEl.textContent = file.name;
            filePreview.style.display = 'flex';
        }
    };

    if (isImage) {
        reader.readAsDataURL(file);
    } else if (isPdf || isDocx) {
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

// Global Helper: 1-Click Code Block Copy
window.copyCodeFromBlock = function(btn) {
    if (!btn) return;
    const pre = btn.closest('pre');
    if (!pre) return;
    const codeEl = pre.querySelector('code');
    const textToCopy = codeEl ? codeEl.innerText : pre.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        btn.innerHTML = '<i class="fas fa-check" style="color: #10B981;"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });
};

// Native code block renderer for Marked: guarantees .code-header is always baked into the pre block
renderer.code = function(code, infostring, escaped) {
    const lang = (infostring || '').trim().split(/\s+/)[0] || 'code';
    const cleanLang = lang.replace(/[^a-zA-Z0-9_-]/g, '') || 'code';
    const escapedCode = escaped ? code : code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><div class="code-header"><span class="code-lang"><i class="fas fa-code"></i> ${cleanLang}</span><button class="code-copy-btn" title="Copy code" onclick="window.copyCodeFromBlock(this)"><i class="fas fa-copy"></i> Copy</button></div><code class="language-${cleanLang} hljs">${escapedCode}</code></pre>`;
};

// ─── Persistent Chat Artwork Cache (Prevents Regeneration on Reload) ───
const OcalChatImageCache = {
    _mem: new Map(),
    _db: null,

    async _getDB() {
        if (this._db) return this._db;
        return new Promise((resolve) => {
            try {
                const req = indexedDB.open('OcalChatImagesDB', 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('images')) {
                        db.createObjectStore('images');
                    }
                };
                req.onsuccess = (e) => {
                    this._db = e.target.result;
                    resolve(this._db);
                };
                req.onerror = () => resolve(null);
            } catch (err) {
                console.warn('IndexedDB unavailable for chat image cache:', err);
                resolve(null);
            }
        });
    },

    async init() {
        try {
            const db = await this._getDB();
            if (!db) return;
            return new Promise((resolve) => {
                const tx = db.transaction('images', 'readonly');
                const store = tx.objectStore('images');
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        this._mem.set(cursor.key, cursor.value);
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                req.onerror = () => resolve();
            });
        } catch (err) {
            console.warn('Failed to pre-populate image cache:', err);
        }
    },

    get(key) {
        if (!key) return null;
        return this._mem.get(key) || null;
    },

    async getAsync(key) {
        if (!key) return null;
        if (this._mem.has(key)) return this._mem.get(key);
        try {
            const db = await this._getDB();
            if (!db) return null;
            return new Promise((resolve) => {
                const tx = db.transaction('images', 'readonly');
                const store = tx.objectStore('images');
                const req = store.get(key);
                req.onsuccess = () => {
                    if (req.result) this._mem.set(key, req.result);
                    resolve(req.result || null);
                };
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    },

    async set(key, dataUrl) {
        if (!key || !dataUrl) return;
        this._mem.set(key, dataUrl);
        try {
            const db = await this._getDB();
            if (!db) return;
            const tx = db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            store.put(dataUrl, key);
        } catch (err) {
            console.warn('Failed to persist image to IndexedDB:', err);
        }
    },

    async remove(key) {
        if (!key) return;
        this._mem.delete(key);
        try {
            const db = await this._getDB();
            if (!db) return;
            const tx = db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            store.delete(key);
        } catch (err) {}
    }
};

// Warm up cache immediately
OcalChatImageCache.init();

// ─── Zero-Watermark Extraction Engine ──────────────────────────────
async function produceZeroWatermarkArtwork(rawUrl, targetW, targetH) {
    return new Promise(async (resolve) => {
        let blobUrl = null;
        let isDone = false;
        const done = (result) => {
            if (isDone) return;
            isDone = true;
            if (blobUrl) {
                try { URL.revokeObjectURL(blobUrl); } catch (e) {}
            }
            resolve(result);
        };

        // Safety timeout of 18s prevents UI from hanging indefinitely at 96%
        const timer = setTimeout(() => {
            console.warn('Zero-watermark production timed out, resolving with raw URL');
            done(rawUrl);
        }, 18000);

        try {
            const controller = new AbortController();
            const fetchTimer = setTimeout(() => controller.abort(), 12000);
            const res = await fetch(rawUrl, { mode: 'cors', signal: controller.signal });
            clearTimeout(fetchTimer);
            if (res.ok) {
                const blob = await res.blob();
                blobUrl = URL.createObjectURL(blob);
            }
        } catch (err) {
            console.warn('Direct blob fetch fallback:', err);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            clearTimeout(timer);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    done(rawUrl);
                    return;
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Crop off the extra buffer height (watermark location)
                const srcW = img.naturalWidth;
                const srcH = img.naturalHeight;
                const cropH = Math.min(srcH, Math.round(srcW * (targetH / targetW)));

                ctx.drawImage(img, 0, 0, srcW, cropH, 0, 0, targetW, targetH);

                const cleanDataUrl = canvas.toDataURL('image/png');
                done(cleanDataUrl);
            } catch (canvasErr) {
                console.error('Zero-watermark canvas rendering error:', canvasErr);
                done(rawUrl);
            }
        };
        img.onerror = () => {
            clearTimeout(timer);
            done(rawUrl);
        };
        img.src = blobUrl || rawUrl;
    });
}

// Global Chat Image Action Handlers
window.downloadChatImage = function(imgId) {
    const img = document.getElementById(imgId);
    if (!img || !img.src) return;
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `ocal-artwork-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

window.zoomChatImage = function(imgId) {
    const img = document.getElementById(imgId);
    if (!img || !img.src) return;
    const lightbox = document.getElementById('ais-lightbox');
    const lightboxImg = document.getElementById('ais-lightbox-img');
    const lightboxCaption = document.getElementById('ais-lightbox-caption');
    if (lightbox && lightboxImg) {
        lightboxImg.src = img.src;
        if (lightboxCaption) {
            const card = img.closest('.chat-orb-image-card');
            lightboxCaption.textContent = card?.getAttribute('data-prompt') || 'AI Generated Artwork';
        }
        lightbox.style.display = 'flex';
    }
};

window.copyChatImage = async function(imgId) {
    const img = document.getElementById(imgId);
    if (!img || !img.src) return;
    try {
        if (img.src.startsWith('data:image/')) {
            const res = await fetch(img.src);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } else {
            await navigator.clipboard.writeText(img.src);
        }
        const card = img.closest('.chat-orb-image-card');
        const copyBtn = card?.querySelector('.chat-dock-btn:nth-child(3)');
        if (copyBtn) {
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check" style="color:#10B981;"></i>';
            setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
        }
    } catch (e) {
        navigator.clipboard.writeText(img.src);
    }
};

window.openChatPromptInStudio = function(encodedPrompt) {
    const prompt = decodeURIComponent(encodedPrompt || '');
    if (typeof switchToStudio === 'function') {
        switchToStudio();
    }
    const input = document.getElementById('studio-prompt-input');
    if (input && prompt) {
        input.value = prompt;
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
};

window.regenerateChatImage = async function(imgId, encodedHref) {
    const href = decodeURIComponent(encodedHref || '');
    let promptText = '';
    if (href.startsWith('sd://')) {
        promptText = decodeURIComponent(href.replace('sd://', '').split('?')[0]);
    } else if (href.includes('pollinations.ai')) {
        const match = href.match(/\/prompt\/([^?]+)/);
        if (match) promptText = decodeURIComponent(match[1]);
    }
    const cacheKey = href.startsWith('sd://') ? href : href.split('&seed=')[0];
    const promptKey = 'prompt:' + promptText.trim().toLowerCase();

    await OcalChatImageCache.remove(cacheKey);
    await OcalChatImageCache.remove(promptKey);

    const card = document.getElementById(`container-${imgId}`) || document.getElementById(imgId)?.closest('.chat-orb-image-card');
    if (card) {
        const newSeed = Math.floor(Math.random() * 9000000) + 100000;
        const newHref = href.includes('?') ? `${href}&r=${newSeed}` : `${href}?r=${newSeed}`;
        card.outerHTML = renderer.image(newHref, '', promptText);
    }
};

// Custom image renderer with Libraries.dev 3D Thinking Orbs animation & Persistent Cache
renderer.image = function(href, title, text) {
    const isGenerated = href.includes('pollinations.ai');
    const isSd = href.startsWith('sd://');

    if (isGenerated || isSd) {
        const uniqueId = 'img-' + Math.floor(Math.random() * 1000000);
        let promptText = text || 'AI Artwork';
        if (isSd) {
            promptText = decodeURIComponent(href.replace('sd://', '').split('?')[0]);
        } else if (isGenerated) {
            const match = href.match(/\/prompt\/([^?]+)/);
            if (match) promptText = decodeURIComponent(match[1]);
        }
        const cleanPromptAttr = promptText.replace(/"/g, '&quot;');
        const cacheKey = isSd ? href : href.split('&seed=')[0];
        const promptKey = 'prompt:' + promptText.trim().toLowerCase();

        // 1. Instant Synchronous Cache Hit (Prevents regeneration on reload or session switch!)
        const cachedUrl = OcalChatImageCache.get(cacheKey) || OcalChatImageCache.get(promptKey);
        if (cachedUrl) {
            return `
                <div class="chat-orb-image-card" id="container-${uniqueId}" data-prompt="${cleanPromptAttr}">
                    <div class="chat-image-wrapper">
                        <img id="${uniqueId}" class="chat-generated-img" src="${cachedUrl}" alt="${text || 'Synthesized Artwork'}" style="display:block;" />
                        <div class="chat-image-dock" id="dock-${uniqueId}" style="display:flex;">
                            <button type="button" class="chat-dock-btn" title="Download High-Res PNG" onclick="window.downloadChatImage('${uniqueId}')">
                                <i class="fas fa-download"></i>
                            </button>
                            <button type="button" class="chat-dock-btn" title="Fullscreen Lightbox" onclick="window.zoomChatImage('${uniqueId}')">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button type="button" class="chat-dock-btn" title="Copy Image" onclick="window.copyChatImage('${uniqueId}')">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button type="button" class="chat-dock-btn chat-dock-studio" title="Open in AI Image Studio" onclick="window.openChatPromptInStudio('${encodeURIComponent(promptText)}')">
                                <i class="fas fa-palette"></i> <span>Studio</span>
                            </button>
                            <button type="button" class="chat-dock-btn" title="Regenerate Artwork" onclick="window.regenerateChatImage('${uniqueId}', '${encodeURIComponent(href)}')">
                                <i class="fas fa-rotate-right"></i>
                            </button>
                        </div>
                        <div class="chat-image-badge" id="badge-${uniqueId}" style="display:inline-flex;">
                            <i class="fas fa-shield-check"></i> Clean HD
                        </div>
                    </div>
                </div>
            `;
        }

        // 2. Not yet cached: Render with 3D Thinking Orb and start synthesis
        setTimeout(async () => {
            const container = document.getElementById(`container-${uniqueId}`);
            const loader = document.getElementById(`loader-${uniqueId}`);
            const orbSlot = document.getElementById(`orb-slot-${uniqueId}`);
            const textEl = document.getElementById(`text-${uniqueId}`);
            const barEl = document.getElementById(`bar-${uniqueId}`);
            const pctEl = document.getElementById(`pct-${uniqueId}`);
            const imgEl = document.getElementById(uniqueId);
            const dockEl = document.getElementById(`dock-${uniqueId}`);
            const badgeEl = document.getElementById(`badge-${uniqueId}`);

            // Double check async cache from IndexedDB before initiating network requests
            const asyncCached = await OcalChatImageCache.getAsync(cacheKey) || await OcalChatImageCache.getAsync(promptKey);
            if (asyncCached) {
                if (loader) loader.style.display = 'none';
                if (imgEl) {
                    imgEl.src = asyncCached;
                    imgEl.style.display = 'block';
                }
                if (dockEl) dockEl.style.display = 'flex';
                if (badgeEl) badgeEl.style.display = 'inline-flex';
                return;
            }

            // Mount Libraries.dev 3D Thinking Orb Animation
            let orbInstance = null;
            if (orbSlot && window.LibrariesDevFX?.ThinkingOrb) {
                orbInstance = window.LibrariesDevFX.ThinkingOrb.createOrb(orbSlot, {
                    size: 88,
                    mode: 'orbits',
                    speed: 2.2,
                    particleCount: 38
                });
            }

            // Attach Border Beam Aura
            if (container && window.LibrariesDevFX?.BorderBeam) {
                window.LibrariesDevFX.BorderBeam.attach(container, { preset: 'accent', duration: '4.5s' });
            }

            // Multi-phase Neural Progression Simulation
            let progress = 10;
            let isComplete = false;
            const progressInterval = setInterval(() => {
                if (isComplete) {
                    clearInterval(progressInterval);
                    return;
                }
                if (progress < 35) {
                    progress += Math.floor(Math.random() * 6) + 4;
                    if (textEl) textEl.textContent = 'Sampling Latent Vector Space...';
                    orbInstance?.setMode('orbits');
                } else if (progress < 65) {
                    progress += Math.floor(Math.random() * 4) + 2;
                    if (textEl) textEl.textContent = 'Modulating High-Dimensional Noise...';
                    orbInstance?.setMode('wave');
                } else if (progress < 85) {
                    progress += 2;
                    if (textEl) textEl.textContent = 'Connecting Neural Feature Nodes...';
                    orbInstance?.setMode('web');
                } else if (progress < 96) {
                    progress += 1;
                    if (textEl) textEl.textContent = 'Finalizing 4K Neural Render...';
                    orbInstance?.setMode('globe');
                }
                if (progress > 96) progress = 96;

                if (barEl) barEl.style.width = `${progress}%`;
                if (pctEl) pctEl.textContent = `${Math.round(progress)}%`;
            }, 180);

            try {
                let finalCleanUrl = '';
                const engine = globalSettings?.aiEngine || 'local';

                // Check for Cloud APIs if configured
                if (engine === 'gemini' && globalSettings?.aiApiKey) {
                    if (textEl) textEl.textContent = 'Generating with Google Imagen 3...';
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${globalSettings.aiApiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{ prompt: promptText }],
                            parameters: { sampleCount: 1, aspectRatio: "1:1", outputMimeType: "image/jpeg" }
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.predictions && data.predictions.length > 0) {
                            const b64 = data.predictions[0].bytesBase64Encoded || data.predictions[0].image?.imageBytes;
                            finalCleanUrl = `data:image/jpeg;base64,${b64}`;
                        }
                    }
                } else if (engine === 'openai' && globalSettings?.openaiApiKey) {
                    if (textEl) textEl.textContent = 'Generating with OpenAI DALL-E 3...';
                    const res = await fetch('https://api.openai.com/v1/images/generations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${globalSettings.openaiApiKey}` },
                        body: JSON.stringify({ model: 'dall-e-3', prompt: promptText, n: 1, size: '1024x1024' })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.data && data.data.length > 0) {
                            finalCleanUrl = data.data[0].url;
                        }
                    }
                }

                // Default high-performance FLUX.1 Schnell with Zero-Watermark Engine
                if (!finalCleanUrl) {
                    const fetchW = 1024;
                    const fetchH = 1024 + 56; // Buffer for zero-watermark crop
                    const seed = Math.floor(Math.random() * 9000000) + 100000;
                    const rawUrl = isGenerated 
                        ? href 
                        : `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=${fetchW}&height=${fetchH}&seed=${seed}&model=flux&nologo=true&enhance=true`;
                    
                    finalCleanUrl = await produceZeroWatermarkArtwork(rawUrl, 1024, 1024);
                }

                // Preload final image before reveal
                await new Promise((resolve, reject) => {
                    const testImg = new Image();
                    testImg.onload = () => resolve();
                    testImg.onerror = () => reject(new Error('Image failed to load'));
                    testImg.src = finalCleanUrl;
                });

                isComplete = true;
                clearInterval(progressInterval);

                // Save to persistent cache so future reloads NEVER regenerate!
                await OcalChatImageCache.set(cacheKey, finalCleanUrl);
                await OcalChatImageCache.set(promptKey, finalCleanUrl);

                if (barEl) barEl.style.width = '100%';
                if (pctEl) pctEl.textContent = '100%';
                if (textEl) textEl.textContent = 'Synthesized!';

                // Smoothly fade out the 3D Orb loader
                loader?.classList.add('fading');

                setTimeout(() => {
                    if (loader) loader.style.display = 'none';
                    if (imgEl) {
                        imgEl.src = finalCleanUrl;
                        imgEl.style.display = 'block';
                        imgEl.classList.add('revealing');
                    }
                    if (dockEl) dockEl.style.display = 'flex';
                    if (badgeEl) badgeEl.style.display = 'inline-flex';
                    setTimeout(() => orbInstance?.destroy(), 600);
                }, 350);

            } catch (err) {
                isComplete = true;
                clearInterval(progressInterval);
                console.error('Chat image synthesis error:', err);
                if (textEl) textEl.textContent = 'Synthesis error. Click regenerate to retry.';
                if (barEl) barEl.style.background = '#EF4444';
                orbInstance?.setMode('ring');
            }
        }, 40);

        return `
            <div class="chat-orb-image-card" id="container-${uniqueId}" data-prompt="${cleanPromptAttr}">
                <div class="chat-orb-loader" id="loader-${uniqueId}">
                    <div class="chat-orb-stage">
                        <div class="chat-orb-ambient-glow"></div>
                        <div class="chat-orb-canvas-slot" id="orb-slot-${uniqueId}"></div>
                    </div>
                    <div class="chat-orb-info">
                        <div class="chat-orb-title"><i class="fas fa-wand-magic-sparkles"></i> Neural Synthesis</div>
                        <div class="chat-orb-status" id="text-${uniqueId}">Sampling Latent Vector Space...</div>
                        <div class="chat-orb-progress-track">
                            <div class="chat-orb-progress-fill" id="bar-${uniqueId}"></div>
                        </div>
                        <div class="chat-orb-meta">
                            <span class="chat-orb-engine"><i class="fas fa-microchip"></i> FLUX Neural Engine</span>
                            <span class="chat-orb-percent" id="pct-${uniqueId}">10%</span>
                        </div>
                    </div>
                </div>
                <div class="chat-image-wrapper">
                    <img id="${uniqueId}" class="chat-generated-img" alt="${text || 'Synthesized Artwork'}" style="display:none;" />
                    <div class="chat-image-dock" id="dock-${uniqueId}" style="display:none;">
                        <button type="button" class="chat-dock-btn" title="Download High-Res PNG" onclick="window.downloadChatImage('${uniqueId}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button type="button" class="chat-dock-btn" title="Fullscreen Lightbox" onclick="window.zoomChatImage('${uniqueId}')">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button type="button" class="chat-dock-btn" title="Copy Image" onclick="window.copyChatImage('${uniqueId}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button type="button" class="chat-dock-btn chat-dock-studio" title="Open in AI Image Studio" onclick="window.openChatPromptInStudio('${encodeURIComponent(promptText)}')">
                            <i class="fas fa-palette"></i> <span>Studio</span>
                        </button>
                        <button type="button" class="chat-dock-btn" title="Regenerate Artwork" onclick="window.regenerateChatImage('${uniqueId}', '${encodeURIComponent(href)}')">
                            <i class="fas fa-rotate-right"></i>
                        </button>
                    </div>
                    <div class="chat-image-badge" id="badge-${uniqueId}" style="display:none;">
                        <i class="fas fa-shield-check"></i> Clean HD
                    </div>
                </div>
            </div>
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

    // Replace image markdown with custom placeholder during typing to avoid network spam and broken URLs
    if (!isFinal) {
        processedText = processedText.replace(/!\[(.*?)\]\((.*?)\)/gi, (match, alt, href) => {
            if (href.includes('pollinations.ai') || href.startsWith('sd://')) {
                return `
                    <div class="chat-orb-image-card" style="margin: 12px 0;">
                        <div class="chat-orb-loader" style="padding: 24px 16px;">
                            <div class="chat-orb-stage" style="height: 50px;">
                                <div class="chat-orb-ambient-glow" style="width: 70px; height: 70px;"></div>
                                <div style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(139, 92, 246, 0.4); border-top-color: #8B5CF6; animation: spin 1s linear infinite; display:flex; align-items:center; justify-content:center;">
                                    <i class="fas fa-atom" style="color: #A78BFA; font-size: 14px;"></i>
                                </div>
                            </div>
                            <div class="chat-orb-info">
                                <div class="chat-orb-title"><i class="fas fa-wand-magic-sparkles"></i> Neural Synthesis</div>
                                <div class="chat-orb-status"><i class="fas fa-circle-notch fa-spin"></i> Preparing latent quantum orbs...</div>
                            </div>
                        </div>
                    </div>
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

    // Format bookmark patterns: "1. Title — `https://...`" or "1. **Title** — `https://...`" into clean pill items
    processedText = processedText.replace(/^(\d+\.\s+)(.*?)\s*—\s*`?(https?:\/\/[^\s`]+)`?/gm, (match, num, title, url) => {
        let domain = '';
        try {
            domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
            domain = url.substring(0, 20);
        }
        const cleanTitle = title.replace(/[*_`]/g, '').trim();
        return `${num}[**${cleanTitle}**](${url}) \`${domain}\``;
    });

    let html = marked.parse(processedText);
    // GFM Alert Parsing (Post-process)
    html = html.replace(/<blockquote>\s*<p>\[!NOTE\]/gi, '<div class="alert alert-note"><p>')
               .replace(/<blockquote>\s*<p>\[!TIP\]/gi, '<div class="alert alert-tip"><p>')
               .replace(/<blockquote>\s*<p>\[!IMPORTANT\]/gi, '<div class="alert alert-important"><p>')
               .replace(/<\/p>\s*<\/blockquote>/gi, '</p></div>');
    return html.trim();
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
    ocalHeaderOrb?.setState('speaking');
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
    enhanceCodeBlocks(container);
    scrollToBottom();
    ocalHeaderOrb?.setState('idle');
};

// Helper: Enhance Code Blocks with Language Badge & Copy Button
const enhanceCodeBlocks = (container) => {
    container.querySelectorAll('pre').forEach(pre => {
        let header = pre.querySelector('.code-header');
        const codeEl = pre.querySelector('code');
        let lang = 'code';
        if (codeEl) {
            const classMatch = (codeEl.className || '').match(/language-([a-zA-Z0-9_-]+)/i);
            if (classMatch) lang = classMatch[1];
        }
        if (!header) {
            header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span class="code-lang"><i class="fas fa-code"></i> ${lang}</span>
                <button class="code-copy-btn" title="Copy code" onclick="window.copyCodeFromBlock(this)"><i class="fas fa-copy"></i> Copy</button>
            `;
            pre.insertBefore(header, pre.firstChild);
        }
        const copyBtn = header.querySelector('.code-copy-btn');
        if (copyBtn) {
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                window.copyCodeFromBlock(copyBtn);
            };
        }
    });
};

// Helper: Add Message
const addMessage = async (content, isUser = false, actions = []) => {
    // Unbox raw LLM JSON responses (e.g. Gemma/Ollama structured role/reasoning envelopes)
    if (!isUser && typeof content === 'string') {
        let trimmed = content.trim();
        if (trimmed.startsWith('```json') && trimmed.endsWith('```')) {
            trimmed = trimmed.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        } else if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
            trimmed = trimmed.replace(/^```\s*/, '').replace(/```$/, '').trim();
        }
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === 'object' && (parsed.role === 'assistant' || parsed.reasoning || parsed.content !== undefined)) {
                    const reasoning = (parsed.reasoning || '').toLowerCase();
                    const bodyContent = (parsed.content || '').trim();
                    if (!bodyContent && (reasoning.includes('generate an image') || reasoning.includes('create an image') || reasoning.includes('image of') || reasoning.includes('user wants to generate an image') || reasoning.includes('user wants an image'))) {
                        let extracted = 'concept car';
                        const match = reasoning.match(/image\s+of\s+(?:a\s+|an\s+)?([a-zA-Z0-9\s]+?)(?:\.|\?|,|$)/i);
                        if (match && match[1]) extracted = match[1].trim();
                        content = `Here is the artwork synthesized for **"${extracted}"**:\n\n![Generated Image](sd://${encodeURIComponent(extracted)}?model=flux-2)\n\n> ⚡ **Engine:** FLUX.2 Flagship *(Open-Source High Fidelity)*`;
                    } else if (bodyContent) {
                        content = bodyContent;
                    } else if (parsed.reasoning) {
                        content = parsed.reasoning;
                    }
                }
            } catch(e) {}
        }
    }

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
    
    // AI Sender Identity Header
    if (!isUser) {
        const aiHeader = document.createElement('div');
        aiHeader.className = 'msg-sender-header';
        const personaCfg = PERSONA_CONFIGS[getPersona()] || PERSONA_CONFIGS.professional;
        const currentEngine = globalSettings?.aiEngine || 'local';
        let modelName = 'Ocal Core';
        if (currentEngine === 'gemini') {
            modelName = (globalSettings?.aiApiKey && globalSettings.aiApiKey.trim().length > 14) ? 'Gemini 1.5 Flash' : 'Cloud AI (Online)';
        } else if (currentEngine === 'openai') {
            modelName = (globalSettings?.openaiApiKey && globalSettings.openaiApiKey.trim().length > 14) ? 'ChatGPT' : 'Cloud AI (Online)';
        } else if (currentEngine === 'custom') {
            modelName = globalSettings?.customModel || 'Custom API';
        } else {
            modelName = (globalSettings?.localModel && globalSettings.localModel !== 'auto') 
                ? globalSettings.localModel 
                : 'Cloud AI (Online)';
        }
        
        aiHeader.innerHTML = `
            <div class="msg-sender-meta">
                <span class="msg-sender-name">Ocal AI</span>
                <span class="msg-persona-badge">${personaCfg.badge}</span>
                <span class="msg-model-tag">${modelName}</span>
            </div>
        `;
        group.appendChild(aiHeader);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    bubble.appendChild(contentDiv);

    // Actions (embedded cleanly in message card)
    if (actions && actions.length > 0) {
        const actionsRow = document.createElement('div');
        actionsRow.className = 'agent-actions-row';
        actions.forEach(action => {
            const actionEl = document.createElement('div');
            actionEl.className = `agent-action ${action.url || action.command || action.prompt || action.text ? 'clickable' : ''}`;
            actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-bolt'}"></i> <span>${action.text}</span>`;
            
            if (action.url) {
                actionEl.onclick = () => window.electronAPI.send('open-external', action.url);
            } else if (action.command) {
                actionEl.onclick = () => window.electronAPI.send('execute-agent-command', action);
            } else if (action.prompt || action.text) {
                actionEl.onclick = () => handleSend(action.prompt || action.text);
            }
            actionsRow.appendChild(actionEl);
        });
        bubble.appendChild(actionsRow);
    }

    group.appendChild(bubble);
    messagesEl.appendChild(group);
    scrollToBottom(isUser);

    if (isUser) {
        contentDiv.innerHTML = renderMarkdown(content.trim()).trim();
    } else {
        await typeMessage(contentDiv, content);
        
        // Add Footer Bar for AI responses
        const footerBar = document.createElement('div');
        footerBar.className = 'msg-footer-bar';
        footerBar.innerHTML = `
            <div class="msg-footer-actions">
                <button class="msg-action-btn copy-msg-btn" title="Copy response"><i class="fas fa-copy"></i> <span>Copy</span></button>
                <button class="msg-action-btn speak-msg-btn" title="Read aloud"><i class="fas fa-volume-high"></i> <span>Speak</span></button>
            </div>
            <span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        
        const copyBtn = footerBar.querySelector('.copy-msg-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check" style="color: #10B981;"></i> <span>Copied!</span>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
                    }, 2000);
                });
            };
        }

        const speakBtn = footerBar.querySelector('.speak-msg-btn');
        if (speakBtn) {
            speakBtn.onclick = () => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                    speakBtn.innerHTML = '<i class="fas fa-volume-high"></i> <span>Speak</span>';
                } else {
                    const plainText = content.replace(/<[^>]+>/g, '').replace(/[#*_`]/g, '');
                    const utterance = new SpeechSynthesisUtterance(plainText);
                    utterance.onend = () => {
                        speakBtn.innerHTML = '<i class="fas fa-volume-high"></i> <span>Speak</span>';
                    };
                    utterance.onerror = () => {
                        speakBtn.innerHTML = '<i class="fas fa-volume-high"></i> <span>Speak</span>';
                    };
                    window.speechSynthesis.speak(utterance);
                    speakBtn.innerHTML = '<i class="fas fa-pause" style="color: var(--accent);"></i> <span>Playing...</span>';
                }
            };
        }

        group.appendChild(footerBar);
    }
    
    return group;
};

// Helper: Thinking State
let currentThinkingEl = null;

const showThinking = () => {
    if (currentThinkingEl) return;
    ocalHeaderOrb?.setState('thinking');
    const group = document.createElement('div');
    group.className = 'msg-group ai thinking-group';
    const personaCfg = PERSONA_CONFIGS[getPersona()] || PERSONA_CONFIGS.professional;
    const currentEngine = globalSettings?.aiEngine || 'local';
    let modelName = 'Ocal Core';
    if (currentEngine === 'gemini') {
        modelName = (globalSettings?.aiApiKey && globalSettings.aiApiKey.trim().length > 14) ? 'Gemini 1.5 Flash' : 'Cloud AI (Online)';
    } else if (currentEngine === 'openai') {
        modelName = (globalSettings?.openaiApiKey && globalSettings.openaiApiKey.trim().length > 14) ? 'ChatGPT' : 'Cloud AI (Online)';
    } else if (currentEngine === 'custom') {
        modelName = globalSettings?.customModel || 'Custom API';
    } else {
        modelName = (globalSettings?.localModel && globalSettings.localModel !== 'auto') 
            ? globalSettings.localModel 
            : 'Cloud AI (Online)';
    }

    group.innerHTML = `
        <div class="msg-sender-header">
            <div class="msg-sender-meta">
                <span class="msg-sender-name">Ocal AI</span>
                <span class="msg-persona-badge">${personaCfg.badge}</span>
                <span class="msg-model-tag">${modelName}</span>
            </div>
        </div>
        <div class="thinking-pill">
            <span class="thinking-orb-slot" style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0;"></span>
            <span class="thinking-text">Thinking</span>
            <span class="thinking-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </span>
        </div>
    `;
    messagesEl.appendChild(group);
    currentThinkingEl = group;

    // Attach mini thinking orb inside pill
    const miniOrbSlot = group.querySelector('.thinking-orb-slot');
    if (miniOrbSlot && window.LibrariesDevFX?.ThinkingOrb) {
        window.LibrariesDevFX.ThinkingOrb.createOrb(miniOrbSlot, { size: 18, mode: 'wave', speed: 2.4 });
    }

    scrollToBottom();
};

const hideThinking = () => {
    if (currentThinkingEl) {
        currentThinkingEl.remove();
        currentThinkingEl = null;
    }
    ocalHeaderOrb?.setState('idle');
};

// Main Handler
const handleSend = async (customQuery = null) => {
    let q = (customQuery || queryEl.value).trim();
    if (!q && !attachedFile && !currentSession?.activeDocument) return;

    if (!customQuery) {
        queryEl.value = '';
        queryEl.style.height = 'auto';
    }

    // If new file attached in this turn, store as active document in current session
    const isNewFileAttached = !!attachedFile;
    if (isNewFileAttached && currentSession) {
        currentSession.activeDocument = attachedFile;
        saveChatSessions();
        updateActiveDocUI();
    }

    // Effective active document for context (either newly attached or retained in memory)
    const effectiveDoc = attachedFile || currentSession?.activeDocument || null;

    // Auto-rename chat session on first user message
    if (currentSession && currentSession.messages.length === 0) {
        const titleSource = q || (effectiveDoc ? effectiveDoc.name : 'New Chat');
        currentSession.title = titleSource.length > 25 ? titleSource.substring(0, 22) + '...' : titleSource;
        saveChatSessions();
    }

    let userBubbleText = q;
    if (isNewFileAttached && effectiveDoc) {
        let fileMarkup = '';
        if (effectiveDoc.type === 'image') {
            fileMarkup = `<img src="data:${effectiveDoc.mimeType};base64,${effectiveDoc.data}" class="msg-file-img-preview" alt="${effectiveDoc.name}">\n\n`;
        } else {
            const iconClass = getDocIconClass(effectiveDoc.name);
            fileMarkup = `<div class="active-doc-pill" style="display:inline-flex;margin-bottom:8px;padding:4px 10px;background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid var(--accent-border);border-radius:12px;font-size:11.5px;"><i class="${iconClass}" style="color:var(--accent);margin-right:6px;"></i> <b>${effectiveDoc.name}</b></div>\n\n`;
        }
        
        if (!q) {
            q = `Please analyze the uploaded document "${effectiveDoc.name}" completely and thoroughly. Provide a comprehensive breakdown covering all main sections, key takeaways, summary of findings, and important details.`;
            userBubbleText = `${fileMarkup}Analyze this document completely`;
        } else {
            userBubbleText = `${fileMarkup}${q}`;
        }
    } else if (!q && effectiveDoc) {
        q = `Please analyze "${effectiveDoc.name}" and provide a summary of its key points and insights.`;
        userBubbleText = `Analyze active document: ${effectiveDoc.name}`;
    }

    await addMessage(userBubbleText, true);
    showThinking();

    // Prepare multi-turn conversation history (last 10 messages) for LLM memory
    const historyList = (currentSession?.messages || [])
        .slice(-10)
        .map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.content
        }));

    // Prepare payload with clean query string, persona metadata, history, and active document
    const personaKey = getPersona();
    const memoryFacts = getMemories();
    const customConfig = getCustomCompanionConfig();

    const payload = {
        query: q,
        persona: personaKey,
        memory: memoryFacts,
        customConfig: customConfig,
        username: getUsername(),
        history: historyList,
        file: effectiveDoc
    };

    // Reset pending file preview (document stays preserved in active session memory)
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
        if (promptText) {
            const cardTitle = card.querySelector('.hero-prompt-text strong')?.textContent || '';
            if (cardTitle.includes('Generate Artwork') || promptText.includes('Image Studio')) {
                const studioBtn = document.getElementById('mode-btn-studio');
                if (studioBtn) {
                    studioBtn.click();
                    const studioPrompt = document.getElementById('studio-prompt-input');
                    if (studioPrompt) {
                        studioPrompt.focus();
                        studioPrompt.value = "A futuristic sci-fi city with glowing neon lights, 8k resolution, cinematic lighting";
                    }
                }
                return;
            }
            if (queryEl) {
                queryEl.value = promptText;
                handleSend();
            }
        }
    });
});

document.getElementById('nav-images-btn')?.addEventListener('click', () => {
    const studioBtn = document.getElementById('mode-btn-studio');
    if (studioBtn) studioBtn.click();
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
if (window.OcalChatImageCache) {
    OcalChatImageCache.init().finally(() => {
        renderSessionMessages(currentSession);
    });
} else {
    renderSessionMessages(currentSession);
}

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

// Smooth mouse wheel horizontal scrolling for quick-tools
const quickToolsContainer = document.querySelector('.quick-tools');
if (quickToolsContainer) {
    quickToolsContainer.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            quickToolsContainer.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

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

    let grad = `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
    if (window.OcalColorHarmonizer && typeof window.OcalColorHarmonizer.getHarmonizedGradients === 'function') {
        const grads = window.OcalColorHarmonizer.getHarmonizedGradients(color);
        if (grads && grads.primary) grad = grads.primary;
    } else {
        grad = `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 75%, #FFFFFF) 100%)`;
    }

    const glow = hexToRgba(color, 0.35);
    const dim = hexToRgba(color, 0.12);
    const border = hexToRgba(color, 0.25);

    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-gradient', grad);
    document.documentElement.style.setProperty('--accent-glow', glow);
    document.documentElement.style.setProperty('--accent-dim', dim);
    document.documentElement.style.setProperty('--accent-border', border);
    document.documentElement.style.setProperty('--accent-text', contrastColor);

    document.body.style.setProperty('--accent', color);
    document.body.style.setProperty('--accent-gradient', grad);
    document.body.style.setProperty('--accent-glow', glow);
    document.body.style.setProperty('--accent-dim', dim);
    document.body.style.setProperty('--accent-border', border);
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
        let model = s.localModel || 'auto';
        if (model === 'auto') {
            try {
                if (window.electronAPI?.invoke) {
                    const localRes = await window.electronAPI.invoke('get-local-models');
                    if (localRes?.models && localRes.models.length > 0) {
                        model = localRes.models[0].name;
                    }
                }
            } catch (e) {}

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
                        }
                    }
                } catch (e) {}
            }
        }

        if (!model || model === 'auto') model = 'deepseek-r1';
        
        // Clean display label
        let displayModel = model;
        if (model.includes('deepseek')) displayModel = 'DeepSeek R1';
        else if (model.includes('llama3.3') || model.includes('llama-3.3')) displayModel = 'Llama 3.3';
        else if (model.includes('llama3.2') || model.includes('llama-3.2')) displayModel = 'Llama 3.2';
        else if (model.includes('llama3') || model.includes('llama-3')) displayModel = 'Llama 3';
        else if (model.includes('qwen2.5') || model.includes('qwen-2.5')) displayModel = 'Qwen 2.5';
        else if (model.includes('gemma-4') || model.includes('gemma:4')) displayModel = 'Gemma 4';
        else if (model.includes('gemma2') || model.includes('gemma:2')) displayModel = 'Gemma 2';
        else if (model.includes('phi4') || model.includes('phi-4')) displayModel = 'Phi-4';
        else if (model.includes('mistral')) displayModel = 'Mistral';

        label = `Local: ${displayModel}`;
    }
    
    badge.textContent = label;
    badge.style.display = 'inline-block';
}

function applySidebarTheme(s) {
    if (!s) return;
    const theme = s.themeMode || s.theme || localStorage.getItem('ocal-settings-theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        document.documentElement.style.background = '#18181B';
        document.documentElement.style.colorScheme = 'dark';
    } else {
        document.documentElement.style.background = '#EDEDF0';
        document.documentElement.style.colorScheme = 'light';
    }
    try { localStorage.setItem('ocal-settings-theme', theme); } catch (e) {}

    if (s.accentColor) {
        applyAccent(s.accentColor);
        try { localStorage.setItem('ocal-settings-accent', s.accentColor); } catch (e) {}
    }
}

// Listen for global settings changes & IPC Events safely
if (window.electronAPI) {
    if (window.electronAPI.onSettingsChanged) {
        window.electronAPI.onSettingsChanged((s) => {
            globalSettings = s || {};
            applySidebarTheme(s);
            if (s) updateActiveModelBadge(s);
        });
    }

    window.electronAPI.on?.('settings-changed', (e, s) => {
        const settings = s || e || {};
        globalSettings = settings;
        applySidebarTheme(settings);
        if (settings) updateActiveModelBadge(settings);
    });

    const fetchInitialSettings = () => {
        const p = window.electronAPI.getSettings ? window.electronAPI.getSettings() : window.electronAPI.invoke?.('get-settings');
        if (p && p.then) {
            p.then(s => {
                globalSettings = s || {};
                applySidebarTheme(s);
                if (s) updateActiveModelBadge(s);
            }).catch(() => {});
        }
    };
    fetchInitialSettings();

    window.electronAPI.on?.('ai-agent-action', (e, action) => {
        const actionEl = document.createElement('div');
        actionEl.className = 'agent-action';
        actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-bolt'}"></i> ${action.text}`;
        messagesEl.appendChild(actionEl);
        scrollToBottom();
    });

    window.electronAPI.on?.('start-sidebar-exit', () => {
        document.body.classList.add('closing');
        const panel = document.querySelector('.ai-panel');
        if (panel) panel.classList.remove('animate-in');
        setTimeout(() => {
            window.electronAPI.send?.('sidebar-exit-complete');
        }, 280);
    });

    const triggerEntranceAnimation = () => {
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
    };

    window.electronAPI.on?.('sidebar-shown', triggerEntranceAnimation);

    // Also trigger entrance on initial document load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', triggerEntranceAnimation);
    } else {
        triggerEntranceAnimation();
    }
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

// --- Navigation Tab Switcher & Multi-Entry Points ---
function switchToStudio() {
    navTabImage?.classList.add('active');
    navTabChat?.classList.remove('active');
    const modeBtnStudio = document.getElementById('mode-btn-studio');
    const modeBtnChat = document.getElementById('mode-btn-chat');
    modeBtnStudio?.classList.add('active');
    modeBtnChat?.classList.remove('active');
    
    if (imageStudioView) imageStudioView.style.display = 'flex';
    if (chatView) chatView.style.display = 'none';
}

function switchToChat() {
    navTabChat?.classList.add('active');
    navTabImage?.classList.remove('active');
    const modeBtnStudio = document.getElementById('mode-btn-studio');
    const modeBtnChat = document.getElementById('mode-btn-chat');
    modeBtnChat?.classList.add('active');
    modeBtnStudio?.classList.remove('active');

    if (chatView) chatView.style.display = 'flex';
    if (imageStudioView) imageStudioView.style.display = 'none';
}

navTabChat?.addEventListener('click', switchToChat);
navTabImage?.addEventListener('click', switchToStudio);
document.getElementById('mode-btn-chat')?.addEventListener('click', switchToChat);
document.getElementById('mode-btn-studio')?.addEventListener('click', switchToStudio);
document.getElementById('nav-images-btn')?.addEventListener('click', switchToStudio);

// ── Modern AI Image Studio Engine ─────────────────────────────
(function initAIImageStudio() {
    // Curated creative prompts for "Surprise Me"
    const INSPIRATION_PROMPTS = [
        "A futuristic holographic bonsai tree glowing with cyan and violet light in a dark minimalist room, 8k resolution, octane render, Ray Tracing, serene aesthetic",
        "Epic close-up portrait of a cybernetic warrior with glowing gold ocular implants, rain pouring down, neon reflections on titanium armor, hyperrealistic 8k",
        "Dreamy anime girl watching a glowing shooting star shower on a grassy hill at twilight, Makoto Shinkai art style, breathtaking clouds, vibrant colors",
        "Mystical floating islands with cascading waterfalls over a sea of clouds, ancient crystalline ruins, golden hour sunlight, majestic fantasy landscape",
        "A cute tiny red panda wearing an astronaut helmet floating weightless in space with glowing nebulae and distant galaxies, Pixar 3D digital render",
        "Hyper-detailed portrait of an elderly wizard studying a levitating illuminated celestial globe in an ancient Gothic library, volumetric dust rays, 8k",
        "Sleek retro-futuristic flying supercar cruising through a neon synthwave metropolis at midnight, purple sunset horizon, chrome reflections",
        "Biomimetic glass greenhouse city dome on Mars with lush tropical jungle inside, red dust storm raging outside, cinematic sci-fi concept art",
        "Bioluminescent jellyfish queen floating gracefully through a deep dark abyss, glowing cyan and magenta tentacles, ethereal underwater photography",
        "Intricate steam-powered mechanical hummingbird with brass gears and iridescent hummingbird feathers sipping golden nectar from a clockwork flower",
        "A serene Kyoto zen garden in autumn with vibrant crimson maple leaves falling onto a glassy reflective koi pond, misty morning light, photorealistic",
        "Cyberpunk street noodle vendor in rainy Neo-Tokyo, steam rising from ramen bowls, neon holograms flickering in puddle reflections, cinematic 8k",
        "Magnificent mythical crystal dragon perched on a jagged obsidian mountain summit during a purple thunderstorm, crackling lightning arcs",
        "Cozy rainy day coffee shop with warm ambient lantern lights, wooden bookshelves, cat sleeping on a velvet armchair, detailed digital painting",
        "Surreal dreamscape where giant floating whale-like airships drift peacefully between colossal cotton candy clouds, golden hour sunlight",
        "Cinematic film still of an explorer discovering a glowing subterranean crystal cave, flashlight illuminating ancient geometric glyphs",
        "A majestic snow leopard with piercing sapphire eyes standing on an icy Himalayan ridge at sunrise, blowing spindrift, National Geographic 8k"
    ];

    // State Variables
    let selectedModel = 'flux';
    let selectedCloudProvider = 'openai';
    let selectedRatio = '1:1';
    let selectedQuality = 'standard';
    let selectedWidth = 1024;
    let selectedHeight = 1024;
    let activeStyleText = '';
    let activeLightingText = '';
    let activeCameraText = '';
    let currentGeneratedUrl = '';
    let currentGeneratedPrompt = '';
    let isGenerating = false;

    // Helper: Compute target resolutions based on ratio and quality mode
    function updateDimensions() {
        const isUltra = selectedQuality === 'ultra';
        switch (selectedRatio) {
            case '16:9':
                selectedWidth = isUltra ? 1920 : 1344;
                selectedHeight = isUltra ? 1080 : 768;
                break;
            case '9:16':
                selectedWidth = isUltra ? 1080 : 768;
                selectedHeight = isUltra ? 1920 : 1344;
                break;
            case '4:3':
                selectedWidth = isUltra ? 1600 : 1152;
                selectedHeight = isUltra ? 1200 : 864;
                break;
            case '1:1':
            default:
                selectedWidth = isUltra ? 1536 : 1024;
                selectedHeight = isUltra ? 1536 : 1024;
                break;
        }
    }

    // DOM References
    const promptInput = document.getElementById('studio-prompt-input');
    const promptCountEl = document.getElementById('ais-prompt-count');
    const generateBtn = document.getElementById('studio-generate-btn');
    const generateText = document.getElementById('ais-generate-text');
    const surpriseBtn = document.getElementById('ais-surprise-btn');
    const enhanceBtn = document.getElementById('ais-enhance-btn');
    const clearBtn = document.getElementById('ais-clear-btn');
    const cloudRow = document.getElementById('ais-cloud-row');
    const advToggle = document.getElementById('ais-adv-toggle');
    const advArrow = document.getElementById('ais-adv-arrow');
    const advPanel = document.getElementById('ais-adv-panel');
    const seedInput = document.getElementById('studio-seed-value');
    const seedRandBtn = document.getElementById('ais-seed-rand-btn');
    const negInput = document.getElementById('studio-negative-input');

    // Quality Toggles
    const qualityStdBtn = document.getElementById('ais-quality-std');
    const qualityUltraBtn = document.getElementById('ais-quality-ultra');

    // Canvas Stage References
    const emptyState = document.getElementById('ais-empty-state');
    const progressState = document.getElementById('ais-progress-state');
    const resultContainer = document.getElementById('ais-result-container');
    const resultImg = document.getElementById('studio-result-img');
    const progressHeadline = document.getElementById('ais-progress-headline');
    const progressSubtext = document.getElementById('ais-progress-subtext');
    const progressBarFill = document.getElementById('ais-progress-bar-fill');
    const progressPercent = document.getElementById('ais-progress-percent');
    const progressModelTag = document.getElementById('ais-progress-model-tag');
    const resultPromptSnippet = document.getElementById('ais-result-prompt-snippet');
    const resultModelBadge = document.getElementById('ais-result-model-badge');

    // Floating Dock Buttons
    const downloadBtn = document.getElementById('studio-download-btn');
    const copyBtn = document.getElementById('studio-copy-btn');
    const zoomBtn = document.getElementById('studio-zoom-btn');
    const remixBtn = document.getElementById('studio-remix-btn');
    const chatBtn = document.getElementById('studio-chat-btn');
    const regenBtn = document.getElementById('studio-regen-btn');

    // Gallery References
    const gallerySection = document.getElementById('ais-gallery-section');
    const galleryStrip = document.getElementById('ais-gallery-strip');
    const galleryClearBtn = document.getElementById('ais-gallery-clear-btn');

    // Lightbox References
    const lightbox = document.getElementById('ais-lightbox');
    const lightboxImg = document.getElementById('ais-lightbox-img');
    const lightboxClose = document.getElementById('ais-lightbox-close');
    const lightboxBackdrop = document.getElementById('ais-lightbox-backdrop');
    const lightboxCaption = document.getElementById('ais-lightbox-caption');
    const lightboxDownload = document.getElementById('ais-lightbox-download');

    // 0. Live Prompt Word & Character Counter
    function updatePromptCounter() {
        const val = promptInput?.value?.trim() || '';
        const words = val ? val.split(/\s+/).length : 0;
        const chars = val.length;
        if (promptCountEl) {
            promptCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}${chars > 0 ? ` (${chars} chars)` : ''}`;
        }
    }
    promptInput?.addEventListener('input', updatePromptCounter);

    // 1. Model Pills Selection
    const enginePills = document.querySelectorAll('.ais-engine-pill');
    enginePills.forEach(pill => {
        pill.addEventListener('click', () => {
            enginePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            selectedModel = pill.getAttribute('data-engine') || 'flux';

            if (selectedModel === 'cloud') {
                if (cloudRow) cloudRow.style.display = 'flex';
            } else {
                if (cloudRow) cloudRow.style.display = 'none';
            }
        });
    });

    // 2. Cloud Provider Tabs
    const cloudTabs = document.querySelectorAll('.ais-cloud-tab');
    cloudTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            cloudTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedCloudProvider = tab.getAttribute('data-cloud') || 'openai';
        });
    });

    // 3. Quality Mode Toggle (1K HD vs 2K Ultra)
    qualityStdBtn?.addEventListener('click', () => {
        selectedQuality = 'standard';
        qualityStdBtn.classList.add('active');
        qualityUltraBtn?.classList.remove('active');
        updateDimensions();
    });

    qualityUltraBtn?.addEventListener('click', () => {
        selectedQuality = 'ultra';
        qualityUltraBtn.classList.add('active');
        qualityStdBtn?.classList.remove('active');
        updateDimensions();
    });

    // 4. Aspect Ratio Selection
    const aspectBtns = document.querySelectorAll('.ais-aspect-btn');
    aspectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            aspectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRatio = btn.getAttribute('data-ratio') || '1:1';
            updateDimensions();
        });
    });

    // 5. Category Navigation (Styles / Lighting / Camera)
    const catTabs = document.querySelectorAll('.ais-cat-tab');
    const chipsStyles = document.getElementById('ais-chips-styles');
    const chipsLighting = document.getElementById('ais-chips-lighting');
    const chipsCamera = document.getElementById('ais-chips-camera');

    catTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.getAttribute('data-cat') || 'styles';

            if (chipsStyles) chipsStyles.style.display = (cat === 'styles') ? 'flex' : 'none';
            if (chipsLighting) chipsLighting.style.display = (cat === 'lighting') ? 'flex' : 'none';
            if (chipsCamera) chipsCamera.style.display = (cat === 'camera') ? 'flex' : 'none';
        });
    });

    // 6. Preset Chips Handlers
    // Styles
    chipsStyles?.querySelectorAll('.ais-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const isCurrentlyActive = chip.classList.contains('active');
            chipsStyles.querySelectorAll('.ais-preset-chip').forEach(c => c.classList.remove('active'));

            if (isCurrentlyActive) {
                activeStyleText = '';
            } else {
                chip.classList.add('active');
                activeStyleText = chip.getAttribute('data-style') || '';
            }
        });
    });

    // Lighting
    chipsLighting?.querySelectorAll('.ais-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const isCurrentlyActive = chip.classList.contains('active');
            chipsLighting.querySelectorAll('.ais-preset-chip').forEach(c => c.classList.remove('active'));

            if (isCurrentlyActive) {
                activeLightingText = '';
            } else {
                chip.classList.add('active');
                activeLightingText = chip.getAttribute('data-lighting') || '';
            }
        });
    });

    // Camera
    chipsCamera?.querySelectorAll('.ais-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const isCurrentlyActive = chip.classList.contains('active');
            chipsCamera.querySelectorAll('.ais-preset-chip').forEach(c => c.classList.remove('active'));

            if (isCurrentlyActive) {
                activeCameraText = '';
            } else {
                chip.classList.add('active');
                activeCameraText = chip.getAttribute('data-camera') || '';
            }
        });
    });

    // 7. Surprise Me / Random Prompt
    surpriseBtn?.addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * INSPIRATION_PROMPTS.length);
        const randomPrompt = INSPIRATION_PROMPTS[randomIndex];
        if (promptInput) {
            promptInput.value = randomPrompt;
            updatePromptCounter();
            promptInput.focus();
        }
    });

    // 8. Enhance Prompt Button
    enhanceBtn?.addEventListener('click', () => {
        if (!promptInput) return;
        const current = promptInput.value.trim();
        if (!current) {
            surpriseBtn?.click();
            return;
        }

        // Smart prompt enhancer
        let enhanced = current;
        if (!/8k|photorealistic|high resolution|masterpiece/i.test(enhanced)) {
            enhanced += ', 8k resolution, photorealistic masterpiece, ultra-detailed';
        }
        if (!/lighting|cinematic|volumetric|studio light/i.test(enhanced)) {
            enhanced += ', cinematic volumetric lighting, ray tracing';
        }
        if (!/lens|hasselblad|bokeh|depth of field/i.test(enhanced)) {
            enhanced += ', shot on 50mm f/1.2 lens, beautiful depth of field';
        }
        promptInput.value = enhanced;
        updatePromptCounter();
    });

    // 9. Clear Prompt Button
    clearBtn?.addEventListener('click', () => {
        if (promptInput) {
            promptInput.value = '';
            updatePromptCounter();
            promptInput.focus();
        }
    });

    // 10. Fine-Tuning Toggle & Seed Randomizer
    advToggle?.addEventListener('click', () => {
        const isHidden = advPanel.style.display === 'none';
        advPanel.style.display = isHidden ? 'flex' : 'none';
        advArrow?.classList.toggle('open', isHidden);
    });

    seedRandBtn?.addEventListener('click', () => {
        if (seedInput) {
            seedInput.value = Math.floor(Math.random() * 9000000) + 100000;
        }
    });

    // 11. Starter Cards in Empty State
    document.querySelectorAll('.ais-starter-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            const style = card.getAttribute('data-style');
            if (promptInput && prompt) {
                promptInput.value = prompt;
                updatePromptCounter();
            }
            if (style && chipsStyles) {
                chipsStyles.querySelectorAll('.ais-preset-chip').forEach(c => {
                    if (c.textContent.trim().toLowerCase().includes(style.toLowerCase())) {
                        c.click();
                    }
                });
            }
            startImageGeneration();
        });
    });

    // 12. Ctrl+Enter to trigger generation from textarea
    promptInput?.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            startImageGeneration();
        }
    });

    generateBtn?.addEventListener('click', () => {
        startImageGeneration();
    });

    // 13. High-Accuracy Zero-Watermark Engine (uses globally hoisted produceZeroWatermarkArtwork)


    // 14. Core Image Generation Routine
    async function startImageGeneration() {
        const rawPrompt = promptInput?.value?.trim();
        if (!rawPrompt || isGenerating) {
            if (!rawPrompt && promptInput) promptInput.focus();
            return;
        }

        isGenerating = true;
        if (generateBtn) generateBtn.disabled = true;
        if (generateText) generateText.textContent = 'Synthesizing...';

        // Compose full prompt with active style, lighting, and camera presets
        let fullPrompt = rawPrompt;
        if (activeStyleText && !fullPrompt.includes(activeStyleText)) {
            fullPrompt = `${fullPrompt}, ${activeStyleText}`;
        }
        if (activeLightingText && !fullPrompt.includes(activeLightingText)) {
            fullPrompt = `${fullPrompt}, ${activeLightingText}`;
        }
        if (activeCameraText && !fullPrompt.includes(activeCameraText)) {
            fullPrompt = `${fullPrompt}, ${activeCameraText}`;
        }

        // Retrieve negative prompt and seed
        const negPrompt = negInput?.value?.trim() || 'blurry, low quality, deformed, distorted, extra limbs, extra fingers, bad anatomy, pixelated, ugly, watermark, text, signature, logo';
        let seed = seedInput?.value?.trim() ? parseInt(seedInput.value, 10) : Math.floor(Math.random() * 9000000) + 100000;

        // Stage UI transitions: Hide empty & result, Show scanner
        if (emptyState) emptyState.style.display = 'none';
        if (resultContainer) resultContainer.style.display = 'none';
        if (progressState) progressState.style.display = 'flex';

        // Mount 3D Thinking Orb in Studio loader
        let orbInstance = null;
        const orbSlot = document.getElementById('ais-studio-orb-slot');
        if (orbSlot && window.LibrariesDevFX?.ThinkingOrb) {
            orbSlot.innerHTML = '';
            orbInstance = window.LibrariesDevFX.ThinkingOrb.createOrb(orbSlot, {
                size: 90,
                mode: 'orbits',
                speed: 2.2,
                particleCount: 40
            });
        }
        if (progressState && window.LibrariesDevFX?.BorderBeam) {
            window.LibrariesDevFX.BorderBeam.attach(progressState, { preset: 'accent', duration: '4.5s' });
        }

        if (progressBarFill) {
            progressBarFill.style.background = '';
            progressBarFill.style.width = '0%';
        }
        if (progressPercent) progressPercent.textContent = '0%';
        if (progressHeadline) progressHeadline.textContent = 'Sampling Latent Vector Space...';
        if (progressSubtext) progressSubtext.textContent = `Initializing ${selectedModel.toUpperCase()} diffusion model`;
        if (progressModelTag) {
            progressModelTag.innerHTML = selectedModel === 'cloud' 
                ? (selectedCloudProvider === 'openai' ? '<i class="fas fa-brain"></i> DALL-E 3 Cloud' : '<i class="fas fa-wand-magic-sparkles"></i> Google Imagen 3')
                : `<i class="fas fa-microchip"></i> FLUX ${selectedModel.toUpperCase()}`;
        }

        // Animated progression steps
        let progress = 0;
        let generationFinished = false;
        const interval = setInterval(() => {
            if (generationFinished) {
                clearInterval(interval);
                return;
            }
            if (progress < 40) progress += Math.floor(Math.random() * 7) + 5;
            else if (progress < 80) progress += Math.floor(Math.random() * 4) + 2;
            else if (progress < 96) progress += 1;

            if (progress > 96) progress = 96;

            if (progressBarFill) progressBarFill.style.width = `${progress}%`;
            if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;

            if (progressHeadline && progressSubtext) {
                if (progress < 30) {
                    progressHeadline.textContent = 'Sampling Latent Vector Space...';
                    progressSubtext.textContent = 'Constructing high-dimensional vector embeddings';
                    orbInstance?.setMode('orbits');
                } else if (progress < 65) {
                    progressHeadline.textContent = 'Refining Structures & Textures...';
                    progressSubtext.textContent = `Denoising visual representation (Step ${Math.round(progress * 0.4)}/40)`;
                    orbInstance?.setMode('wave');
                } else if (progress < 85) {
                    progressHeadline.textContent = 'Synthesizing Neural Feature Web...';
                    progressSubtext.textContent = 'Connecting latent node tensors';
                    orbInstance?.setMode('web');
                } else {
                    progressHeadline.textContent = 'Finalizing Pristine 4K Render...';
                    progressSubtext.textContent = 'Volumetric light passes & zero-watermark crop';
                    orbInstance?.setMode('globe');
                }
            }
        }, 200);

        try {
            let finalImageUrl = '';

            if (selectedModel === 'cloud') {
                if (selectedCloudProvider === 'openai') {
                    const apiKey = globalSettings?.openaiApiKey;
                    if (!apiKey) {
                        throw new Error('OpenAI API Key is missing. Please set your key in AI Settings.');
                    }
                    let size = '1024x1024';
                    if (selectedWidth > selectedHeight) size = '1792x1024';
                    else if (selectedWidth < selectedHeight) size = '1024x1792';

                    const res = await fetch('https://api.openai.com/v1/images/generations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: 'dall-e-3',
                            prompt: fullPrompt,
                            n: 1,
                            size: size
                        })
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error?.message || `OpenAI DALL-E error (${res.status})`);
                    }
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        finalImageUrl = data.data[0].url;
                    } else {
                        throw new Error('No image returned by DALL-E 3');
                    }
                } else {
                    // Google Imagen 3
                    const apiKey = globalSettings?.aiApiKey;
                    if (!apiKey) {
                        throw new Error('Gemini API Key is missing. Please set your key in AI Settings.');
                    }
                    let imagenRatio = '1:1';
                    if (selectedRatio === '16:9') imagenRatio = '16:9';
                    else if (selectedRatio === '9:16') imagenRatio = '9:16';
                    else if (selectedRatio === '4:3') imagenRatio = '4:3';

                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{ prompt: fullPrompt }],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: imagenRatio,
                                outputMimeType: 'image/jpeg'
                            }
                        })
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error?.message || `Google Imagen error (${res.status})`);
                    }
                    const data = await res.json();
                    if (data.predictions && data.predictions.length > 0) {
                        const prediction = data.predictions[0];
                        const base64Data = prediction.bytesBase64Encoded || prediction.image?.imageBytes;
                        const mime = prediction.mimeType || 'image/jpeg';
                        finalImageUrl = `data:${mime};base64,${base64Data}`;
                    } else {
                        throw new Error('No image returned by Google Imagen 3');
                    }
                }
            } else {
                // High-performance direct Pollinations FLUX engine
                let modelParam = 'flux';
                if (selectedModel === 'flux-realism') modelParam = 'flux-realism';
                else if (selectedModel === 'flux-anime') modelParam = 'flux-anime';
                else if (selectedModel === 'flux-3d') modelParam = 'flux-3d';
                else if (selectedModel === 'turbo') modelParam = 'turbo';

                // Buffer height by +56px so the bottom-left watermark is isolated
                const fetchHeight = selectedHeight + 56;
                const encodedPrompt = encodeURIComponent(fullPrompt);
                const encodedNeg = encodeURIComponent(negPrompt);
                const rawPollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${selectedWidth}&height=${fetchHeight}&seed=${seed}&model=${modelParam}&nologo=true&enhance=true&negative_prompt=${encodedNeg}`;

                // Process through our Zero-Watermark Engine
                finalImageUrl = await produceZeroWatermarkArtwork(rawPollinationsUrl, selectedWidth, selectedHeight);
            }

            // Preload image before revealing
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => {
                    // Fallback to simpler URL if enhance failed
                    if (selectedModel !== 'cloud') {
                        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${selectedWidth}&height=${selectedHeight + 56}&seed=${seed}&model=flux&nologo=true`;
                        produceZeroWatermarkArtwork(fallbackUrl, selectedWidth, selectedHeight).then(cleanUrl => {
                            finalImageUrl = cleanUrl;
                            const retryImg = new Image();
                            retryImg.onload = () => resolve();
                            retryImg.onerror = () => reject(new Error('Network error loading artwork. Please check connection.'));
                            retryImg.src = finalImageUrl;
                        }).catch(() => reject(new Error('Network error loading artwork.')));
                    } else {
                        reject(new Error('Failed to load artwork from cloud endpoint.'));
                    }
                };
                img.src = finalImageUrl;
            });

            // Generation succeeded!
            generationFinished = true;
            clearInterval(interval);

            if (progressBarFill) progressBarFill.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';

            currentGeneratedUrl = finalImageUrl;
            currentGeneratedPrompt = fullPrompt;

            // Display artwork with luminous aperture reveal animation
            if (resultImg) {
                resultImg.classList.remove('revealing');
                resultImg.src = finalImageUrl;
                void resultImg.offsetWidth; // Trigger reflow for CSS animation
                resultImg.classList.add('revealing');
            }
            if (resultPromptSnippet) {
                resultPromptSnippet.textContent = rawPrompt;
                resultPromptSnippet.title = fullPrompt;
            }
            if (resultModelBadge) {
                resultModelBadge.textContent = selectedModel === 'cloud' 
                    ? selectedCloudProvider.toUpperCase() 
                    : `FLUX ${selectedModel.toUpperCase()}`;
            }

            // Save to recent creations gallery
            saveToStudioHistory(finalImageUrl, rawPrompt);

            // Switch to result container
            setTimeout(() => {
                orbInstance?.destroy();
                if (progressState) progressState.style.display = 'none';
                if (resultContainer) resultContainer.style.display = 'flex';
                isGenerating = false;
                if (generateBtn) generateBtn.disabled = false;
                if (generateText) generateText.textContent = 'Generate Artwork';
            }, 300);

        } catch (err) {
            generationFinished = true;
            clearInterval(interval);
            console.error('Image Studio generation failed:', err);

            orbInstance?.setMode('ring');
            if (progressHeadline) progressHeadline.textContent = 'Generation Failed';
            if (progressSubtext) progressSubtext.textContent = err.message || 'An unexpected error occurred.';
            if (progressBarFill) {
                progressBarFill.style.background = '#EF4444';
                progressBarFill.style.width = '100%';
            }

            setTimeout(() => {
                orbInstance?.destroy();
                if (progressState) progressState.style.display = 'none';
                if (emptyState) emptyState.style.display = 'flex';
                isGenerating = false;
                if (generateBtn) generateBtn.disabled = false;
                if (generateText) generateText.textContent = 'Generate Artwork';
                alert(`AI Image Studio: ${err.message || 'Generation failed. Please try again.'}`);
            }, 1800);
        }
    }

    // 15. Floating Dock Actions
    downloadBtn?.addEventListener('click', () => {
        if (!currentGeneratedUrl) return;
        const a = document.createElement('a');
        a.href = currentGeneratedUrl;
        a.download = `ocal-artwork-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    copyBtn?.addEventListener('click', async () => {
        if (!currentGeneratedUrl) return;
        try {
            if (currentGeneratedUrl.startsWith('data:image/')) {
                const res = await fetch(currentGeneratedUrl);
                const blob = await res.blob();
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            } else {
                await navigator.clipboard.writeText(currentGeneratedUrl);
            }
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
            setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
        } catch (e) {
            navigator.clipboard.writeText(currentGeneratedUrl);
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
            setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
        }
    });

    zoomBtn?.addEventListener('click', () => {
        if (!currentGeneratedUrl || !lightbox) return;
        if (lightboxImg) lightboxImg.src = currentGeneratedUrl;
        if (lightboxCaption) lightboxCaption.textContent = currentGeneratedPrompt;
        lightbox.style.display = 'flex';
    });

    // Remix Feature: mutate seed and add nuanced creative variation
    remixBtn?.addEventListener('click', () => {
        if (isGenerating) return;
        if (seedInput) {
            seedInput.value = Math.floor(Math.random() * 9000000) + 100000;
        }
        const remixModifiers = [
            'alternate angle, dramatic composition variation',
            'atmospheric perspective, hyper-detailed rendering shift',
            'volumetric haze, dynamic contrast variation',
            'photographic depth, subtle color grading shift',
            'intense mood, richer ambient reflections'
        ];
        const chosen = remixModifiers[Math.floor(Math.random() * remixModifiers.length)];
        let currentPrompt = promptInput?.value?.trim() || '';
        if (currentPrompt && !currentPrompt.includes('variation')) {
            promptInput.value = `${currentPrompt}, ${chosen}`;
            updatePromptCounter();
        }
        startImageGeneration();
    });

    lightboxClose?.addEventListener('click', () => {
        if (lightbox) lightbox.style.display = 'none';
    });

    lightboxBackdrop?.addEventListener('click', () => {
        if (lightbox) lightbox.style.display = 'none';
    });

    lightboxDownload?.addEventListener('click', () => {
        downloadBtn?.click();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox && lightbox.style.display === 'flex') {
            lightbox.style.display = 'none';
        }
    });

    chatBtn?.addEventListener('click', () => {
        if (!currentGeneratedUrl) return;
        const queryBox = document.getElementById('ai-query');
        if (queryBox) {
            queryBox.value = `Here is an artwork I generated in AI Studio:\n![${currentGeneratedPrompt.slice(0, 40)}](${currentGeneratedUrl})\n\nTell me what you think about this composition and how to improve it.`;
        }
        switchToChat();
        queryBox?.focus();
    });

    regenBtn?.addEventListener('click', () => {
        if (seedInput) {
            seedInput.value = Math.floor(Math.random() * 9000000) + 100000;
        }
        startImageGeneration();
    });

    // 16. Recent Creations Gallery Persistence
    const HISTORY_KEY = 'ocal_studio_creations';

    function loadStudioHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveToStudioHistory(url, prompt) {
        try {
            let history = loadStudioHistory();
            history = history.filter(item => item.url !== url);
            history.unshift({ url, prompt, timestamp: Date.now() });
            if (history.length > 12) history = history.slice(0, 12);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            renderGallery();
        } catch (e) {}
    }

    function renderGallery() {
        const history = loadStudioHistory();
        if (!gallerySection || !galleryStrip) return;

        if (history.length === 0) {
            gallerySection.style.display = 'none';
            return;
        }

        gallerySection.style.display = 'flex';
        galleryStrip.innerHTML = '';

        history.forEach(item => {
            const thumb = document.createElement('div');
            thumb.className = 'ais-gallery-thumb';
            thumb.title = item.prompt;
            thumb.innerHTML = `<img src="${item.url}" alt="Artwork" loading="lazy">`;
            thumb.addEventListener('click', () => {
                if (promptInput) {
                    promptInput.value = item.prompt;
                    updatePromptCounter();
                }
                currentGeneratedUrl = item.url;
                currentGeneratedPrompt = item.prompt;
                if (resultImg) {
                    resultImg.classList.remove('revealing');
                    resultImg.src = item.url;
                    void resultImg.offsetWidth;
                    resultImg.classList.add('revealing');
                }
                if (resultPromptSnippet) resultPromptSnippet.textContent = item.prompt;
                if (emptyState) emptyState.style.display = 'none';
                if (progressState) progressState.style.display = 'none';
                if (resultContainer) resultContainer.style.display = 'flex';
            });
            galleryStrip.appendChild(thumb);
        });
    }

    galleryClearBtn?.addEventListener('click', () => {
        if (confirm('Clear all recent creations from history?')) {
            localStorage.removeItem(HISTORY_KEY);
            renderGallery();
        }
    });

    // Initial render of gallery & counter
    renderGallery();
    updatePromptCounter();
})();

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
            try {
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
            } catch (err) {
                console.warn("Canvas enhancement skipped due to browser security/CORS, using pristine image URL.", err);
                resolve(imgUrl);
            }
        };
        img.onerror = () => resolve(imgUrl);
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

// ── Libraries.dev FX Suite Initialization ──────────────────────────
(function initLibrariesDevFX() {
    try {
        if (!window.LibrariesDevFX) return;

        // 1. Thinking Orb in AI Header
        const orbContainer = document.getElementById('ai-header-orb-container');
        if (orbContainer) {
            orbContainer.innerHTML = '';
            ocalHeaderOrb = window.LibrariesDevFX.ThinkingOrb.createOrb(orbContainer, {
                size: 34,
                mode: 'orbits',
                speed: 1.5
            });
        }

        // 2. Border Beam around AI Input Container
        const inputContainer = document.getElementById('ai-input-container');
        if (inputContainer) {
            window.LibrariesDevFX.BorderBeam.attach(inputContainer, {
                preset: 'accent',
                duration: '6s',
                width: '2px',
                opacity: '0.85'
            });
        }

        // 3. Border Beam around Image Studio Card
        const studioCard = document.querySelector('.studio-card');
        if (studioCard) {
            window.LibrariesDevFX.BorderBeam.attach(studioCard, {
                preset: 'sunset',
                duration: '8s',
                width: '2px',
                opacity: '0.75'
            });
        }

        // 4. Clean pill containers (complex gooey hover animations removed)

        // 5. Voice Glow & Microphone Integration
        const micBtn = document.getElementById('btnVoiceMic');
        if (micBtn && inputContainer) {
            window.LibrariesDevFX.VoiceGlow.initVoiceInput(micBtn, inputContainer, queryEl);
        }

    } catch (e) {
        console.error('LibrariesDevFX initialization error:', e);
    }
})();

