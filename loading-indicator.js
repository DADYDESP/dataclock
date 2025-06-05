/**
 * Loading indicator component
 */

/**
 * Creates and shows a loading indicator in the target element
 * @param {HTMLElement} targetElement - Element where to show the indicator
 * @param {string} message - Optional message to display
 * @returns {Object} Methods to control the loading indicator
 */
export function showLoadingIndicator(targetElement, message = 'Cargando...') {
    // Create container
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'loading-container';
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'loading-message';
    messageElement.textContent = message;
    
    // Add elements to container
    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(messageElement);
    
    // Add to target
    targetElement.appendChild(loadingContainer);
    
    return {
        // Update message
        updateMessage: (newMessage) => {
            messageElement.textContent = newMessage;
        },
        // Remove loading indicator
        remove: () => {
            targetElement.removeChild(loadingContainer);
        }
    };
}