// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup initialized');
    initializePopup();
});

async function initializePopup() {
    try {
        await initializeUserInfo();
        await loadWebhooks();
        await loadHistory();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
}

// Initialize user info
async function initializeUserInfo() {
    console.log('Initializing user info');
    try {
        const { username = 'Guest', userAvatar = 'U', groupId = '' } = 
            await chrome.storage.local.get(['username', 'userAvatar', 'groupId']);
        
        const statusElem = document.getElementById('userStatus');
        const avatarElem = document.getElementById('userAvatar');
        const groupDisplay = document.getElementById('groupDisplay');
        
        if (statusElem) statusElem.textContent = username;
        if (avatarElem) avatarElem.textContent = userAvatar;
        if (groupDisplay) groupDisplay.textContent = groupId ? `Group: ${groupId}` : 'No Group';
        
        console.log('User info initialized:', { username, groupId });
    } catch (error) {
        console.error('Error initializing user info:', error);
    }
}

// Load webhooks
async function loadWebhooks() {
    try {
        const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
        const webhooksList = document.getElementById('webhooksList');
        
        if (!webhooksList) {
            console.error('Webhooks list element not found');
            return;
        }
        
        if (webhooks.length === 0) {
            webhooksList.innerHTML = '<div class="empty-state">No webhooks added</div>';
            return;
        }
        
        webhooksList.innerHTML = webhooks.map(webhook => `
            <div class="webhook-item">
                <div class="webhook-info">
                    <div class="webhook-name">${escapeHtml(webhook.name)}</div>
                </div>
                <button class="delete-webhook" data-url="${escapeHtml(webhook.url)}">Delete</button>
            </div>
        `).join('');

        // Add delete webhook handlers
        const deleteButtons = webhooksList.querySelectorAll('.delete-webhook');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const url = button.dataset.url;
                const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
                const newWebhooks = webhooks.filter(w => w.url !== url);
                await chrome.storage.local.set({ webhooks: newWebhooks });
                await loadWebhooks();
            });
        });
    } catch (error) {
        console.error('Error loading webhooks:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Add webhook
    const addWebhookBtn = document.getElementById('addWebhook');
    const webhookName = document.getElementById('webhookName');
    const webhookUrl = document.getElementById('webhookUrl');
    const webhookStatus = document.getElementById('webhookStatus');
    
    if (addWebhookBtn && webhookName && webhookUrl && webhookStatus) {
        addWebhookBtn.addEventListener('click', async () => {
            console.log('Add webhook button clicked');
            const name = webhookName.value.trim();
            const url = webhookUrl.value.trim();
            
            if (!name || !url) {
                showStatus(webhookStatus, 'Please enter both name and URL', 'error');
                return;
            }
            
            try {
                // Test webhook
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: '🔄 Testing webhook connection...',
                        username: 'Tox'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Save webhook
                const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
                if (webhooks.some(w => w.url === url)) {
                    showStatus(webhookStatus, 'This webhook is already added', 'error');
                    return;
                }
                
                webhooks.push({ name, url });
                await chrome.storage.local.set({ webhooks });
                
                // Clear inputs and reload list
                webhookName.value = '';
                webhookUrl.value = '';
                await loadWebhooks();
                showStatus(webhookStatus, 'Webhook added successfully', 'success');
            } catch (error) {
                console.error('Error adding webhook:', error);
                showStatus(webhookStatus, `Error: ${error.message}`, 'error');
            }
        });
    }
    
    // Join group
    const joinGroupBtn = document.getElementById('joinGroup');
    const groupIdInput = document.getElementById('groupIdInput');
    const groupStatus = document.getElementById('groupStatus');
    
    if (joinGroupBtn && groupIdInput && groupStatus) {
        joinGroupBtn.addEventListener('click', async () => {
            console.log('Join group button clicked');
            const groupId = groupIdInput.value.trim();
            
            if (!groupId) {
                showStatus(groupStatus, 'Please enter a group ID', 'error');
                return;
            }
            
            try {
                // Show connecting status
                showStatus(groupStatus, 'Saving group ID...', 'pending');
                
                // Skip connection test and directly save the group ID
                await chrome.storage.local.set({ groupId });
                
                // Update UI
                const groupDisplay = document.getElementById('groupDisplay');
                if (groupDisplay) {
                    groupDisplay.textContent = `Group: ${groupId}`;
                }
                
                // Clear input and show success
                groupIdInput.value = '';
                showStatus(groupStatus, 'Joined group successfully', 'success');
                
                console.log('Group joined successfully:', groupId);
                
                // Try to run the connection test in the background (don't wait for it)
                try {
                    chrome.runtime.sendMessage({
                        action: 'testGroupConnection',
                        data: { groupId }
                    }, response => {
                        console.log('Background connection test result:', response);
                    });
                } catch (testError) {
                    console.warn('Background test failed (ignoring):', testError);
                }
            } catch (error) {
                console.error('Error joining group:', error);
                showStatus(groupStatus, `Error: ${error.message}`, 'error');
            }
        });
    }
}

// Load history
async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get(['history']);
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No history available</div>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-content">${escapeHtml(item.content)}</div>
            <div class="history-timestamp">${formatTimestamp(item.timestamp)}</div>
        </div>
    `).join('');
}

// Helper function to show status messages
function showStatus(element, message, type) {
    if (!element) {
        console.error('Status element not found');
        return;
    }
    
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
    
    // Only auto-hide for success and error messages, not for pending status
    if (type !== 'pending') {
        setTimeout(() => {
            // Fade out effect
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                element.style.opacity = '1';
            }, 300);
        }, 3000);
    }
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
} 