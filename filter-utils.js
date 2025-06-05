/**
 * Utilidades para el filtrado dinámico de datos
 */

// Almacena datos extraídos del archivo
export let fileData = {
    partidoOptions: {},  // Estructura: {partidoValue: [localidadValues]}
    rawData: null        // Datos completos del archivo
};

/**
 * Inicializa el módulo con los datos del archivo
 * @param {Array} data - Datos del archivo (filas)
 */
export function initializeFilterData(data) {
    fileData.rawData = data;
}

/**
 * Extrae las opciones de partido y localidad del archivo
 * @param {Number} partidoColumnIndex - Índice de la columna de partido
 * @param {Number} localidadColumnIndex - Índice de la columna de localidad
 */
export function extractFilterOptions(partidoColumnIndex, localidadColumnIndex) {
    if (!fileData.rawData || partidoColumnIndex < 0 || localidadColumnIndex < 0) {
        return;
    }
    
    // Reiniciar opciones
    fileData.partidoOptions = {};
    
    // Comenzar desde la segunda fila (saltar encabezados)
    for (let i = 1; i < fileData.rawData.length; i++) {
        const row = fileData.rawData[i];
        if (!row) continue;
        
        const partidoValue = row[partidoColumnIndex]?.toString().trim();
        const localidadValue = row[localidadColumnIndex]?.toString().trim();
        
        if (partidoValue) {
            // Inicializar array de localidades si es la primera vez que vemos este partido
            if (!fileData.partidoOptions[partidoValue]) {
                fileData.partidoOptions[partidoValue] = [];
            }
            
            // Agregar localidad si existe y no está duplicada
            if (localidadValue && !fileData.partidoOptions[partidoValue].includes(localidadValue)) {
                fileData.partidoOptions[partidoValue].push(localidadValue);
            }
        }
    }
    
    // Ordenar las localidades alfabéticamente
    for (const partido in fileData.partidoOptions) {
        fileData.partidoOptions[partido].sort();
    }
}

/**
 * Filtra los datos según los criterios de partido y localidad
 * @param {Array} data - Fila de datos a filtrar
 * @param {Object} filters - Filtros de partido y localidad
 * @param {Number} partidoColumnIndex - Índice de la columna de partido
 * @param {Number} localidadColumnIndex - Índice de la columna de localidad
 * @returns {Boolean} - True si la fila cumple con los filtros
 */
export function applyFilters(data, filters, partidoColumnIndex, localidadColumnIndex) {
    // Si los filtros no están habilitados, aceptar todos los datos
    if (!filters.partido.enabled && !filters.localidad.enabled && !filters.segment.enabled) {
        return true;
    }
    
    // Filtrar por partido si está habilitado
    if (filters.partido.enabled && partidoColumnIndex >= 0) {
        const partidoValue = data[partidoColumnIndex]?.toString().trim();
        
        // Si hay valores seleccionados y el valor actual no está entre ellos, rechazar
        if (filters.partido.values && filters.partido.values.length > 0 && 
            !filters.partido.values.includes(partidoValue)) {
            return false;
        }
        
        // Si no hay valores seleccionados pero no hay dato de partido, rechazar
        if ((!filters.partido.values || filters.partido.values.length === 0) && !partidoValue) {
            return false;
        }
    }
    
    // Filtrar por localidad si está habilitado
    if (filters.localidad.enabled && localidadColumnIndex >= 0) {
        const localidadValue = data[localidadColumnIndex]?.toString().trim();
        
        // Si hay valores seleccionados y el valor actual no está entre ellos, rechazar
        if (filters.localidad.values && filters.localidad.values.length > 0 && 
            !filters.localidad.values.includes(localidadValue)) {
            return false;
        }
        
        // Si no hay valores seleccionados pero no hay dato de localidad, rechazar
        if ((!filters.localidad.values || filters.localidad.values.length === 0) && !localidadValue) {
            return false;
        }
    }

     // Filtrar por segment si está habilitado
     if (filters.segment.enabled) {
        const segmentColumnIndex = filters.segment.columnIndex;
        if (segmentColumnIndex >= 0) {
            const segmentValue = data[segmentColumnIndex]?.toString().trim();

            if (filters.segment.values && filters.segment.values.length > 0 &&
                !filters.segment.values.includes(segmentValue)) {
                return false;
            }

             // Si no hay valores seleccionados pero no hay dato de segment, rechazar
             if ((!filters.segment.values || filters.segment.values.length === 0) && !segmentValue) {
                return false;
            }
        }
    }
    
    // Si pasa todos los filtros, aceptar
    return true;
}

/**
 * Actualiza el selector de partidos con las opciones disponibles
 * @param {HTMLElement} partidoSelect - Elemento select para partidos
 */
export function updatePartidoSelect(partidoSelect) {
    // Limpiar selector
    partidoSelect.innerHTML = '';
    
    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccione un partido';
    partidoSelect.appendChild(defaultOption);
    
    // Agregar opciones de partidos ordenados alfabéticamente
    const partidos = Object.keys(fileData.partidoOptions).sort();
    
    partidos.forEach(partido => {
        const option = document.createElement('option');
        option.value = partido;
        option.textContent = partido;
        partidoSelect.appendChild(option);
    });
}

/**
 * Actualiza el selector de localidades basado en el partido seleccionado
 * @param {HTMLElement} localidadSelect - Elemento select para localidades
 * @param {String} selectedPartido - Partido seleccionado
 */
export function updateLocalidadSelect(localidadSelect, selectedPartido) {
    // Limpiar selector
    localidadSelect.innerHTML = '';
    
    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccione una localidad';
    localidadSelect.appendChild(defaultOption);
    
    // Si no hay partido seleccionado o no hay localidades, salir
    if (!selectedPartido || !fileData.partidoOptions[selectedPartido]) {
        return;
    }
    
    // Agregar opciones de localidades para el partido seleccionado
    fileData.partidoOptions[selectedPartido].forEach(localidad => {
        const option = document.createElement('option');
        option.value = localidad;
        option.textContent = localidad;
        localidadSelect.appendChild(option);
    });
}

/**
 * Obtiene los valores seleccionados
 * @returns {Object} Valores seleccionados de partido y localidad
 */
export function getSelectedFilterValues() {
    // Esta función ahora es manejada por los componentes multi-select
    // Se mantiene por compatibilidad
    return {
        partido: [],
        localidad: []
    };
}