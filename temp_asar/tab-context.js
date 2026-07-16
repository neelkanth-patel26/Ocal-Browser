// Context Menu Logic

let currentTabId = null;

function addMenuOption(parent, label, icon, onClick, color) {
    const opt = document.createElement('div');
    opt.className = 'menu-option';
    const isFontAwesome = icon && icon.startsWith('fa-');
    const iconHtml = isFontAwesome 
        ? `<i class="fas ${icon}" style="${color ? 'color:'+color : ''}"></i>` 
        : `<span style="font-style:normal; margin-right:8px; font-size:14px; width:16px; text-align:center; display:inline-block;">${icon || ''}</span>`;
    opt.innerHTML = `${iconHtml} <span>${label}</span>`;
    opt.onclick = () => {
        console.log(`[TAB-CONTEXT] Option clicked: "${label}"`);
        onClick();
        console.log(`[TAB-CONTEXT] Option "${label}" onClick executed, sending hide-tab-context`);
        window.electronAPI.send('hide-tab-context');
    };
    parent.appendChild(opt);
}

function addMenuSub(parent, label, icon) {
    const opt = document.createElement('div');
    opt.className = 'menu-option has-sub';
    opt.innerHTML = `<i class="fas ${icon}"></i> <span>${label}</span> <i class="fas fa-chevron-right" style="font-size:8px; margin-left:auto;"></i>`;
    const sub = document.createElement('div');
    sub.className = 'menu-sub';
    opt.appendChild(sub);
    parent.appendChild(opt);
    return sub;
}

function addMenuSeparator(parent) {
    const sep = document.createElement('div');
    sep.className = 'menu-separator';
    parent.appendChild(sep);
}

window.electronAPI.on('render-tab-context', (event, { tabId, groupId, tabGroups }) => {
    currentTabId = tabId;
    const container = document.getElementById('menu-container');
    container.innerHTML = '';

    if (groupId) {
        addMenuOption(container, 'Remove from Group', 'fa-object-ungroup', () => {
            window.electronAPI.send('tab-context-action', { action: 'remove-from-group', tabId });
        });
    } else {
        addMenuOption(container, 'Add to New Group', 'fa-plus', () => {
            window.electronAPI.send('tab-context-action', { action: 'create-tab-group', tabId });
        });

        if (tabGroups && tabGroups.length > 0) {
            const groupSub = addMenuSub(container, 'Add to Existing Group', 'fa-object-group');
            tabGroups.forEach(g => {
                addMenuOption(groupSub, g.name, 'fa-circle', () => {
                    window.electronAPI.send('tab-context-action', { action: 'add-to-group', tabId, groupId: g.id });
                }, g.color);
            });
        }
    }

    addMenuSeparator(container);

    const emojiSub = addMenuSub(container, 'Tab Emoji', 'fa-face-smile');
    
    // Create compact grid element
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    
    const emojis = ['💻', '🏠', '🎮', '🎵', '📚', '✈️', '🍔', '💡', '🔥', '❤️'];
    emojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'emoji-grid-item';
        
        let code = '';
        if (emoji === '💻') code = '1f4bb';
        else if (emoji === '🏠') code = '1f3e0';
        else if (emoji === '🎮') code = '1f3ae';
        else if (emoji === '🎵') code = '1f3b5';
        else if (emoji === '📚') code = '1f4da';
        else if (emoji === '✈️') code = '2708';
        else if (emoji === '🍔') code = '1f354';
        else if (emoji === '💡') code = '1f4a1';
        else if (emoji === '🔥') code = '1f525';
        else if (emoji === '❤️') code = '2764';
        
        if (code) {
            item.innerHTML = `<img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${code}.svg" onerror="this.replaceWith('${emoji}')" style="width:16px; height:16px; display:block;">`;
        } else {
            item.textContent = emoji;
        }

        item.onclick = () => {
            window.electronAPI.send('tab-context-action', { action: 'set-tab-emoji', tabId, emoji });
        };
        grid.appendChild(item);
    });
    emojiSub.appendChild(grid);
    
    addMenuSeparator(emojiSub);
    addMenuOption(emojiSub, 'Clear Emoji', 'fa-trash-can', () => {
        window.electronAPI.send('tab-context-action', { action: 'set-tab-emoji', tabId, emoji: null });
    });

    addMenuSeparator(container);
    addMenuOption(container, 'Close Tab', 'fa-xmark', () => {
        window.electronAPI.send('tab-context-action', { action: 'close-tab', tabId });
    });

    // Notify main of required dimensions initially
    setTimeout(() => {
        const rect = container.getBoundingClientRect();
        window.electronAPI.send('resize-tab-context', { 
            width: rect.width + 20, 
            height: rect.height + 20 
        });

        // Add hover listeners for submenu dynamic resizing
        const subMenus = container.querySelectorAll('.has-sub');
        subMenus.forEach(opt => {
            const sub = opt.querySelector('.menu-sub');
            opt.addEventListener('mouseenter', () => {
                const subRect = sub.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const totalWidth = subRect.right;
                const totalHeight = Math.max(subRect.bottom, containerRect.bottom);
                window.electronAPI.send('resize-tab-context', { 
                    width: totalWidth + 20, 
                    height: totalHeight + 20 
                });
            });
            opt.addEventListener('mouseleave', () => {
                const containerRect = container.getBoundingClientRect();
                window.electronAPI.send('resize-tab-context', { 
                    width: containerRect.width + 20, 
                    height: containerRect.height + 20 
                });
            });
        });
    }, 10);
});
