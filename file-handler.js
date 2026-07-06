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
                return await processExcel(file);
            case 'csv':
                return await processCsv(file);
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
 * Processes Excel files precisely as before
 */
async function processExcel(file) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return { workbook, sheetData };
}

/**
 * Processes CSV files explicitly preventing date formatting guesses
 */
async function processCsv(file) {
    const text = await file.text();
    // Leemos el texto tal cual, previniendo que intente convertir/adivinar fechas
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return { workbook, sheetData };
}

/**
 * Processes DBF files ensuring dates are formatted cleanly
 */
async function processDbfFile(file) {
    const data = await file.arrayBuffer();
    
    // DBF lee correctamente los bytes, no usa raw=true en READ
    const workbook = XLSX.read(data, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Formatear salida para que las fechas nativas de la DBF sean strings explícitos DD/MM/YYYY
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
    
    return { workbook, sheetData };
}

/**
 * Shows an informative message about file format limitations
 * @param {string} message - The message to display
 */
export function showFormatLimitations(message) {
    alert(message);
}