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

// We'll load the Supabase client from our local file
let supabase = null;

// Initialize the extension
async function initialize() {
  try {
    console.log('Initializing Supabase connection...');
    
    // If already initialized, just return
    if (supabase) {
      console.log('Supabase already initialized');
      return;
    }
    
    // Check if Supabase is available
    if (!window.supabase) {
      console.error('Supabase client not available globally');
      throw new Error('Supabase client not available');
    }
    
    console.log('Supabase library found:', !!window.supabase);
    
    // Initialize the client
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      if (!supabase) {
        throw new Error('Failed to create Supabase client');
      }
      
      console.log('Supabase client initialized successfully');
    } catch (clientError) {
      console.error('Error creating Supabase client:', clientError);
      throw clientError;
    }
    
    // Test connection and verify database table
    try {
      console.log('Testing Supabase connection...');
      
      // Test table exists and is accessible
      const { data, error } = await supabase.from('group_shares').select('id, content, group_id').limit(1);
      
      if (error) {
        console.warn('Supabase test query failed:', error);
        
        // Check if the table exists at all
        if (error.code === '42P01') {
          console.error('Table "group_shares" does not exist. Please create it first.');
        } else if (error.code === '42501') {
          console.error('Permission denied. Check your Supabase policies.');
        } else {
          console.error('Unknown database error:', error.message);
        }
      } else {
        console.log('Supabase connection test successful');
        console.log('Retrieved data sample:', data);
        
        // Try an insertion test with a test record
        console.log('Testing database insertion capability...');
        const testRecord = {
          content: 'This is a test record - please ignore',
          url: 'https://test.com',
          title: 'Test',
          sender: 'System Test',
          group_id: 'test-group',
          timestamp: Date.now()
        };
        
        const { error: insertError } = await supabase
          .from('group_shares')
          .insert([testRecord]);
          
        if (insertError) {
          console.error('Test insertion failed:', insertError);
          console.error('This indicates the problem is with insertion permissions or column validation');
        } else {
          console.log('Test insertion successful!');
        }
      }
    } catch (testError) {
      console.warn('Supabase connection test error:', testError);
      // Continue anyway, as this is just a test
    }
    
    // Get user's group ID
    const { groupId } = await new Promise(resolve => {
      chrome.storage.local.get(['groupId'], resolve);
    });
    
    if (groupId) {
      console.log(`User has group ID: ${groupId}, subscribing to updates`);
      subscribeToGroupShares(groupId);
    } else {
      console.log('No group ID found, skipping subscription');
    }
    
    console.log('Supabase initialization complete');
  } catch (error) {
    console.error('Supabase initialization error:', error);
    console.error('Error stack:', error.stack);
    
    // Try to recover if possible
    if (!supabase) {
      console.log('Attempting recovery of Supabase client...');
      try {
        if (window.supabase) {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          console.log('Recovery successful using local Supabase client');
          
          // Try a simple test query
          const { error } = await supabase.from('group_shares').select('id').limit(1);
          if (error) {
            console.warn('Recovery test query failed:', error);
          } else {
            console.log('Recovery test query successful');
          }
        } else {
          console.error('Supabase client not available globally');
          
          // In a background page, we can't dynamically load scripts easily
          // We'll need to reload the page
          console.log('Attempting to reload the background page');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
          throw new Error('Supabase not available, reloading background page');
        }
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    }
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Simple ping handler for connection testing
  if (message.action === 'ping') {
    console.log('Received ping from content script');
    sendResponse({ success: true, message: 'Background page is active' });
    return true;
  }
  
  // Add a diagnostic test handler
  if (message.action === 'testSupabase') {
    console.log('Received request to test Supabase connection');
    testSupabaseConnection()
      .then(result => {
        console.log('Supabase test result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error in Supabase test:', error);
        sendResponse({ 
          success: false, 
          stage: 'test', 
          error: 'Error running test: ' + error.message 
        });
      });
    return true;
  }
  
  if (message.action === 'shareWithGroup') {
    console.log('Received shareWithGroup message:', message.data);
    
    // Make sure Supabase is initialized
    if (!supabase) {
      console.log('Supabase not initialized yet, initializing now...');
      initialize().then(() => {
        // After initialization, share the content
        shareWithGroup(message.data)
          .then(() => {
            console.log('Successfully shared content with group');
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Error in shareWithGroup:', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Unknown error during sharing' 
            });
          });
      }).catch(error => {
        console.error('Failed to initialize Supabase:', error);
        sendResponse({ 
          success: false, 
          error: 'Failed to initialize Supabase: ' + (error.message || 'Unknown error') 
        });
      });
    } else {
      // Supabase is already initialized, share the content
      shareWithGroup(message.data)
        .then(() => {
          console.log('Successfully shared content with group');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('Error in shareWithGroup:', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Unknown error during sharing' 
          });
        });
    }
    
    return true; // Required for async sendResponse
  }
  
  // Handle unknown actions
  console.warn('Unknown message action received:', message.action);
  sendResponse({ success: false, error: 'Unknown action: ' + message.action });
  return true;
});

// Function to log errors to extension storage
function logErrorToStorage(errorSource, errorMessage, errorDetails = null) {
  const timestamp = new Date().toISOString();
  const errorLog = {
    source: errorSource,
    message: errorMessage,
    details: errorDetails,
    timestamp: timestamp
  };
  
  console.error(`[${timestamp}] ${errorSource}: ${errorMessage}`, errorDetails || '');
  
  // Get existing errors
  chrome.storage.local.get(['errorLogs'], (result) => {
    const errors = result.errorLogs || [];
    errors.unshift(errorLog);
    
    // Keep only the last 20 errors
    if (errors.length > 20) {
      errors.pop();
    }
    
    // Save back to storage
    chrome.storage.local.set({ errorLogs: errors }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save error log:', chrome.runtime.lastError);
      }
    });
  });
  
  return errorLog;
}

// Update the shareWithGroup function to use the new error logging
async function shareWithGroup(data) {
  console.log('Starting shareWithGroup function...');
  
  try {
    // Validate input data
    if (!data || !data.content) {
      const error = logErrorToStorage(
        'shareWithGroup', 
        'Missing required data for sharing', 
        data
      );
      throw new Error(error.message);
    }
    
    console.log('Preparing to share with Supabase:', data);
    
    // Make sure supabase is initialized
    if (!supabase) {
      logErrorToStorage('shareWithGroup', 'Supabase client not initialized, attempting initialization now');
      await initialize();
      
      // Check again after initialization attempt
      if (!supabase) {
        logErrorToStorage('shareWithGroup', 'Supabase client initialization failed');
        throw new Error('Supabase client initialization failed');
      }
    }
    
    // Format the data according to the database schema
    const formattedData = {
      content: data.content,
      url: data.url || '',
      title: data.title || '',
      sender: data.sender || 'Anonymous',
      group_id: data.groupId, // Ensure this matches the column name in Supabase
      timestamp: data.timestamp || Date.now()
    };
    
    // Validate required fields
    if (!formattedData.group_id) {
      logErrorToStorage('shareWithGroup', 'Missing group_id in data', formattedData);
      throw new Error('group_id is required for sharing');
    }
    
    console.log('Formatted data for Supabase insertion:', formattedData);
    
    // Insert into Supabase with detailed error logging
    console.log('Attempting to insert into Supabase...');
    
    try {
      const { data: result, error } = await supabase
        .from('group_shares')
        .insert([formattedData]);
      
      if (error) {
        logErrorToStorage(
          'Supabase Insert', 
          `Insert error: ${error.message}`, 
          { error, formattedData }
        );
        throw error;
      }
      
      console.log('Content successfully shared with group:', data.groupId);
      console.log('Supabase response:', result);
      return true;
    } catch (insertError) {
      logErrorToStorage(
        'Supabase Insert', 
        `Insert operation error: ${insertError.message}`, 
        { insertError, formattedData }
      );
      
      // Try one more time with a simpler object
      console.log('Attempting simplified insertion...');
      try {
        const simpleData = {
          content: data.content,
          group_id: data.groupId,
          sender: 'Retry',
          timestamp: Date.now()
        };
        
        const { error: retryError } = await supabase
          .from('group_shares')
          .insert([simpleData]);
          
        if (retryError) {
          logErrorToStorage(
            'Supabase Retry Insert', 
            `Simplified insertion failed: ${retryError.message}`, 
            { retryError, simpleData }
          );
          throw retryError;
        } else {
          console.log('Simplified insertion succeeded');
          return true;
        }
      } catch (retryError) {
        logErrorToStorage(
          'Supabase Retry Insert', 
          `Retry insertion error: ${retryError.message}`, 
          { retryError }
        );
        throw retryError;
      }
    }
  } catch (error) {
    logErrorToStorage(
      'shareWithGroup', 
      `Function error: ${error.message}`, 
      { errorStack: error.stack }
    );
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

// Add a function to test the Supabase connection
async function testSupabaseConnection() {
  try {
    logErrorToStorage('Diagnostic', 'Starting Supabase connection test');
    
    // Check if Supabase client exists
    if (!supabase) {
      logErrorToStorage('Diagnostic', 'Supabase client not initialized, attempting to initialize');
      try {
        await initialize();
      } catch (initError) {
        logErrorToStorage('Diagnostic', 'Initialization failed', initError);
        return { 
          success: false, 
          stage: 'initialization', 
          error: 'Failed to initialize Supabase client: ' + initError.message 
        };
      }
    }
    
    if (!supabase) {
      logErrorToStorage('Diagnostic', 'Supabase client still null after initialization');
      return { 
        success: false, 
        stage: 'client', 
        error: 'Supabase client is null even after initialization' 
      };
    }
    
    // Test URL ping
    try {
      logErrorToStorage('Diagnostic', 'Testing connection to Supabase URL', { url: SUPABASE_URL });
      const pingResponse = await fetch(SUPABASE_URL + '/auth/v1/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        }
      });
      
      if (!pingResponse.ok) {
        const pingText = await pingResponse.text();
        logErrorToStorage('Diagnostic', 'Supabase health check failed', { 
          status: pingResponse.status,
          response: pingText 
        });
        return { 
          success: false, 
          stage: 'ping', 
          status: pingResponse.status, 
          error: 'Failed to ping Supabase health endpoint' 
        };
      }
      
      logErrorToStorage('Diagnostic', 'Health check successful');
    } catch (pingError) {
      logErrorToStorage('Diagnostic', 'Error pinging Supabase health endpoint', pingError);
      return { 
        success: false, 
        stage: 'ping', 
        error: 'Network error connecting to Supabase: ' + pingError.message 
      };
    }
    
    // Test database query
    try {
      logErrorToStorage('Diagnostic', 'Testing database query');
      const { data, error } = await supabase
        .from('group_shares')
        .select('count(*)')
        .limit(1);
        
      if (error) {
        logErrorToStorage('Diagnostic', 'Database query failed', error);
        return { 
          success: false, 
          stage: 'query', 
          error: 'Database query failed: ' + error.message,
          errorCode: error.code
        };
      }
      
      logErrorToStorage('Diagnostic', 'Database query successful', data);
      return { 
        success: true, 
        message: 'Supabase connection is working properly',
        data: data
      };
    } catch (queryError) {
      logErrorToStorage('Diagnostic', 'Error executing database query', queryError);
      return { 
        success: false, 
        stage: 'query', 
        error: 'Error executing query: ' + queryError.message 
      };
    }
  } catch (error) {
    logErrorToStorage('Diagnostic', 'Unexpected error in connection test', error);
    return { 
      success: false, 
      stage: 'unknown', 
      error: 'Unexpected error: ' + error.message 
    };
  }
}

// Start initialization
initialize(); 