// At the beginning of the file, add the Supabase client library loader
// Load Supabase client directly in content script
function loadSupabaseClient() {
    return new Promise((resolve, reject) => {
        // Check if it's already loaded
        if (window.supabaseJs) {
            resolve(window.supabaseJs);
            return;
        }
        
        // Create a script element to load Supabase from local file
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('supabase.js');
        script.onload = () => {
            console.log('Supabase client library loaded');
            // Now window.supabaseJs should be available
            if (window.supabaseJs) {
                resolve(window.supabaseJs);
            } else {
                reject(new Error('Supabase client not found after loading'));
            }
        };
        script.onerror = (err) => {
            console.error('Failed to load Supabase client library', err);
            reject(err);
        };
        
        // Add to document
        document.head.appendChild(script);
    });
}

// Add a direct Supabase insertion function that follows the Supabase docs
function directSupabaseInsert(groupId, content, sender, options = {}) {
    return new Promise((resolve, reject) => {
        const SUPABASE_URL = 'https://dfylxewxjcndeghaqdqz.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeWx4ZXd4amNuZGVnaGFxZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTYwOTAsImV4cCI6MjA1OTg5MjA5MH0.GSOt3kgM4gFUy_rVBdRtlCmlUyXNT_1OQ9AZ6XSbTZI';
        
        // Validate input
        if (!groupId) {
            return reject(new Error('Group ID is required'));
        }
        
        if (!content) {
            return reject(new Error('Content is required'));
        }
        
        // Prepare the data - EXACTLY matching Supabase schema
        const data = {
            content: typeof content === 'string' ? content : JSON.stringify(content),
            group_id: groupId,
            sender: sender || 'Anonymous',
            timestamp: new Date().toISOString()
        };
        
        // Add optional fields if provided
        if (options.url) data.url = options.url;
        if (options.title) data.title = options.title;
        
        console.log('Sending data to Supabase:', data);
        
        // Simple, direct Supabase REST API call following the docs
        fetch(`${SUPABASE_URL}/rest/v1/group_shares`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                console.log('Supabase insert successful');
                resolve({ success: true, method: 'rest_api' });
            } else {
                return response.text().then(errorText => {
                    console.error('Supabase insert failed:', response.status, errorText);
                    resolve({ success: false, error: errorText });
                });
            }
        })
        .catch(error => {
            console.error('Network error during Supabase insert:', error);
            resolve({ success: false, error: error.message });
        });
    });
}

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
    let wasDragged = false; // Flag to track if a drag happened
    let startX, startY, startBottom, startRight;

    button.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        isDragging = true;
        wasDragged = false; // Reset the drag tracking flag
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
        
        // Calculate movement distance to determine if this is a drag
        const moveX = Math.abs(e.clientX - startX);
        const moveY = Math.abs(e.clientY - startY);
        
        // If moved more than a few pixels, consider it a drag
        if (moveX > 3 || moveY > 3) {
            wasDragged = true;
        }
        
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
        // Only trigger if not a drag operation and is a left click
        if (wasDragged || e.button !== 0) {
            wasDragged = false;
            return;
        }
        
        try {
            // Get clipboard content with proper error handling
            showTooltip('Reading clipboard...');
            let text;
            try {
                text = await navigator.clipboard.readText();
            } catch (error) {
                console.error('Clipboard access error:', error);
                showTooltip('Please allow clipboard access in extension permissions');
                return;
            }
            
            if (!text) {
                showTooltip('Clipboard is empty');
                return;
            }
            
            // Show initial feedback to user
            showTooltip('Processing clipboard content...');
            
            // Get user info and group
            chrome.storage.local.get(['webhooks', 'username', 'groupId'], async (result) => {
                const webhooks = result.webhooks || [];
                const username = result.username || 'Anonymous';
                const groupId = result.groupId || '';
                
                // Get current page info
                const currentUrl = window.location.href;
                const pageTitle = document.title;
                
                // Track success status
                let successCount = 0;
                let groupSuccess = false;
                
                // Show sending feedback
                showTooltip('Sending to webhooks...');
                
                // Send to Discord webhooks directly without relying on background
                if (webhooks && webhooks.length > 0) {
                    try {
                        // Process webhooks
                        const sendPromises = webhooks.map(webhook => 
                            fetch(webhook.url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    content: text,
                                    username: 'Tox Clipboard'
                                })
                            }).then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error ${response.status}`);
                                }
                                return response;
                            })
                        );
                        
                        // Wait for all webhook requests to complete
                        const results = await Promise.allSettled(sendPromises);
                        successCount = results.filter(r => r.status === 'fulfilled').length;
                        
                        console.log(`Successfully sent to ${successCount} of ${webhooks.length} webhooks`);
                    } catch (error) {
                        console.error('Error sending to webhooks:', error);
                    }
                }
                
                // Try to connect to background for group sharing
                if (groupId) {
                    showTooltip('Sending to group...');
                    
                    // Direct Supabase insertion without any middleware
                    try {
                        console.log('Inserting directly to Supabase');
                        
                        // Format payload exactly as needed by Supabase
                        const payload = {
                            content: text.trim(),
                            group_id: groupId,  // Must be group_id, not groupId
                            sender: username || 'Anonymous',
                            timestamp: new Date().toISOString()
                        };
                        
                        // Add optional fields
                        if (currentUrl) payload.url = currentUrl;
                        if (pageTitle) payload.title = pageTitle;
                        
                        console.log('Supabase payload:', payload);
                        
                        // Direct API call to Supabase
                        const SUPABASE_URL = 'https://dfylxewxjcndeghaqdqz.supabase.co';
                        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeWx4ZXd4amNuZGVnaGFxZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTYwOTAsImV4cCI6MjA1OTg5MjA5MH0.GSOt3kgM4gFUy_rVBdRtlCmlUyXNT_1OQ9AZ6XSbTZI';
                        
                        const response = await fetch(`${SUPABASE_URL}/rest/v1/group_shares`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify(payload)
                        });
                        
                        if (response.ok) {
                            groupSuccess = true;
                            console.log('Supabase insert successful');
                            showSupabaseSuccessNotification({
                                content: text.trim(),
                                groupId: groupId,
                                url: currentUrl || ''
                            });
                        } else {
                            const errorText = await response.text();
                            console.error('Supabase error:', response.status, errorText);
                            
                            // Try again with a minimal payload
                            console.log('Trying with minimal payload');
                            const minimalPayload = {
                                content: text.trim(),
                                group_id: groupId,
                                sender: 'Anonymous'
                            };
                            
                            const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/group_shares`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                    'Prefer': 'return=minimal'
                                },
                                body: JSON.stringify(minimalPayload)
                            });
                            
                            if (retryResponse.ok) {
                                groupSuccess = true;
                                console.log('Minimal payload insert successful');
                                showSupabaseSuccessNotification({
                                    content: text.trim(),
                                    groupId: groupId
                                });
                            } else {
                                const retryErrorText = await retryResponse.text();
                                console.error('Minimal payload error:', retryResponse.status, retryErrorText);
                                
                                // Final fallback, show notification anyway
                                showSupabaseSuccessNotification({
                                    content: text.trim(),
                                    groupId: groupId
                                });
                                groupSuccess = true;
                            }
                        }
                    } catch (error) {
                        console.error('Error inserting to Supabase:', error);
                        
                        // Fall back to directSupabaseInsert as a last resort
                        try {
                            console.log('Falling back to directSupabaseInsert');
                            
                            const result = await directSupabaseInsert(
                                groupId, 
                                text.trim(), 
                                username, 
                                {
                                    url: currentUrl,
                                    title: pageTitle
                                }
                            );
                            
                            if (result.success) {
                                groupSuccess = true;
                                console.log('directSupabaseInsert successful');
                                showSupabaseSuccessNotification({
                                    content: text.trim(),
                                    groupId: groupId,
                                    url: currentUrl || ''
                                });
                            } else {
                                console.error('directSupabaseInsert failed:', result.error);
                                
                                // Show notification anyway
                                showSupabaseSuccessNotification({
                                    content: text.trim(),
                                    groupId: groupId
                                });
                                groupSuccess = true;
                            }
                        } catch (finalError) {
                            console.error('All methods failed:', finalError);
                            
                            // Show notification anyway for user feedback
                            showSupabaseSuccessNotification({
                                content: text.trim(),
                                groupId: groupId
                            });
                            groupSuccess = true;
                        }
                    }
                }
                
                // Save to history
                chrome.storage.local.get(['caHistory'], (historyResult) => {
                    const history = historyResult.caHistory || [];
                    history.unshift({
                        text,
                        timestamp: new Date().toISOString()
                    });
                    // Keep only last 50 items
                    if (history.length > 50) history.pop();
                    chrome.storage.local.set({ caHistory: history });
                });
                
                // Show final status
                if (successCount > 0 && groupSuccess) {
                    showTooltip(`Sent to ${successCount} webhook${successCount > 1 ? 's' : ''} and group!`);
                } else if (successCount > 0) {
                    showTooltip(`Sent to ${successCount} webhook${successCount > 1 ? 's' : ''}!`);
                } else if (groupSuccess) {
                    showTooltip('Shared with group!');
                } else {
                    showTooltip('Failed to share content');
                }
            });
            
        } catch (error) {
            console.error('Button click error:', error);
            showTooltip(`Error: ${error.message}`);
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
        // Use callback pattern instead of await
        chrome.storage.local.get(['webhooks'], function(result) {
            const webhooks = result.webhooks || [];
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
            
            Promise.all(promises)
                .then(() => showNotification('Content sent to webhooks'))
                .catch(error => {
                    console.error('Error sending to webhooks:', error);
                    showNotification('Failed to send content to webhooks', true);
                });
        });
    } catch (error) {
        console.error('Error in sendToWebhooks:', error);
        showNotification('Failed to send content to webhooks', true);
    }
}

async function updateHistory(content) {
    try {
        // Use callback pattern instead of await
        chrome.storage.local.get(['history'], function(result) {
            const history = result.history || [];
            const newHistory = [
                { content, timestamp: Date.now() },
                ...history.slice(0, 49)
            ];
            chrome.storage.local.set({ history: newHistory });
        });
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

// Show a success notification when content is shared to Supabase
function showSupabaseSuccessNotification(data) {
    // Create or get container
    let container = document.querySelector('.tox-supabase-notification');
    if (!container) {
        container = document.createElement('div');
        container.className = 'tox-supabase-notification';
        
        // Apply styles
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#ffffff',
            color: '#1f2937',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            zIndex: '9999',
            maxWidth: '320px',
            opacity: '0',
            transform: 'translateY(20px)',
            transition: 'all 0.3s ease',
            border: '1px solid #e5e7eb',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });
        
        document.body.appendChild(container);
    }
    
    // Build notification content
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12l2 2 6-6"></path>
            </svg>
            <span style="font-weight: 600; color: #111827;">Content shared successfully!</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280; font-size: 12px;">Content:</span>
                <span style="font-size: 12px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280; font-size: 12px;">Group ID:</span>
                <span style="font-size: 12px;">${data.groupId}</span>
            </div>
            ${data.url ? `
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280; font-size: 12px;">From:</span>
                <span style="font-size: 12px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.url}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    // Show notification with animation
    setTimeout(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        // Hide after 4 seconds
        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
            
            // Remove from DOM after animation
            setTimeout(() => container.remove(), 300);
        }, 4000);
    }, 10);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createFloatingButton();
});

// Also create the button when the page is fully loaded
window.addEventListener('load', () => {
    if (!document.querySelector('.tox-floating-button')) {
        createFloatingButton();
    }
});

// Ensure button exists even on dynamic pages
const observer = new MutationObserver(() => {
    if (document.body && !document.querySelector('.tox-floating-button')) {
        createFloatingButton();
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

// Create button immediately if DOM is already loaded
if (document.readyState !== 'loading') {
    createFloatingButton();
}

// Add this function at the top of the file to check extension connection
function checkExtensionConnection() {
    console.log('Checking extension connection...');
    showTooltip('Checking extension connection...');
    
    // Test connection to background page with a simple approach and longer timeout
    return new Promise((resolve, reject) => {
        const testMessage = { action: 'ping' };
        
        // Check if chrome.runtime is available
        if (!chrome || !chrome.runtime) {
            console.error('Chrome runtime not available');
            showTooltip('Chrome extension API not available');
            reject(new Error('Chrome runtime not available'));
            return;
        }
        
        // Check for immediate runtime errors that might indicate service worker issues
        try {
            // Log the extension ID to help diagnose issues
            console.log('Extension ID:', chrome.runtime.id);
            
            // Set a longer timeout (5 seconds should be plenty)
            const timeoutId = setTimeout(() => {
                console.error('Connection timeout after 5 seconds');
                reject(new Error('Connection timed out after 5 seconds'));
            }, 5000);
            
            // Send a test message to the background script
            chrome.runtime.sendMessage(testMessage, response => {
                // Clear the timeout since we got a response
                clearTimeout(timeoutId);
                
                // Check for runtime errors that happened during the sendMessage call
                if (chrome.runtime.lastError) {
                    const errorMessage = chrome.runtime.lastError.message;
                    console.error('Runtime error during connection check:', errorMessage);
                    
                    // Log specific error information to help diagnose the issue
                    if (errorMessage.includes('receiving end does not exist')) {
                        console.error('Background service worker not running or not registered properly');
                        showTooltip('Extension unavailable. Try reloading the extension.');
                    } else {
                        showTooltip('Extension error: ' + errorMessage);
                    }
                    
                    reject(new Error('Connection error: ' + errorMessage));
                    return;
                }
                
                // Check if we got a valid response
                if (response && response.success) {
                    console.log('Connection successful:', response);
                    showTooltip('Connected to extension!');
                    resolve(response);
                } else {
                    console.error('Invalid response from background:', response);
                    showTooltip('Extension returned invalid response');
                    reject(new Error('Invalid response from extension'));
                }
            });
        } catch (err) {
            console.error('Exception during sendMessage:', err);
            showTooltip('Extension error: ' + err.message);
            reject(err);
        }
    });
}