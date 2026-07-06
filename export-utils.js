/**
 * Utilidades para exportación de datos a Excel
 */

/**
 * Exporta los resultados completos a un archivo Excel
 * @param {Array} matrixData - Datos de la matriz
 * @param {Object} clusterInfo - Información de clusters
 * @param {Object} errorData - Información de errores
 * @param {Object} config - Configuración
 */
export function exportResultsToExcel(matrixData, clusterInfo, errorData, config) {
    try {
        // Crear un libro y hojas
        const wb = XLSX.utils.book_new();
        
        // HOJA 1: Matriz de eventos
        const matrixSheet = createMatrixSheet(matrixData, config);
        XLSX.utils.book_append_sheet(wb, matrixSheet, "Matriz de Eventos");
        
        // HOJA 2: Información de Clusters
        const clusterSheet = createClusterSheet(clusterInfo);
        XLSX.utils.book_append_sheet(wb, clusterSheet, "Información de Clusters");
        
        // HOJA 3: Registro de errores
        const errorSheet = createErrorSheet(errorData, config);
        XLSX.utils.book_append_sheet(wb, errorSheet, "Registro de Errores");
        
        // Guardar archivo
        XLSX.writeFile(wb, "analisis_matriz_eventos.xlsx");
        
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        alert('No se pudo exportar los resultados a Excel');
    }
}

/**
 * Crea la hoja de la matriz para Excel
 * @param {Array} matrixData - Datos de la matriz
 * @param {Object} config - Configuración
 * @returns {Object} Hoja de cálculo
 */
function createMatrixSheet(matrixData, config) {
    // Preparar los datos para la exportación
    const exportData = [];
    
    // Fila de encabezado con horas
    const headerRow = ['Día / Hora'];
    for (let hour = 0; hour < 24; hour++) {
        headerRow.push(config.hoursOfDay[hour]);
    }
    exportData.push(headerRow);
    
    // Datos de la matriz por día y hora
    for (let day = 0; day < 7; day++) {
        const dataRow = [config.daysOfWeek[day]];
        for (let hour = 0; hour < 24; hour++) {
            dataRow.push(matrixData[hour][day]);
        }
        exportData.push(dataRow);
    }
    
    return XLSX.utils.aoa_to_sheet(exportData);
}

/**
 * Crea la hoja de información de clusters para Excel
 * @param {Array} clusterInfo - Información de clusters
 * @returns {Object} Hoja de cálculo
 */
function createClusterSheet(clusterInfo) {
    if (!clusterInfo) return XLSX.utils.aoa_to_sheet([['No hay información de clusters disponible']]);
    
    // Preparar los datos para la exportación
    const exportData = [
        ['Cluster', 'Valor Central', 'Rango Mínimo', 'Rango Máximo', 'Color']
    ];
    
    // Ordenar clusters por rango
    const sortedClusters = [...clusterInfo].sort((a, b) => a.range.min - b.range.min);
    
    // Agregar datos de cada cluster
    for (const cluster of sortedClusters) {
        exportData.push([
            cluster.index + 1, // Para mostrar cluster 1, 2, 3 en lugar de 0, 1, 2
            cluster.center,
            cluster.range.min,
            cluster.range.max,
            cluster.color
        ]);
    }
    
    return XLSX.utils.aoa_to_sheet(exportData);
}

/**
 * Crea la hoja de registro de errores para Excel
 * @param {Object} errorData - Información de errores
 * @param {Object} config - Configuración
 * @returns {Object} Hoja de cálculo
 */
function createErrorSheet(errorData, config) {
    // Preparar los datos para la exportación
    const exportData = [
        ['Tipo de Error', 'Cantidad', 'Descripción']
    ];
    
    const hasErrors = Object.values(errorData).some(count => count > 0);
    
    if (!hasErrors) {
        exportData.push(['N/A', 0, 'No se encontraron errores en los datos']);
        return XLSX.utils.aoa_to_sheet(exportData);
    }
    
    // Agregar datos de cada tipo de error
    for (const [errorType, count] of Object.entries(errorData)) {
        if (count > 0) {
            const message = config.errorMessages[errorType] || errorType;
            exportData.push([errorType, count, message]);
        }
    }
    
    return XLSX.utils.aoa_to_sheet(exportData);
}