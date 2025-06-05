/**
 * Utilidades para exportación de datos a PNG
 */
import { showToast } from './notification.js';

/**
 * Exporta la matriz de eventos como imagen PNG
 * @param {Element} tableElement - Elemento de tabla o contenedor a exportar
 * @param {string} [filename='matriz_eventos.png'] - Nombre de archivo para la descarga
 */
export function exportTableToPNG(tableElement, filename = 'matriz_eventos.png') {
    try {
        // Si es un elemento de tabla, ponerlo en un contenedor
        let container = tableElement;
        let shouldAddToDOM = false;
        
        if (tableElement.tagName.toLowerCase() === 'table') {
            container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.background = '#fff';
            container.style.padding = '20px';
            container.style.boxSizing = 'border-box';
            
            // Crear título para la imagen
            const title = document.createElement('h2');
            title.textContent = document.getElementById('matrixTitle')?.textContent || 'Matriz de Eventos';
            title.style.color = '#000000';
            title.style.marginBottom = '10px';
            
            // Clone the table to avoid modifying the original
            const tableClone = tableElement.cloneNode(true);
            
            // Apply styles for the image
            const cells = tableClone.querySelectorAll('td, th');
            cells.forEach(cell => {
                cell.style.border = '1px solid #ccc';
                cell.style.padding = '8px';
                cell.style.textAlign = 'center';
            });
            
            // Add elements to container
            container.appendChild(title);
            container.appendChild(tableClone);
            shouldAddToDOM = true;
        }

        // Add to DOM if needed
        if (shouldAddToDOM) {
            document.body.appendChild(container);
        }
        
        // Use html2canvas to capture the container
        html2canvas(container, {
            backgroundColor: '#fff',
            scale: 2, // Higher resolution
            logging: false
        }).then(canvas => {
            // Remove temporary container if we created it
            if (shouldAddToDOM) {
                document.body.removeChild(container);
            }
            
            // Create link to download image
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Also copy to clipboard
            copyCanvasToClipboard(canvas);
        });
    } catch (error) {
        console.error('Error al exportar a PNG:', error);
        alert('No se pudo exportar la matriz a PNG');
    }
}

/**
 * Copia una imagen del canvas al portapapeles
 * @param {HTMLCanvasElement} canvas - Canvas con la imagen a copiar
 */
async function copyCanvasToClipboard(canvas) {
    try {
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Create a ClipboardItem and copy to clipboard
        if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item])
                .then(() => {
                    console.log('Imagen copiada al portapapeles');
                    showToast('Copiado en Portapapeles', 'success');
                })
                .catch(error => {
                    console.warn('API de portapapeles no accesible:', error);
                    // No mostrar error al usuario cuando falla debido a foco
                });
        } else {
            console.warn('API de portapapeles no soportada en este navegador');
            showToast('Portapapeles no soportado en este navegador', 'error');
        }
    } catch (error) {
        console.error('Error al copiar al portapapeles:', error);
        // No mostrar mensaje de error al usuario para errores de portapapeles
    }
}