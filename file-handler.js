/**
 * File handler module for different file formats
 * Supports Excel (.xlsx, .xls), CSV (.csv), and DBF (.dbf) files
 */

/**
 * Reads and processes different file formats
 * @param {File} file - The file object from file input
 * @returns {Promise<Object>} - Promise resolving to workbook and sheet data
 */
export async function processFile(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    try {
        switch (fileExtension) {
            case 'xlsx':
            case 'xls':
            case 'csv':
                return await processExcelOrCsv(file);
            
            case 'dbf':
                return await processDbfFile(file);
            
            default:
                throw new Error('Formato de archivo no soportado');
        }
    } catch (error) {
        console.error('Error procesando archivo:', error);
        throw error;
    }
}

/**
 * Processes Excel and CSV files
 * @param {File} file - The file object
 * @returns {Promise<Object>} - Promise resolving to workbook and sheet data
 */
async function processExcelOrCsv(file) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get data from first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return { workbook, sheetData };
}

/**
 * Processes DBF files
 * @param {File} file - The file object
 * @returns {Promise<Object>} - Promise resolving to workbook and sheet data
 */
async function processDbfFile(file) {
    const data = await file.arrayBuffer();
    
    // XLSX.js has built-in DBF support
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get data from first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return { workbook, sheetData };
}

/**
 * Shows an informative message about file format limitations
 * @param {string} message - The message to display
 */
export function showFormatLimitations(message) {
    alert(message);
}