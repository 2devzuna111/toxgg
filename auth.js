// Authentication script for TOX extension
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth page loaded');
    
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
    
    // Function to validate the key
    function validateKey() {
        const key = authInput.value.trim();
        
        // Check if key is empty
        if (!key) {
            authMessage.textContent = 'Please enter your activation key';
            authInput.classList.add('shake');
            setTimeout(() => {
                authInput.classList.remove('shake');
            }, 500);
            return;
        }
        
        // Validate against the correct key
        const validKey = 'deadfnf';
        
        if (key === validKey) {
            // Success - store authentication status
            authMessage.textContent = 'Authentication successful!';
            authMessage.className = 'auth-success';
            authButton.disabled = true;
            
            // Store authentication status
            chrome.storage.local.set({ toxAuthenticated: true }, function() {
                console.log('Authentication status stored');
                
                // Show success message for a moment before redirecting
                setTimeout(() => {
                    window.location.href = 'popup.html';
                }, 1000);
            });
        } else {
            // Invalid key
            authMessage.textContent = 'Invalid activation key. Please try again.';
            authMessage.className = 'auth-error';
            authInput.classList.add('shake');
            setTimeout(() => {
                authInput.classList.remove('shake');
            }, 500);
        }
    }
    
    // Add event listeners
    authButton.addEventListener('click', validateKey);
    
    // Allow Enter key to submit
    authInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            validateKey();
        }
    });
}); 