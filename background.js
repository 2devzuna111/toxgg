// Initialize state
let clipboardEnabled = true;
let lastDetectedAddress = null;

// Load saved state
chrome.storage.local.get(['clipboardEnabled'], (result) => {
    clipboardEnabled = result.clipboardEnabled !== false;
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_CLIPBOARD') {
        clipboardEnabled = message.enabled;
    }
});

// Clipboard monitoring
setInterval(async () => {
    if (!clipboardEnabled) return;

    try {
        const text = await navigator.clipboard.readText();
        const contractAddress = detectContractAddress(text);
        
        if (contractAddress && contractAddress !== lastDetectedAddress) {
            lastDetectedAddress = contractAddress;
            handleNewContractAddress(contractAddress);
        }
    } catch (error) {
        console.error('Error reading clipboard:', error);
    }
}, 2000);

// Contract address detection
function detectContractAddress(text) {
    const patterns = {
        ethereum: /0x[a-fA-F0-9]{40}/,
        tron: /T[a-zA-Z0-9]{33}/,
        bitcoin: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/
    };

    for (const [chain, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match) {
            return {
                address: match[0],
                chain: chain
            };
        }
    }
    return null;
}

// Handle new contract address
async function handleNewContractAddress(contractInfo) {
    // Get user info
    const userData = await chrome.storage.local.get(['userName', 'groupId']);
    
    if (!userData.userName || !userData.groupId) {
        console.log('User not logged in or no group selected');
        return;
    }

    // Create activity object
    const activity = {
        address: contractInfo.address,
        chain: contractInfo.chain,
        timestamp: Date.now(),
        sharedBy: userData.userName
    };

    // Save to storage
    const result = await chrome.storage.local.get(['recentActivities']);
    const activities = result.recentActivities || [];
    activities.unshift(activity);
    
    // Keep only last 10 activities
    if (activities.length > 10) {
        activities.pop();
    }

    await chrome.storage.local.set({ recentActivities: activities });

    // Notify popup
    chrome.runtime.sendMessage({ type: 'NEW_ACTIVITY', activity });

    // Send to Discord webhook if configured
    const webhookData = await chrome.storage.local.get(['discordWebhookUrl']);
    if (webhookData.discordWebhookUrl) {
        sendToDiscord(activity, webhookData.discordWebhookUrl);
    }

    // Send to group if using Firebase/WebSocket
    if (userData.groupId) {
        sendToGroup(activity, userData.groupId);
    }
}

// Discord webhook integration
async function sendToDiscord(activity, webhookUrl) {
    try {
        const payload = {
            username: "Tox Bot",
            embeds: [{
                title: "New Contract Address Shared",
                description: `\`${activity.address}\``,
                color: 0x6366f1,
                fields: [
                    {
                        name: "Chain",
                        value: activity.chain.toUpperCase(),
                        inline: true
                    },
                    {
                        name: "Shared by",
                        value: activity.sharedBy,
                        inline: true
                    }
                ],
                timestamp: new Date(activity.timestamp).toISOString()
            }]
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Error sending to Discord:', error);
    }
}

// Group sharing (placeholder for Firebase/WebSocket implementation)
async function sendToGroup(activity, groupId) {
    // TODO: Implement Firebase/WebSocket group sharing
    console.log('Sending to group:', groupId, activity);
} 