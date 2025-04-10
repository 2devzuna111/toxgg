// Default settings
const defaultSettings = {
    userName: '',
    userAvatar: 'U',
    groupId: '',
    groupName: '',
    autoShare: true,
    notifications: true
};

// Initialize the settings page
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    setupEventListeners();
    loadHistory();
});

// Load saved settings
async function loadSettings() {
    const settings = await chrome.storage.local.get(Object.keys(defaultSettings));
    
    // Set values for all form fields
    Object.entries(settings).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetSettings);
    
    // Avatar input - limit to one character
    document.getElementById('userAvatar').addEventListener('input', (e) => {
        if (e.target.value.length > 1) {
            e.target.value = e.target.value.slice(0, 1);
        }
        e.target.value = e.target.value.toUpperCase();
    });

    // Save profile
    document.getElementById('saveProfile').addEventListener('click', () => {
        const username = document.getElementById('username').value;
        const groupId = document.getElementById('groupId').value;
        const status = document.getElementById('profileStatus');

        if (!username) {
            showStatus(status, 'Please enter a username', 'error');
            return;
        }

        chrome.storage.local.set({ 
            username,
            groupId
        }, () => {
            if (chrome.runtime.lastError) {
                showStatus(status, 'Error saving profile: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus(status, 'Profile saved successfully', 'success');
            }
        });
    });
}

// Save settings
async function saveSettings() {
    const settings = {};
    
    // Get values from all form fields
    Object.keys(defaultSettings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                settings[key] = element.checked;
            } else {
                settings[key] = element.value;
            }
        }
    });

    // Save to storage
    await chrome.storage.local.set(settings);
    
    // Show success message
    showMessage('Settings saved successfully!', 'success');
}

// Reset settings to defaults
async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        await chrome.storage.local.set(defaultSettings);
        loadSettings();
        showMessage('Settings reset to defaults', 'success');
    }
}

// Show message to user
function showMessage(message, type = 'success') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

// Load history
function loadHistory() {
    chrome.storage.local.get(['history'], (result) => {
        const historyList = document.getElementById('historyList');
        const history = result.history || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No history available</div>';
            return;
        }
        
        historyList.innerHTML = history
            .map(item => `
                <div class="history-item">
                    <div class="history-content">${escapeHtml(item.content)}</div>
                    <div class="history-time">${new Date(item.timestamp).toLocaleString()}</div>
                </div>
            `)
            .join('');
    });
}

// Load user profile
function loadUserProfile() {
    chrome.storage.local.get(['username', 'groupId'], (result) => {
        if (result.username) {
            document.getElementById('username').value = result.username;
        }
        if (result.groupId) {
            document.getElementById('groupId').value = result.groupId;
        }
    });
}

// Helper function to show status messages
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'status';
    }, 3000);
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
} 