// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await initializeUserInfo();
    await loadWebhooks();
    await loadHistory();
    setupEventListeners();
});

// Initialize user info
async function initializeUserInfo() {
    const { username = 'Guest', userAvatar = 'U', groupId = '' } = 
        await chrome.storage.local.get(['username', 'userAvatar', 'groupId']);
    
    document.getElementById('userStatus').textContent = username;
    document.getElementById('userAvatar').textContent = userAvatar;
    
    // Display group info
    const groupDisplay = document.getElementById('groupDisplay');
    groupDisplay.textContent = groupId ? `Group: ${groupId}` : 'No Group';
}

// Load webhooks
async function loadWebhooks() {
    const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
    const webhooksList = document.getElementById('webhooksList');
    
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
}

// Setup event listeners
function setupEventListeners() {
    // Open settings
    document.getElementById('openSettings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Add webhook
    document.getElementById('addWebhook').addEventListener('click', async () => {
        const name = document.getElementById('webhookName').value.trim();
        const url = document.getElementById('webhookUrl').value.trim();
        const status = document.getElementById('webhookStatus');
        
        if (!name) {
            showStatus(status, 'Please enter a webhook name', 'error');
            return;
        }
        
        if (!url) {
            showStatus(status, 'Please enter a webhook URL', 'error');
            return;
        }
        
        if (!url.startsWith('https://discord.com/api/webhooks/')) {
            showStatus(status, 'Invalid Discord webhook URL format', 'error');
            return;
        }
        
        try {
            // Test the webhook before saving
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '🔄 Testing webhook connection...',
                    username: 'Tox'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send test message');
            }
            
            // If test succeeds, save the webhook
            const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
            
            // Check if webhook already exists
            if (webhooks.some(w => w.url === url)) {
                showStatus(status, 'This webhook is already added', 'error');
                return;
            }
            
            webhooks.push({ name, url });
            await chrome.storage.local.set({ webhooks });
            
            showStatus(status, 'Webhook added successfully', 'success');
            document.getElementById('webhookName').value = '';
            document.getElementById('webhookUrl').value = '';
            await loadWebhooks();
        } catch (error) {
            showStatus(status, 'Error testing webhook: ' + error.message, 'error');
        }
    });
    
    // Delete webhook
    document.getElementById('webhooksList').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-webhook')) {
            const url = e.target.dataset.url;
            const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
            const newWebhooks = webhooks.filter(w => w.url !== url);
            await chrome.storage.local.set({ webhooks: newWebhooks });
            await loadWebhooks();
        }
    });
    
    // Join group
    document.getElementById('joinGroup').addEventListener('click', async () => {
        const groupIdInput = document.getElementById('groupIdInput');
        const groupId = groupIdInput.value.trim();
        const status = document.getElementById('groupStatus');
        
        if (!groupId) {
            showStatus(status, 'Please enter a group ID', 'error');
            return;
        }
        
        try {
            // Save the group ID
            await chrome.storage.local.set({ groupId });
            
            // Update the display
            document.getElementById('groupDisplay').textContent = `Group: ${groupId}`;
            
            // Clear the input
            groupIdInput.value = '';
            
            showStatus(status, 'Joined group successfully', 'success');
        } catch (error) {
            showStatus(status, 'Error joining group: ' + error.message, 'error');
            console.error('Error joining group:', error);
        }
    });
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
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
        element.textContent = '';
        element.className = 'status';
    }, 3000);
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