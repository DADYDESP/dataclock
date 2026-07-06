/**
 * Módulo para manejar la selección de parámetros adicionales
 */
import { extractFilterOptions, updatePartidoSelect, updateLocalidadSelect, initializeFilterData, fileData } from './filter-utils.js';
import { createMultiSelect } from './multi-select.js';
import { showLoadingIndicator } from './loading-indicator.js';

// Variables para los selectores múltiples
let partidoMultiSelect = null;
let localidadMultiSelect = null;
let segmentMultiSelect = null;

/**
 * Inicializa los controladores para los parámetros adicionales
 */
export function initParameterSelection() {
    // Referencias a elementos del DOM
    const enablePartidoCheckbox = document.getElementById('enablePartido');
    const enableLocalidadCheckbox = document.getElementById('enableLocalidad');
    const partidoColumnSelect = document.getElementById('partidoColumn');
    const localidadColumnSelect = document.getElementById('localidadColumn');
    const partidoValueSelect = document.getElementById('partidoValue');
    const localidadValueSelect = document.getElementById('localidadValue');

    // References to new segment filter elements
    const enableSegmentCheckbox = document.getElementById('enableSegment');
    const segmentColumnSelect = document.getElementById('segmentColumn');
    const segmentValueSelect = document.getElementById('segmentValue');
    
    // Referencia a elementos del análisis aorístico
    const enableAoristicCheckbox = document.getElementById('enableAoristic');
    const endDateColumnSelect = document.getElementById('endDateColumn');
    const endTimeColumnSelect = document.getElementById('endTimeColumn');
    const locationColumnSelect = document.getElementById('locationColumn');
    
    // Deshabilitar selectores de valores inicialmente
    partidoValueSelect.disabled = true;
    localidadValueSelect.disabled = true;
    segmentValueSelect.disabled = true;
    
    if (enableAoristicCheckbox) {
        endDateColumnSelect.disabled = true;
        endTimeColumnSelect.disabled = true;
        locationColumnSelect.disabled = true;
        
        // Event listener para el checkbox de análisis aorístico
        enableAoristicCheckbox.addEventListener('change', function() {
            const isEnabled = this.checked;
            endDateColumnSelect.disabled = !isEnabled;
            endTimeColumnSelect.disabled = !isEnabled;
            locationColumnSelect.disabled = !isEnabled;
        });
    }
    
    // Crear selectores múltiples
    partidoMultiSelect = createMultiSelect(partidoValueSelect, onPartidoSelectionChange);
    localidadMultiSelect = createMultiSelect(localidadValueSelect);
    segmentMultiSelect = createMultiSelect(segmentValueSelect);
    
    // Deshabilitar inicialmente los botones de selección múltiple
    const partidoMultiButton = partidoValueSelect.nextElementSibling.querySelector('.multi-select-button');
    partidoMultiButton.disabled = true;
    
    const localidadMultiButton = localidadValueSelect.nextElementSibling.querySelector('.multi-select-button');
    localidadMultiButton.disabled = true;

    const segmentMultiButton = segmentValueSelect.nextElementSibling.querySelector('.multi-select-button');
    segmentMultiButton.disabled = true;
    
    // Event listeners para los checkboxes
    enablePartidoCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        partidoColumnSelect.disabled = !isEnabled;
        
        // Habilitar/deshabilitar selector múltiple
        const partidoMultiButton = partidoValueSelect.nextElementSibling.querySelector('.multi-select-button');
        partidoMultiButton.disabled = !isEnabled;
        
        // Si se deshabilita Partido, también deshabilitar Localidad
        if (!isEnabled && enableLocalidadCheckbox.checked) {
            enableLocalidadCheckbox.checked = false;
            localidadColumnSelect.disabled = true;
            
            // Deshabilitar selector múltiple de localidad
            const localidadMultiButton = localidadValueSelect.nextElementSibling.querySelector('.multi-select-button');
            localidadMultiButton.disabled = true;
        }
    });
    
    enableLocalidadCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        localidadColumnSelect.disabled = !isEnabled;
        
        // Habilitar/deshabilitar selector múltiple
        const localidadMultiButton = localidadValueSelect.nextElementSibling.querySelector('.multi-select-button');
        localidadMultiButton.disabled = !isEnabled;
        
        // Si se habilita Localidad, asegurarse que Partido esté habilitado
        if (isEnabled && !enablePartidoCheckbox.checked) {
            enablePartidoCheckbox.checked = true;
            partidoColumnSelect.disabled = false;
            
            // Habilitar selector múltiple de partido
            const partidoMultiButton = partidoValueSelect.nextElementSibling.querySelector('.multi-select-button');
            partidoMultiButton.disabled = false;
        }
    });

     // Event listener for segment checkbox
     enableSegmentCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        segmentColumnSelect.disabled = !isEnabled;
        const segmentMultiButton = segmentValueSelect.nextElementSibling.querySelector('.multi-select-button');
        segmentMultiButton.disabled = !isEnabled;
    });
    
    // Event listener para cambio en columna de partido
    partidoColumnSelect.addEventListener('change', function() {
        updateFilterSelects();
    });
    
    // Event listener para cambio en columna de localidad
    localidadColumnSelect.addEventListener('change', function() {
        updateFilterSelects();
    });

      // Event listener for change in segment column
      segmentColumnSelect.addEventListener('change', function() {
        updateFilterSelects();
    });
}

/**
 * Maneja el cambio en la selección de partidos
 * @param {Array} selectedPartidos - Partidos seleccionados
 */
function onPartidoSelectionChange(selectedPartidos) {
    // Si hay múltiples partidos seleccionados, no filtramos localidades específicas
    if (selectedPartidos.length > 1) {
        // Mantener todas las localidades disponibles sin filtro específico
        updateLocalidadOptionsForMultiplePartidos();
    } else if (selectedPartidos.length === 1) {
        // Si solo hay un partido seleccionado, filtramos localidades para ese partido
        updateLocalidadOptionsForSinglePartido(selectedPartidos[0]);
    } else {
        // Si no hay partidos seleccionados, limpiar opciones de localidad
        localidadMultiSelect.updateOptions([
            { value: '', textContent: 'Seleccione una localidad' }
        ]);
    }
}

/**
 * Actualiza las opciones de localidad cuando hay múltiples partidos seleccionados
 */
function updateLocalidadOptionsForMultiplePartidos() {
    const localidadOptions = [];
    localidadOptions.push({ value: '', textContent: 'Seleccione una localidad' });
    
    // Obtener todas las localidades de todos los partidos
    Object.values(fileData.partidoOptions).forEach(localidades => {
        localidades.forEach(localidad => {
            // Evitar duplicados
            if (!localidadOptions.some(opt => opt.textContent === localidad)) {
                localidadOptions.push({ value: localidad, textContent: localidad });
            }
        });
    });
    
    localidadMultiSelect.updateOptions(localidadOptions);
}

/**
 * Actualiza las opciones de localidad para un partido específico
 * @param {String} partido - Partido seleccionado
 */
function updateLocalidadOptionsForSinglePartido(partido) {
    const localidadOptions = [];
    localidadOptions.push({ value: '', textContent: 'Seleccione una localidad' });
    
    if (fileData.partidoOptions[partido]) {
        fileData.partidoOptions[partido].forEach(localidad => {
            localidadOptions.push({ value: localidad, textContent: localidad });
        });
    }
    
    localidadMultiSelect.updateOptions(localidadOptions);
}

/**
 * Actualiza los selectores con las columnas disponibles
 * @param {Array} columnHeaders - Encabezados de columnas disponibles
 */
export function updateParameterSelects(columnHeaders) {
    const partidoColumnSelect = document.getElementById('partidoColumn');
    const localidadColumnSelect = document.getElementById('localidadColumn');
    const segmentColumnSelect = document.getElementById('segmentColumn');
    
    // Selectores para análisis aorístico
    const endDateColumnSelect = document.getElementById('endDateColumn');
    const endTimeColumnSelect = document.getElementById('endTimeColumn');
    const locationColumnSelect = document.getElementById('locationColumn');
    
    // Limpiar selectores
    partidoColumnSelect.innerHTML = '';
    localidadColumnSelect.innerHTML = '';
    segmentColumnSelect.innerHTML = '';
    
    // Limpiar selectores de análisis aorístico si existen
    if (endDateColumnSelect) endDateColumnSelect.innerHTML = '';
    if (endTimeColumnSelect) endTimeColumnSelect.innerHTML = '';
    if (locationColumnSelect) locationColumnSelect.innerHTML = '';
    
    // Opción por defecto
    const defaultPartidoOption = document.createElement('option');
    defaultPartidoOption.value = '';
    defaultPartidoOption.textContent = 'Seleccione columna de Partido';
    partidoColumnSelect.appendChild(defaultPartidoOption);
    
    const defaultLocalidadOption = document.createElement('option');
    defaultLocalidadOption.value = '';
    defaultLocalidadOption.textContent = 'Seleccione columna de Localidad';
    localidadColumnSelect.appendChild(defaultLocalidadOption);

    const defaultSegmentOption = document.createElement('option');
    defaultSegmentOption.value = '';
    defaultSegmentOption.textContent = 'Seleccione columna de Segmento';
    segmentColumnSelect.appendChild(defaultSegmentOption);
    
    // Opciones por defecto para análisis aorístico
    if (endDateColumnSelect) {
        const defaultEndDateOption = document.createElement('option');
        defaultEndDateOption.value = '';
        defaultEndDateOption.textContent = 'Seleccione columna de Fecha Fin';
        endDateColumnSelect.appendChild(defaultEndDateOption);
    }
    
    if (endTimeColumnSelect) {
        const defaultEndTimeOption = document.createElement('option');
        defaultEndTimeOption.value = '';
        defaultEndTimeOption.textContent = 'Seleccione columna de Hora Fin';
        endTimeColumnSelect.appendChild(defaultEndTimeOption);
    }
    
    if (locationColumnSelect) {
        const defaultLocationOption = document.createElement('option');
        defaultLocationOption.value = '';
        defaultLocationOption.textContent = 'Seleccione columna de Ubicación';
        locationColumnSelect.appendChild(defaultLocationOption);
    }
    
    // Agregar opciones de columnas
    columnHeaders.forEach((option, index) => {
        // Para Partido
        const partidoElement = document.createElement('option');
        partidoElement.value = index;
        partidoElement.textContent = option;
        partidoColumnSelect.appendChild(partidoElement);
        
        // Para Localidad
        const localidadElement = document.createElement('option');
        localidadElement.value = index;
        localidadElement.textContent = option;
        localidadColumnSelect.appendChild(localidadElement);

         // Para Segment
         const segmentElement = document.createElement('option');
         segmentElement.value = index;
         segmentElement.textContent = option;
         segmentColumnSelect.appendChild(segmentElement);
        
        // Para análisis aorístico
        if (endDateColumnSelect) {
            const endDateElement = document.createElement('option');
            endDateElement.value = index;
            endDateElement.textContent = option;
            endDateColumnSelect.appendChild(endDateElement);
        }
        
        if (endTimeColumnSelect) {
            const endTimeElement = document.createElement('option');
            endTimeElement.value = index;
            endTimeElement.textContent = option;
            endTimeColumnSelect.appendChild(endTimeElement);
        }
        
        if (locationColumnSelect) {
            const locationElement = document.createElement('option');
            locationElement.value = index;
            locationElement.textContent = option;
            locationColumnSelect.appendChild(locationElement);
        }
    });
}

/**
 * Inicializa los datos del filtro con los datos del archivo
 * @param {Array} sheetData - Datos del archivo
 */
export function initializeFilters(sheetData) {
    initializeFilterData(sheetData);
}

/**
 * Actualiza los selectores de valores basados en las columnas seleccionadas
 */
function updateFilterSelects() {
    const partidoColumnSelect = document.getElementById('partidoColumn');
    const localidadColumnSelect = document.getElementById('localidadColumn');
    const segmentColumnSelect = document.getElementById('segmentColumn');
    
    const partidoColumnIndex = parseInt(partidoColumnSelect.value);
    const localidadColumnIndex = parseInt(localidadColumnSelect.value);
    const segmentColumnIndex = parseInt(segmentColumnSelect.value);
    
    if (isNaN(partidoColumnIndex) || isNaN(localidadColumnIndex) || isNaN(segmentColumnIndex)) {
        return;
    }
    
    // Mostrar indicador de carga
    const loadingIndicator = showLoadingIndicator(document.querySelector('.filter-parameters'), 'Cargando opciones...');
    
    // Usar setTimeout para permitir que la UI se actualice antes de procesar
    setTimeout(() => {
        try {
            // Extract options de filtro
            extractFilterOptions(partidoColumnIndex, localidadColumnIndex);
            
            // Preparar opciones para el selector múltiple de partido
            const partidoOptions = [{ value: '', textContent: 'Seleccione un partido' }];
            
            // Obtener partidos ordenados alfabéticamente
            const partidos = Object.keys(fileData.partidoOptions).sort();
            partidos.forEach(partido => {
                partidoOptions.push({ value: partido, textContent: partido });
            });
            
            // Actualizar selector múltiple de partido
            partidoMultiSelect.updateOptions(partidoOptions);
            
            // Limpiar selector de localidad hasta que se seleccione un partido
            localidadMultiSelect.updateOptions([
                { value: '', textContent: 'Seleccione una localidad' }
            ]);

            const segmentOptions = prepareSegmentOptions(segmentColumnIndex);
            segmentMultiSelect.updateOptions(segmentOptions);
        } catch (error) {
            console.error('Error al actualizar selectores:', error);
        } finally {
            // Quitar indicador de carga
            loadingIndicator.remove();
        }
    }, 10);
}

function prepareSegmentOptions(segmentColumnIndex) {
    const segmentOptions = [{ value: '', textContent: 'Seleccione un segmento' }];

    if (segmentColumnIndex >= 0 && fileData.rawData) {
        const uniqueSegmentValues = new Set();
        for (let i = 1; i < fileData.rawData.length; i++) {
            const row = fileData.rawData[i];
            if (row && row[segmentColumnIndex]) {
                uniqueSegmentValues.add(row[segmentColumnIndex].toString().trim());
            }
        }

        const sortedSegmentValues = Array.from(uniqueSegmentValues).sort();
        sortedSegmentValues.forEach(segment => {
            segmentOptions.push({ value: segment, textContent: segment });
        });
    }

    return segmentOptions;
}

/**
 * Obtiene los filtros seleccionados
 * @returns {Object} Objeto con información de filtros
 */
export function getSelectedFilters() {
    const enablePartido = document.getElementById('enablePartido').checked;
    const enableLocalidad = document.getElementById('enableLocalidad').checked;
    const enableSegment = document.getElementById('enableSegment').checked;
    const enableAoristic = document.getElementById('enableAoristic')?.checked || false;
    
    const filters = {
        partido: {
            enabled: enablePartido,
            columnIndex: enablePartido ? parseInt(document.getElementById('partidoColumn').value) : -1,
            values: enablePartido ? partidoMultiSelect.getSelectedValues() : []
        },
        localidad: {
            enabled: enableLocalidad,
            columnIndex: enableLocalidad ? parseInt(document.getElementById('localidadColumn').value) : -1,
            values: enableLocalidad ? localidadMultiSelect.getSelectedValues() : []
        },
        segment: {
            enabled: enableSegment,
            columnIndex: enableSegment ? parseInt(document.getElementById('segmentColumn').value) : -1,
            values: enableSegment ? segmentMultiSelect.getSelectedValues() : []
        }
    };
    
    // Añadir configuración de análisis aorístico si está habilitado
    if (enableAoristic) {
        filters.aoristic = {
            enabled: true,
            endDateColumnIndex: parseInt(document.getElementById('endDateColumn').value),
            endTimeColumnIndex: parseInt(document.getElementById('endTimeColumn').value),
            locationColumnIndex: parseInt(document.getElementById('locationColumn').value) 
        };
    }
    
    return filters;
}

/**
 * Genera el título para la matriz basado en los filtros
 * @param {Object} filterData - Datos de los filtros aplicados
 * @returns {String} Título personalizado
 */
export function generateMatrixTitle(filterData = {}) {
    let title = 'Matriz de Eventos';
    
    // Si hay partido en filterData
    if (filterData.partido) {
        title += ` - Partido: ${filterData.partido}`;
    } 
    // Si hay partidos (múltiples) en filterData
    else if (filterData.partidos) {
        if (filterData.partidos.length <= 3) {
            title += ` - Partidos: ${filterData.partidos.join(', ')}`;
        } else {
            title += ` - Partidos: ${filterData.partidos.length} seleccionados`;
        }
    }
    
    // Agregar localidades si están presentes
    if (filterData.localidad) {
        title += ` - Localidad: ${filterData.localidad}`;
    } else if (filterData.localidades) {
        if (filterData.localidades.length <= 2) {
            title += ` - Localidades: ${filterData.localidades.join(', ')}`;
        } else {
            title += ` - Localidades: ${filterData.localidades.length} seleccionadas`;
        }
    }

      // Agregar segmentos si están presentes
    if (filterData.segment) {
        title += ` - Segmento: ${filterData.segment}`;
    } else if (filterData.segments) {
        if (filterData.segments.length <= 2) {
            title += ` - Segmentos: ${filterData.segments.join(', ')}`;
        } else {
            title += ` - Segmentos: ${filterData.segments.length} seleccionados`;
        }
    }
    
    return title;
}