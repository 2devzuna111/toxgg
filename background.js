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

// background.js - Supabase Integration for Group Sharing

// Supabase configuration
const SUPABASE_URL = 'https://dfylxewxjcndeghaqdqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeWx4ZXd4amNuZGVnaGFxZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTYwOTAsImV4cCI6MjA1OTg5MjA5MH0.GSOt3kgM4gFUy_rVBdRtlCmlUyXNT_1OQ9AZ6XSbTZI';

// We'll load the Supabase client dynamically
let supabase = null;

// Initialize the extension
async function initialize() {
  try {
    // Load Supabase client
    await loadSupabaseScript();
    console.log('Supabase client loaded');
    
    // Initialize the client
    supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
    
    // Get user's group ID
    const { groupId } = await new Promise(resolve => {
      chrome.storage.local.get(['groupId'], resolve);
    });
    
    if (groupId) {
      subscribeToGroupShares(groupId);
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Load the Supabase client script
function loadSupabaseScript() {
  return new Promise((resolve, reject) => {
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Supabase client'));
    document.head.appendChild(script);
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'shareWithGroup') {
    shareWithGroup(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }
});

// Share content with group
async function shareWithGroup(data) {
  try {
    // Insert into Supabase
    const { data: result, error } = await supabase
      .from('group_shares')
      .insert([{
        content: data.content,
        url: data.url,
        title: data.title,
        sender: data.sender,
        group_id: data.groupId,
        timestamp: data.timestamp
      }]);
      
    if (error) throw error;
    console.log('Content shared with group:', data.groupId);
    return true;
  } catch (error) {
    console.error('Error sharing with group:', error);
    throw error;
  }
}

// Subscribe to real-time updates for a group
async function subscribeToGroupShares(groupId) {
  try {
    // Get current username to filter out own messages
    const { username = 'Anonymous' } = await new Promise(resolve => {
      chrome.storage.local.get(['username'], resolve);
    });
    
    console.log(`Subscribing to group: ${groupId}, as user: ${username}`);
    
    // Subscribe to changes using Supabase realtime
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_shares',
        filter: `group_id=eq.${groupId}`
      }, payload => {
        console.log('Received new group share:', payload);
        
        // Skip notifications for your own shares
        if (payload.new.sender !== username) {
          showNotification(payload.new);
        }
      })
      .subscribe((status) => {
        console.log(`Supabase subscription status: ${status}`);
      });
      
    return channel;
  } catch (error) {
    console.error('Error subscribing to group shares:', error);
  }
}

// Listen for changes to groupId
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.groupId) {
    const newGroupId = changes.groupId.newValue;
    if (newGroupId) {
      subscribeToGroupShares(newGroupId);
    }
  }
});

// Show notification for a new share
function showNotification(share) {
  const notificationId = `share-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon48.png',
    title: `New share from ${share.sender}`,
    message: share.content.substring(0, 100) + (share.content.length > 100 ? '...' : ''),
    contextMessage: share.title || 'Shared content',
    buttons: [{ title: 'View' }],
    priority: 2
  });
  
  // Store the share data to use when the notification is clicked
  chrome.storage.local.set({
    [`notification_${notificationId}`]: share
  });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {  // "View" button
    chrome.storage.local.get([`notification_${notificationId}`], (result) => {
      const share = result[`notification_${notificationId}`];
      if (share && share.url) {
        chrome.tabs.create({ url: share.url });
      }
    });
  }
});

// Start initialization
initialize(); 