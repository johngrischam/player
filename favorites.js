const FAVORITES_KEY = 'tv_favorites';
const WELCOME_KEY = 'favorites_welcome_seen';

// --- SVG ICON CONSTANTS (Defined using concatenation, no backticks) ---

// Solid Red Heart (For Favorited State and Default Toggle Button)
const FAV_HEART_SVG = '<svg viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg" width="20" height="20">' +
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' +
    '</svg>';

// Outlined/Empty Heart (For Unfavorited State and Active Toggle Button)
const UNFAV_HEART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" width="20" height="20">' +
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' +
    '</svg>';

/**
 * Dismisses the "No Favorites" popup and resets the filter button state.
 */
function dismissNoFavoritesPopup() {
    const overlay = document.getElementById('no-favorites-message-overlay');
    const button = document.getElementById('filter-toggle-btn');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Reset the button state back to 'Show Favorites Only'
    if (button) {
        button.classList.remove('filter-state-favorites');
        button.classList.add('filter-state-all');
        button.innerHTML = FAV_HEART_SVG; // Use solid heart
    }
}

/**
 * Toggles the single filter button state between 'all' and 'favorites'.
 */
function toggleFilter() {
    const button = document.getElementById('filter-toggle-btn');
    const isShowingAll = button.classList.contains('filter-state-all');

    if (isShowingAll) {
        // ACTION: Switch to Favorites Only.
        filterView('favorites');

        // Update button state (This may be immediately reverted inside filterView if list is empty)
        button.classList.remove('filter-state-all');
        button.classList.add('filter-state-favorites');
        button.innerHTML = UNFAV_HEART_SVG; // Use outline heart
        
    } else {
        // ACTION: Switch back to All Channels.
        filterView('all');

        button.classList.remove('filter-state-favorites');
        button.classList.add('filter-state-all');
        button.innerHTML = FAV_HEART_SVG; // Use solid heart
    }
}

/**
 * Hides/shows channels based on the user's selected filter mode.
 */
function filterView(mode) {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    const allWrappers = document.querySelectorAll('#page1 .zappr-button, #page1 .accordion-toggle, #page1 .channel-separator');
    const modalOverlay = document.getElementById('no-favorites-message-overlay'); 
    const button = document.getElementById('filter-toggle-btn');

    if (mode === 'all') {
        // SHOW ALL MODE: Ensure everything is visible and MODAL is hidden.
        allWrappers.forEach(wrapper => {
            wrapper.classList.remove('hidden-by-filter');
        });
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
        
    } else if (mode === 'favorites') {
        
        // 1. Check for empty favorites list
        if (favorites.length === 0) {
            // A. EMPTY LIST CASE: Show MODAL and ensure the view is not blank.
            allWrappers.forEach(wrapper => {
                wrapper.classList.remove('hidden-by-filter'); // Ensure all channels remain visible
            });
            if (modalOverlay) {
                modalOverlay.style.display = 'flex'; // Show the modal overlay
            }
            
            // Revert the button state since no filtering happened
            if (button) {
                button.classList.remove('filter-state-favorites');
                button.classList.add('filter-state-all');
                button.innerHTML = FAV_HEART_SVG; // Revert to solid heart
            }
            return; // Stop the function here
        }

        // 2. STANDARD FAVORITES CASE: Hide modal and proceed with filtering.
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }

        allWrappers.forEach(wrapper => {
            
            // EXCEPTION: channel-uniter (ADS) -> ALWAYS SHOW
            if (wrapper.classList.contains('channel-uniter')) {
                wrapper.classList.remove('hidden-by-filter');
                return;
            }

            // EXCEPTION: channel-separator (TEXTS) -> ALWAYS HIDE
            if (wrapper.classList.contains('channel-separator')) {
                wrapper.classList.add('hidden-by-filter');
                return;
            }
            
            // Standard Channel Button Logic
            const nameElement = wrapper.querySelector('.zappr-text');
            const channelName = nameElement ? nameElement.textContent.trim() : null;
            
            // STANDARD LOGIC: Show/Hide based on favorite status
            if (channelName && favorites.includes(channelName)) {
                wrapper.classList.remove('hidden-by-filter'); 
            } else {
                wrapper.classList.add('hidden-by-filter'); 
            }
        });
    }
}

/**
 * Toggles a channel's favorite status, updates Local Storage, and updates the view if filtering is active.
 */
function toggleFavorite(element) {
    const channelName = element.getAttribute('data-channel-name');
    let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    const isFavorite = favorites.includes(channelName);

    if (isFavorite) {
        favorites = favorites.filter(name => name !== channelName);
        element.innerHTML = UNFAV_HEART_SVG; // Use outline heart
    } else {
        favorites.push(channelName);
        element.innerHTML = FAV_HEART_SVG; // Use solid heart
    }
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

    // Check the state of the toggle button and re-filter if currently showing favorites.
    const button = document.getElementById('filter-toggle-btn');
    if (button && button.classList.contains('filter-state-favorites')) {
        filterView('favorites');
    }
}

// --- NEW WELCOME POPOVER FUNCTIONS ---

/**
 * Hides the welcome popover and sets the flag in Local Storage.
 * This is called by the 'Got it!' button inside the popover HTML.
 */
function dismissWelcomeMessage() {
    const popover = document.getElementById('favorites-welcome-popover'); 
    if (popover) {
        popover.style.display = 'none';
        localStorage.setItem(WELCOME_KEY, 'true'); 
    }
}


// --- INITIALIZATION FUNCTIONS ---

/**
 * Self-executing function to set the correct heart icon state on page load.
 */
(function setInitialHeartIcons() {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    const favoriteToggles = document.querySelectorAll('.favorite-toggle');
    const toggleButton = document.getElementById('filter-toggle-btn');
    
    favoriteToggles.forEach(element => {
        const channelName = element.getAttribute('data-channel-name');
        if (favorites.includes(channelName)) {
            element.innerHTML = FAV_HEART_SVG; // Use solid heart
        } else {
            element.innerHTML = UNFAV_HEART_SVG; // Use outline heart
        }
    });

    // Set the initial state of the main filter button on load
    if (toggleButton) {
         // Default state is 'Show All', so the button should say 'Show Favorites' (Solid Heart)
         toggleButton.classList.add('filter-state-all');
         toggleButton.innerHTML = FAV_HEART_SVG; 
    }
})();

/**
 * Runs on script load to decide whether to show the welcome popover once.
 */
(function showWelcomePopoverOnce() {
    const hasSeen = localStorage.getItem(WELCOME_KEY);
    const popover = document.getElementById('favorites-welcome-popover'); 

    if (!hasSeen && popover) {
        // First time visitor: Show the popover and set flag
        popover.style.display = 'block'; 
        localStorage.setItem(WELCOME_KEY, 'true'); // Set the seen flag right away

    } else if (hasSeen && popover) {
        // Returning visitor: Ensure message is hidden
        popover.style.display = 'none'; 
    }
})();