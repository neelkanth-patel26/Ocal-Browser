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
const toolTabs = document.getElementById('tool-tabs');
const toolSearch = document.getElementById('tool-search');
const toolExplain = document.getElementById('tool-explain');

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

// Helper: Typing Animation
const typeMessage = async (container, text, speed = 15) => {
    let currentText = '';
    const words = text.split(' ');
    
    // Smoothly reveal words for an "intelligent" feel
    for (const word of words) {
        currentText += (currentText === '' ? '' : ' ') + word;
        container.innerHTML = currentText.replace(/\n/g, '<br>');
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, speed + Math.random() * 20));
    }
    
    // Final Markdown Render
    let html = marked.parse(text);
    
    // GFM Alert Parsing (Post-process)
    html = html.replace(/<blockquote>\s*<p>\[!NOTE\]/gi, '<div class="alert alert-note"><p>')
               .replace(/<blockquote>\s*<p>\[!TIP\]/gi, '<div class="alert alert-tip"><p>')
               .replace(/<blockquote>\s*<p>\[!IMPORTANT\]/gi, '<div class="alert alert-important"><p>')
               .replace(/<\/p>\s*<\/blockquote>/gi, '</p></div>');
    
    container.innerHTML = html;
    
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
            actionEl.className = 'agent-action';
            actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-cog fa-spin'}"></i> ${action.text}`;
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
toolExplain?.addEventListener('click', () => handleSend("Please explain what this page is about in detail."));
toolTabs?.addEventListener('click', () => handleSend("List all my open tabs."));
toolSearch?.addEventListener('click', () => handleSend("Perform a Deep Search for information. What would you like me to find?"));

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
}

// Listen for global settings changes
window.electronAPI.on('settings-changed', (e, s) => {
    if (s && s.accentColor) applyAccent(s.accentColor);
});

// Get initial settings on load
window.electronAPI.invoke('get-settings').then(s => {
    if (s && s.accentColor) applyAccent(s.accentColor);
});

// Global Agent Actions
window.electronAPI.on('ai-agent-action', (e, action) => {
    const actionEl = document.createElement('div');
    actionEl.className = 'agent-action';
    actionEl.innerHTML = `<i class="fas ${action.icon || 'fa-bolt'}"></i> ${action.text}`;
    messagesEl.appendChild(actionEl);
    scrollToBottom();
});
