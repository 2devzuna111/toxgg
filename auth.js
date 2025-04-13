// Authentication script for TOX extension
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth page loaded');
    
    // Supabase configuration
    const SUPABASE_URL = 'https://dfylxewxjcndeghaqdqz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeWx4ZXd4amNuZGVnaGFxZHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTYwOTAsImV4cCI6MjA1OTg5MjA5MH0.GSOt3kgM4gFUy_rVBdRtlCmlUyXNT_1OQ9AZ6XSbTZI';
    
    // Get DOM elements
    const authForm = document.querySelector('.auth-form');
    const authInput = document.getElementById('auth-key');
    const authButton = document.getElementById('auth-submit');
    const authMessage = document.getElementById('auth-message');
    
    // Check if user is already authenticated (just in case)
    chrome.storage.local.get(['toxAuthenticated'], function(result) {
        if (result.toxAuthenticated === true) {
            console.log('User already authenticated, redirecting to popup');
            window.location.href = 'popup.html';
            return;
        }
        
        // Focus the input field
        setTimeout(() => {
            authInput.focus();
        }, 100);
    });
    
    // Function to validate the key against the database
    async function validateKey() {
        // Show loading state
        authButton.disabled = true;
        authButton.textContent = 'Validating...';
        authMessage.textContent = '';
        
        const key = authInput.value.trim();
        
        // Check if key is empty
        if (!key) {
            authMessage.textContent = 'Please enter your activation key';
            authMessage.className = 'auth-error';
            authInput.classList.add('shake');
            
            // Reset button
            authButton.disabled = false;
            authButton.textContent = 'Activate';
            
            setTimeout(() => {
                authInput.classList.remove('shake');
            }, 500);
            return;
        }
        
        try {
            // Check the key against Supabase database
            const response = await fetch(`${SUPABASE_URL}/rest/v1/auth_keys?key=eq.${encodeURIComponent(key)}&select=id,key,wallet`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to validate key');
            }
            
            const results = await response.json();
            console.log('Key validation result:', results);
            
            if (results && results.length > 0) {
                // Key exists in database - valid
                const keyData = results[0];
                
                // Update the last_used_at timestamp
                await fetch(`${SUPABASE_URL}/rest/v1/auth_keys?id=eq.${keyData.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ last_used_at: new Date().toISOString() })
                });
                
                // Success - store authentication status
                authMessage.textContent = 'Authentication successful!';
                authMessage.className = 'auth-success';
                
                // Store authentication status and key info
                chrome.storage.local.set({ 
                    toxAuthenticated: true,
                    keyInfo: {
                        key: keyData.key,
                        wallet: keyData.wallet,
                        activatedAt: new Date().toISOString()
                    }
                }, function() {
                    console.log('Authentication status stored');
                    
                    // Show success message for a moment before redirecting
                    setTimeout(() => {
                        window.location.href = 'popup.html';
                    }, 1000);
                });
            } else {
                // Key not found in database - invalid
                authMessage.textContent = 'Invalid activation key. Please try again.';
                authMessage.className = 'auth-error';
                authInput.classList.add('shake');
                
                // Reset button
                authButton.disabled = false;
                authButton.textContent = 'Activate';
                
                setTimeout(() => {
                    authInput.classList.remove('shake');
                }, 500);
            }
            
        } catch (error) {
            console.error('Key validation error:', error);
            
            // Show error message
            authMessage.textContent = 'Error validating key. Please try again.';
            authMessage.className = 'auth-error';
            
            // Reset button
            authButton.disabled = false;
            authButton.textContent = 'Activate';
        }
    }
    
    // Add event listeners
    authButton.addEventListener('click', () => validateKey());
    
    // Allow Enter key to submit
    authInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            validateKey();
        }
    });
}); 