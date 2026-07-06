/**
 * Extensión del módulo principal para exportación de imágenes
 */
import { exportTableToPNG } from './export-image.js';

/**
 * Inicializa los controladores para exportación de imágenes
 * Esta función debe ser llamada desde app.js
 */
export function initImageExport() {
    document.getElementById('exportImageButton').addEventListener('click', () => {
        const tableElement = document.getElementById('eventMatrix');
        exportTableToPNG(tableElement);
    });
}