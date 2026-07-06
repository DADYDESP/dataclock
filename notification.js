/**
 * Módulo para mostrar notificaciones al usuario
 */


/**
 * Muestra una notificación temporal tipo toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success', 'error', 'info')
 * @param {number} duration - Duración en milisegundos
 */
export function showToast(message, type = 'success', duration = 3000) {
    // Crear elemento toast
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    
    // Agregar al DOM
    document.body.appendChild(toast);
    
    // Mostrar con animación
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Ocultar después del tiempo especificado
    setTimeout(() => {
        toast.classList.remove('show');
        // Eliminar del DOM después de la animación
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}