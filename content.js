// Create and inject the floating button
function createFloatingButton() {
    // Remove any existing buttons first
    const existingButton = document.querySelector('.tox-floating-button');
    if (existingButton) {
        existingButton.remove();
    }

    const button = document.createElement('button');
    button.className = 'tox-floating-button';
    button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .tox-floating-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background-color: #ffffff;
            color: #6366f1;
            border: 2px solid #e5e7eb;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
            user-select: none;
            backdrop-filter: blur(4px);
        }
        
        .tox-floating-button:hover {
            background-color: #f3f4f6;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }
        
        .tox-floating-button:active {
            transform: scale(0.95);
        }
        
        .tox-floating-button svg {
            width: 24px;
            height: 24px;
            pointer-events: none;
        }

        .tox-tooltip {
            position: fixed;
            bottom: 90px;
            right: 20px;
            background-color: #ffffff;
            color: #1f2937;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }

        .tox-tooltip.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .tox-settings-panel {
            position: fixed;
            bottom: 90px;
            right: 20px;
            background-color: #ffffff;
            color: #1f2937;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            min-width: 200px;
        }

        .tox-settings-panel.visible {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        .tox-settings-panel h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 500;
            color: #1f2937;
        }

        .tox-settings-panel label {
            display: block;
            margin-bottom: 8px;
            color: #4b5563;
        }

        .tox-settings-panel input[type="range"] {
            width: 100%;
            margin: 8px 0;
            accent-color: #6366f1;
        }

        .tox-settings-panel .size-value {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
    `;
    document.head.appendChild(style);

    // Load saved settings
    chrome.storage.local.get(['buttonPosition', 'buttonSize'], (result) => {
        if (result.buttonPosition) {
            button.style.bottom = result.buttonPosition.bottom;
            button.style.right = result.buttonPosition.right;
        }
        if (result.buttonSize) {
            button.style.width = `${result.buttonSize}px`;
            button.style.height = `${result.buttonSize}px`;
            const svg = button.querySelector('svg');
            if (svg) {
                const iconSize = Math.max(24, result.buttonSize * 0.4);
                svg.style.width = `${iconSize}px`;
                svg.style.height = `${iconSize}px`;
            }
        }
    });



    // Drag functionality
    let isDragging = false;
    let startX, startY, startBottom, startRight;

    button.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        isDragging = true;
        button.classList.add('dragging');
        
        // Get initial position
        const rect = button.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startBottom = window.innerHeight - rect.bottom;
        startRight = window.innerWidth - rect.right;
        
        // Prevent text selection while dragging
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Calculate new position
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newBottom = startBottom - deltaY;
        let newRight = startRight - deltaX;
        
        // Keep button within viewport
        newBottom = Math.max(0, Math.min(newBottom, window.innerHeight - button.offsetHeight));
        newRight = Math.max(0, Math.min(newRight, window.innerWidth - button.offsetWidth));
        
        // Update position
        button.style.bottom = `${newBottom}px`;
        button.style.right = `${newRight}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        button.classList.remove('dragging');
        
        // Save position
        chrome.storage.local.set({
            buttonPosition: {
                bottom: button.style.bottom,
                right: button.style.right
            }
        });
    });

    // Add click handler
    button.addEventListener('click', async (e) => {
        // Only trigger if not dragging and not right-click
        if (isDragging || e.button === 2) return;
        
        try {
            // Get clipboard content
            const text = await navigator.clipboard.readText();
            
            if (!text) {
                showTooltip('Clipboard is empty');
                return;
            }
            
            // Get webhooks from storage
            const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
            
            if (!webhooks || webhooks.length === 0) {
                showTooltip('No webhooks configured');
                return;
            }

            // Send to all webhooks
            const sendPromises = webhooks.map(webhook => 
                fetch(webhook.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: text,
                        username: 'Tox Clipboard'
                    })
                })
            );

            try {
                const results = await Promise.allSettled(sendPromises);
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                
                if (successCount > 0) {
                    showTooltip(`Sent to ${successCount} webhook${successCount > 1 ? 's' : ''}!`);
                    
                    // Save to history
                    chrome.storage.local.get(['caHistory'], (result) => {
                        const history = result.caHistory || [];
                        history.unshift({
                            text,
                            timestamp: new Date().toISOString()
                        });
                        // Keep only last 50 items
                        if (history.length > 50) history.pop();
                        chrome.storage.local.set({ caHistory: history });
                    });
                } else {
                    showTooltip('Failed to send to any webhook');
                }
            } catch (error) {
                console.error('Error sending to webhooks:', error);
                showTooltip('Failed to send');
            }
        } catch (error) {
            console.error('Error:', error);
            showTooltip('Error: Check console');
        }
    });

    document.body.appendChild(button);
}

// Show tooltip
function showTooltip(message) {
    let tooltip = document.querySelector('.tox-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tox-tooltip';
        document.body.appendChild(tooltip);
    }

    tooltip.textContent = message;
    tooltip.classList.add('visible');

    setTimeout(() => {
        tooltip.classList.remove('visible');
    }, 2000);
}


// Listen for changes to clipboard monitoring setting
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.clipboardMonitor) {
        if (changes.clipboardMonitor.newValue) {
            startClipboardMonitoring();
        } else {
            stopClipboardMonitoring();
        }
    }
});

let clipboardInterval;
let lastClipboardContent = '';

function startClipboardMonitoring() {
    if (clipboardInterval) return;

    clipboardInterval = setInterval(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text !== lastClipboardContent) {
                lastClipboardContent = text;
                await sendToWebhooks(text);
                await updateHistory(text);
            }
        } catch (error) {
            console.error('Error reading clipboard:', error);
        }
    }, 1000);
}

function stopClipboardMonitoring() {
    if (clipboardInterval) {
        clearInterval(clipboardInterval);
        clipboardInterval = null;
    }
}

async function sendToWebhooks(content) {
    try {
        const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
        if (webhooks.length === 0) return;

        const promises = webhooks.map(webhook => 
            fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content
                })
            })
        );

        await Promise.all(promises);
        showNotification('Content sent to webhooks');
    } catch (error) {
        console.error('Error sending to webhooks:', error);
        showNotification('Failed to send content to webhooks', true);
    }
}

async function updateHistory(content) {
    try {
        const { history = [] } = await chrome.storage.local.get(['history']);
        const newHistory = [
            { content, timestamp: Date.now() },
            ...history.slice(0, 49)
        ];
        await chrome.storage.local.set({ history: newHistory });
    } catch (error) {
        console.error('Error updating history:', error);
    }
}

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `tox-notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .tox-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 14px;
        z-index: 999999;
        opacity: 1;
        transition: opacity 0.3s ease;
    }
    .tox-notification.success {
        background-color: #4CAF50;
    }
    .tox-notification.error {
        background-color: #f44336;
    }
    .tox-notification.fade-out {
        opacity: 0;
    }
`;
document.head.appendChild(style);

// Create and add the share button
function createShareButton() {
    const button = document.createElement('button');
    button.id = 'tox-share-button';
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>
        Share
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #tox-share-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background-color: #6366f1;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            z-index: 999999;
            transition: all 0.2s;
        }
        
        #tox-share-button:hover {
            background-color: #4f46e5;
        }
        
        #tox-share-button svg {
            width: 16px;
            height: 16px;
        }
        
        .tox-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            font-size: 14px;
            z-index: 999999;
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .tox-notification.success {
            background-color: #4CAF50;
        }
        
        .tox-notification.error {
            background-color: #f44336;
        }
        
        .tox-notification.fade-out {
            opacity: 0;
        }
    `;
    document.head.appendChild(style);
    
    // Add click handler
    button.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                await sendToWebhooks(text);
                await updateHistory(text);
                showNotification('Content shared successfully');
            } else {
                showNotification('No content in clipboard', true);
            }
        } catch (error) {
            console.error('Error reading clipboard:', error);
            showNotification('Failed to share content', true);
        }
    });
    
    document.body.appendChild(button);
}

// Initialize
createFloatingButton();
createShareButton(); 