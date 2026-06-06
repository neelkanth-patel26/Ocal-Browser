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

// Quick Tools
const toolSummarize = document.getElementById('tool-summarize');
const toolEmail = document.getElementById('tool-email');

// Configure Highlight.js
hljs.configure({ ignoreUnescapedHTML: true });

// Configure Marked (Standard V9+ Parsing)
const renderer = new marked.Renderer();
marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
});

// Helper: Scroll to bottom
const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
};

const renderMarkdown = (text) => {
    let html = marked.parse(text);
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
        container.innerHTML = renderMarkdown(currentText);
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, speed + Math.random() * 20));
    }
    
    // Final Markdown Render
    container.innerHTML = renderMarkdown(text);
    
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
        contentDiv.textContent = content;
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
    const q = (customQuery || queryEl.value).trim();
    if (!q) return;

    if (!customQuery) {
        queryEl.value = '';
        queryEl.style.height = 'auto';
    }

    await addMessage(q, true);
    showThinking();

    try {
        const response = await window.electronAPI.invoke('ai-agent-execute', q);
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
        let model = s.localModel || 'auto';
        if (model === 'auto') {
            const endpoint = s.localEndpoint || 'http://localhost:11434';
            try {
                const url = `${endpoint.replace(/\/$/, '')}/api/tags`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data.models && data.models.length > 0) {
                        model = data.models[0].name;
                    } else {
                        model = 'Heuristics';
                    }
                } else {
                    model = 'Heuristics';
                }
            } catch (e) {
                model = 'Heuristics';
            }
        }
        label = `Local: ${model}`;
    }
    
    badge.textContent = label;
    badge.style.display = 'inline-block';
}

// Listen for global settings changes
window.electronAPI.on('settings-changed', (e, s) => {
    if (s && s.accentColor) applyAccent(s.accentColor);
    if (s && s.themeMode) document.body.setAttribute('data-theme', s.themeMode);
    if (s) updateActiveModelBadge(s);
});

// Get initial settings on load
window.electronAPI.invoke('get-settings').then(s => {
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

