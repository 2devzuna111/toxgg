// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
    await initializeUserInfo();
    await setupClipboardToggle();
    await loadWebhooks();
    await loadHistory();

    // Setup settings button
    document.getElementById('openSettings').addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Setup webhook handling
    document.getElementById('addWebhook').addEventListener('click', async () => {
        const nameInput = document.getElementById('webhookName');
        const urlInput = document.getElementById('webhookUrl');
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();

        // Validate inputs
        if (!name) {
            showStatus('Please enter a webhook name', 'error');
            return;
        }
        if (!url) {
            showStatus('Please enter a webhook URL', 'error');
            return;
        }
        if (!url.startsWith('https://discord.com/api/webhooks/')) {
            showStatus('Invalid Discord webhook URL', 'error');
            return;
        }

        try {
            // Test webhook
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '🔄 Testing webhook connection...'
                })
            });

            if (!response.ok) {
                throw new Error('Invalid webhook');
            }

            // Save webhook
            const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
            
            // Check for duplicates
            if (webhooks.some(w => w.url === url)) {
                showStatus('This webhook has already been added', 'error');
                return;
            }

            webhooks.push({ name, url });
            await chrome.storage.local.set({ webhooks });
            
            // Clear inputs and reload list
            nameInput.value = '';
            urlInput.value = '';
            await loadWebhooks();
            showStatus('Webhook added successfully', 'success');
        } catch (error) {
            showStatus('Failed to verify webhook. Please check the URL and try again', 'error');
        }
    });
});

// Initialize user info
async function initializeUserInfo() {
    const userInfo = await chrome.storage.local.get(['username', 'avatar']);
    const userStatus = document.getElementById('userStatus');
    const userAvatar = document.getElementById('userAvatar');

    if (userInfo.username) {
        userStatus.textContent = userInfo.username;
        if (userInfo.avatar) {
            userAvatar.src = userInfo.avatar;
        }
    }
}

// Setup clipboard toggle
async function setupClipboardToggle() {
    const toggle = document.getElementById('clipboardToggle');
    const savedState = await chrome.storage.local.get(['clipboardMonitor']);
    toggle.checked = savedState.clipboardMonitor !== false;

    toggle.addEventListener('change', async () => {
        await chrome.storage.local.set({ clipboardMonitor: toggle.checked });
    });
}

// Load webhooks
async function loadWebhooks() {
    const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
    const webhooksList = document.getElementById('webhooksList');
    webhooksList.innerHTML = '';

    if (webhooks.length === 0) {
        webhooksList.innerHTML = '<div class="empty-state">No webhooks added</div>';
        return;
    }

    webhooks.forEach(webhook => {
        const webhookItem = document.createElement('div');
        webhookItem.className = 'webhook-item';
        webhookItem.innerHTML = `
            <div class="webhook-info">
                <div class="webhook-name">${escapeHtml(webhook.name)}</div>
            </div>
            <button class="delete-webhook" data-url="${escapeHtml(webhook.url)}">Delete</button>
        `;
        webhooksList.appendChild(webhookItem);
    });

    // Add delete webhook handlers
    document.querySelectorAll('.delete-webhook').forEach(button => {
        button.addEventListener('click', async () => {
            const urlToDelete = button.dataset.url;
            const { webhooks = [] } = await chrome.storage.local.get(['webhooks']);
            const updatedWebhooks = webhooks.filter(w => w.url !== urlToDelete);
            await chrome.storage.local.set({ webhooks: updatedWebhooks });
            await loadWebhooks();
            showStatus('Webhook deleted successfully', 'success');
        });
    });
}

// Show status message
function showStatus(message, type) {
    const status = document.getElementById('webhookStatus');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// Load history
async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get(['history']);
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-content">${escapeHtml(item.content)}</div>
            <div class="history-time">${formatTimestamp(item.timestamp)}</div>
        `;
        historyList.appendChild(historyItem);
    });
}

// Helper functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 