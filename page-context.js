// Page Context Menu Logic - Modern, Shadowless, Home Page Matching Bento Aesthetic

const container = document.getElementById('page-context-container');
let currentContextData = null;

function addOption(parent, label, icon, shortcut, onClick, extraClass = '', disabled = false) {
    const opt = document.createElement('div');
    opt.className = `menu-option ${extraClass} ${disabled ? 'disabled' : ''}`.trim();
    
    let iconHtml = '';
    if (icon) {
        if (icon.startsWith('fab ') || icon.startsWith('fas ') || icon.startsWith('fa-')) {
            const cls = icon.includes(' ') ? icon : `fas ${icon}`;
            iconHtml = `<div class="menu-icon-wrap"><i class="${cls}"></i></div>`;
        } else {
            iconHtml = `<div class="menu-icon-wrap"><i>${icon}</i></div>`;
        }
    } else {
        iconHtml = `<div class="menu-icon-wrap"></div>`;
    }

    const labelHtml = `<span class="menu-label">${label}</span>`;
    const shortcutHtml = shortcut ? `<span class="menu-shortcut"><kbd>${shortcut}</kbd></span>` : '';

    opt.innerHTML = `${iconHtml}${labelHtml}${shortcutHtml}`;

    if (!disabled) {
        opt.onclick = (e) => {
            e.stopPropagation();
            if (typeof onClick === 'function') {
                onClick();
            }
        };
    }

    parent.appendChild(opt);
    return opt;
}

function addSeparator(parent) {
    const sep = document.createElement('div');
    sep.className = 'menu-separator';
    parent.appendChild(sep);
}

function sendAction(action, payload = {}) {
    window.electronAPI?.send?.('page-context-action', {
        action,
        targetContentsId: currentContextData ? currentContextData.targetContentsId : null,
        ...payload
    });
}

window.electronAPI?.on?.('render-page-context', (event, data) => {
    currentContextData = data;
    if (typeof window.applyThemeSettings === 'function' && data) {
        window.applyThemeSettings(data);
    }
    container.innerHTML = '';

    let hasPriorSection = false;

    // 1. Spelling Suggestions
    if (data.misspelledWord) {
        if (data.dictionarySuggestions && data.dictionarySuggestions.length > 0) {
            data.dictionarySuggestions.slice(0, 4).forEach(sug => {
                addOption(container, sug, 'fa-spell-check', '', () => {
                    sendAction('replace-misspelling', { suggestion: sug });
                }, 'ai-special');
            });
        }
        addOption(container, `Add "${data.misspelledWord}" to Dictionary`, 'fa-book', '', () => {
            sendAction('add-to-dictionary', { word: data.misspelledWord });
        });
        hasPriorSection = true;
    }

    // 2. Selection Actions
    if (data.selectionText && data.selectionText.trim()) {
        if (hasPriorSection) addSeparator(container);
        const text = data.selectionText.trim();
        const shortText = text.length > 20 ? text.substring(0, 20) + '...' : text;

        addOption(container, 'Copy', 'fa-copy', 'Ctrl+C', () => {
            sendAction('copy', { text });
        });

        if (!data.isPrivate) {
            addOption(container, `Ask Ocal AI about "${shortText}"`, 'fa-wand-magic-sparkles', '', () => {
                sendAction('ask-ocal-ai', { text });
            }, 'ai-special');
        }

        addOption(container, `Search Google for "${shortText}"`, 'fab fa-google', '', () => {
            sendAction('search-google', { text });
        });

        hasPriorSection = true;
    }

    // 3. Link Actions
    if (data.linkURL) {
        if (hasPriorSection) addSeparator(container);
        addOption(container, 'Open Link in New Tab', 'fa-arrow-up-right-from-square', '', () => {
            sendAction('open-link-new-tab', { linkUrl: data.linkURL });
        });
        if (!data.isPrivate) {
            addOption(container, 'Open Link in Private Window', 'fa-user-secret', '', () => {
                sendAction('open-link-private-window', { linkUrl: data.linkURL });
            });
            addOption(container, 'Open Link in Split View', 'fa-table-columns', '', () => {
                sendAction('open-link-split', { linkUrl: data.linkURL });
            });
        }
        addOption(container, 'Copy Link Address', 'fa-link', '', () => {
            sendAction('copy-link-address', { linkUrl: data.linkURL });
        });
        hasPriorSection = true;
    }

    // 4. Image Actions
    if (data.mediaType === 'image' && data.srcURL) {
        if (hasPriorSection) addSeparator(container);
        addOption(container, 'Open Image in New Tab', 'fa-image', '', () => {
            sendAction('open-image-new-tab', { srcUrl: data.srcURL });
        });
        addOption(container, 'Copy Image', 'fa-clone', '', () => {
            sendAction('copy-image', { inspectX: data.x, inspectY: data.y });
        });
        addOption(container, 'Copy Image Address', 'fa-link', '', () => {
            sendAction('copy-image-address', { srcUrl: data.srcURL });
        });
        addOption(container, 'Save Image As...', 'fa-download', '', () => {
            sendAction('save-image-as', { srcUrl: data.srcURL });
        });
        addSeparator(container);
        addOption(container, 'Search with Google Lens', 'fa-camera', '', () => {
            sendAction('search-lens', { srcUrl: data.srcURL });
        });
        hasPriorSection = true;
    }

    // 5. Editable Actions
    if (data.isEditable) {
        if (hasPriorSection) addSeparator(container);
        addOption(container, 'Undo', 'fa-rotate-left', 'Ctrl+Z', () => sendAction('undo'));
        addOption(container, 'Redo', 'fa-rotate-right', 'Ctrl+Y', () => sendAction('redo'));
        addSeparator(container);
        addOption(container, 'Cut', 'fa-scissors', 'Ctrl+X', () => sendAction('cut'));
        addOption(container, 'Copy', 'fa-copy', 'Ctrl+C', () => sendAction('copy'));
        addOption(container, 'Paste', 'fa-paste', 'Ctrl+V', () => sendAction('paste'));
        addOption(container, 'Paste and Match Style', 'fa-file-lines', 'Ctrl+Shift+V', () => sendAction('paste-and-match-style'));
        addSeparator(container);
        addOption(container, 'Select All', 'fa-check-double', 'Ctrl+A', () => sendAction('select-all'));
        hasPriorSection = true;
    }

    // 6. Navigation & Page Actions (when not clicking on an image or link alone)
    if (!data.linkURL && data.mediaType !== 'image') {
        if (hasPriorSection) addSeparator(container);
        addOption(container, 'Back', 'fa-arrow-left', 'Alt+Left', () => sendAction('back'), '', !data.canGoBack);
        addOption(container, 'Forward', 'fa-arrow-right', 'Alt+Right', () => sendAction('forward'), '', !data.canGoForward);
        addOption(container, 'Reload', 'fa-rotate-right', 'Ctrl+R', () => sendAction('reload'));
        addSeparator(container);
        if (!data.isPrivate) {
            addOption(container, 'New Private Window', 'fa-user-secret', 'Ctrl+Shift+N', () => sendAction('open-private-window'));
        }
        addOption(container, 'Print...', 'fa-print', 'Ctrl+P', () => sendAction('print'));

        if (!data.isLocal) {
            addOption(container, 'View Page Source', 'fa-code', 'Ctrl+U', () => {
                sendAction('view-source', { url: data.pageUrl });
            });
        }
        hasPriorSection = true;
    }

    // 7. Developer Tools - Inspect Element
    if (!data.isLocal) {
        addSeparator(container);
        addOption(container, 'Inspect Element', 'fa-terminal', 'Ctrl+Shift+I', () => {
            sendAction('inspect-element', { inspectX: data.x, inspectY: data.y });
        });
    }

    // Measure required size and send resize IPC
    requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        window.electronAPI?.send?.('resize-page-context', {
            width: Math.ceil(rect.width) + 14,
            height: Math.ceil(rect.height) + 14
        });
    });
});
