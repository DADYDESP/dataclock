/**
 * Módulo para análisis aorístico
 * Implementa funcionalidades para el análisis de probabilidad en intervalo de tiempo
 * y patrones espaciales para datos de eventos delictivos.
 */

import { applyFilters } from './filter-utils.js';
import { exportTableToPNG } from './export-image.js';
import { performKMeansClustering } from './clustering.js';

// Constantes para clasificación
const TEMPORAL_PATTERNS = {
    AGUDO: 'Agudo',     // Alta concentración en pocas horas
    ENFOCADO: 'Enfocado', // Concentración moderada en periodos específicos
    DIFUSO: 'Difuso'      // Distribución sin concentraciones claras
};

const SPATIAL_PATTERNS = {
    PUNTO_CALIENTE: 'Punto caliente', // Alta concentración en espacio reducido
    AGRUPAMIENTO: 'Agrupamiento',     // Agrupaciones dispersas  
    DISPERSION: 'Dispersión'          // Sin agrupaciones claras
};

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Almacena los resultados del análisis
let aoristicResults = null;

/**
 * Inicializa el módulo de análisis aorístico
 */
export function initAoristicAnalysis() {
    // Configurar eventos para las pestañas
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remover clase activa de todos los botones
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Añadir clase activa al botón actual
            this.classList.add('active');
            
            // Ocultar todos los paneles
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Mostrar el panel correspondiente
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Configurar evento para exportación
    document.getElementById('exportAoristicButton').addEventListener('click', exportAoristicResults);
}

/**
 * Realiza el análisis aorístico en los datos
 * @param {Array} sheetData - Datos del archivo
 * @param {Object} filters - Filtros aplicados
 * @param {Object} errorData - Registro de errores
 * @returns {Object} Resultados del análisis
 */
export function performAoristicAnalysis(sheetData, filters, errorData) {
    // Verificar si el análisis aorístico está habilitado
    if (!filters.aoristic || !filters.aoristic.enabled) {
        return null;
    }
    
    // Obtener índices de columnas
    const startDateColumnIndex = parseInt(document.getElementById('dateColumn').value);
    const startTimeColumnIndex = parseInt(document.getElementById('timeColumn').value);
    const endDateColumnIndex = filters.aoristic.endDateColumnIndex;
    const endTimeColumnIndex = filters.aoristic.endTimeColumnIndex;
    const locationColumnIndex = filters.aoristic.locationColumnIndex;
    
    // Verificar que todas las columnas necesarias estén seleccionadas
    if (isNaN(startDateColumnIndex) || isNaN(startTimeColumnIndex) || 
        isNaN(endDateColumnIndex) || isNaN(endTimeColumnIndex)) {
        console.error('Columnas requeridas no seleccionadas para análisis aorístico');
        return null;
    }

    // Obtener las columnas para filtros adicionales
    const partidoColumnIndex = filters.partido && filters.partido.enabled ? filters.partido.columnIndex : -1;
    const localidadColumnIndex = filters.localidad && filters.localidad.enabled ? filters.localidad.columnIndex : -1;
    const segmentColumnIndex = filters.segment && filters.segment.enabled ? filters.segment.columnIndex : -1;
    
    // Inicializar estructura para probabilidades por hora
    const hourlyProbabilities = Array(24).fill(0);
    
    // Inicializar estructura para ubicaciones
    const locationData = [];
    
    // Inicializar estructura para intervalos completos (día-hora)
    const intervalData = [];
    
    // Contador de eventos procesados correctamente
    let validEventCount = 0;
    
    // Procesar cada fila de datos (excluyendo la fila de encabezados)
    for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        
        // Verificar que la fila tenga datos en las columnas requeridas
        if (!row[startDateColumnIndex] || !row[startTimeColumnIndex] ||
            !row[endDateColumnIndex] || !row[endTimeColumnIndex]) {
            continue; // Saltar filas sin datos completos
        }

        // Aplicar los mismos filtros que en el análisis principal
        if (!applyFilters(row, filters, partidoColumnIndex, localidadColumnIndex, segmentColumnIndex)) {
            continue; // Saltar filas que no cumplen con los filtros
        }
        
        try {
            // Parsear fecha y hora de inicio
            const startDate = window.parseDate(row[startDateColumnIndex]);
            const startTime = window.parseTime(row[startTimeColumnIndex]);
            
            if (!startDate || !startTime) {
                continue; // Saltar si no se puede parsear fecha/hora inicio
            }
            
            // Parsear fecha y hora de fin
            const endDate = window.parseDate(row[endDateColumnIndex]);
            const endTime = window.parseTime(row[endTimeColumnIndex]);
            
            if (!endDate || !endTime) {
                continue; // Saltar si no se puede parsear fecha/hora fin
            }
            
            // Crear objetos DateTime para inicio y fin
            const startDateTime = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate(),
                startTime.getHours(),
                startTime.getMinutes(),
                startTime.getSeconds()
            );
            
            const endDateTime = new Date(
                endDate.getFullYear(),
                endDate.getMonth(),
                endDate.getDate(),
                endTime.getHours(),
                endTime.getMinutes(),
                endTime.getSeconds()
            );

            // Verificar si es un evento puntual (mismo día y hora)
            if (startDateTime.getTime() === endDateTime.getTime()) {
                // Para eventos puntuales, asignar probabilidad 1 a ese intervalo específico
                const dayOfWeek = startDateTime.getDay();
                // Ajustar para que 0 = Lunes, ..., 6 = Domingo
                const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const hourOfDay = startDateTime.getHours();

                // Agregar probabilidad 1 al intervalo exacto
                let intervals = [{
                    day: adjustedDayOfWeek,
                    hour: hourOfDay,
                    probability: 1
                }];

                // Actualizar contadores y estructuras de datos
                intervalData.push(...intervals);
                
                // Registrar datos de ubicación si está disponible
                if (locationColumnIndex >= 0 && row[locationColumnIndex]) {
                    locationData.push({
                        location: row[locationColumnIndex],
                        intervals: intervals,
                        probability: 1
                    });
                }
                
                validEventCount++;
                continue; // Pasar al siguiente registro
            }
            
            // Verificar que la fecha de fin sea posterior a la de inicio
            if (endDateTime <= startDateTime) {
                continue; // Saltar intervalo inválido
            }

            // Calcular todos los intervalos de hora completos involucrados
            const intervals = calculateIntervals(startDateTime, endDateTime);
            
            if (intervals.length > 0) {
                // Calcular probabilidad por intervalo (distribución uniforme)
                const probability = 1 / intervals.length;
                
                // Acumular probabilidad en cada hora sin considerar el día
                for (const interval of intervals) {
                    hourlyProbabilities[interval.hour] += probability;
                    
                    // Guardar intervalo completo (día y hora)
                    intervalData.push({
                        day: interval.day,
                        hour: interval.hour,
                        probability: probability
                    });
                }
                
                // Registrar datos de ubicación si está disponible
                if (locationColumnIndex >= 0 && row[locationColumnIndex]) {
                    locationData.push({
                        location: row[locationColumnIndex],
                        intervals: intervals,
                        probability: probability
                    });
                }
                
                validEventCount++;
            }
        } catch (error) {
            console.error('Error al procesar fila para análisis aorístico:', error);
            errorData.invalidAoristic = (errorData.invalidAoristic || 0) + 1;
        }
    }
    
    // Calcular total de filas excluyendo encabezado
    const totalRows = sheetData.length - 1;
    const unprocessedEvents = totalRows - validEventCount;

    // Si no hay eventos válidos, retornar null
    if (validEventCount === 0) {
        return null;
    }
    
    // Normalizar probabilidades para que sumen 1
    const totalProbability = hourlyProbabilities.reduce((sum, p) => sum + p, 0);
    if (totalProbability > 0) {
        for (let i = 0; i < hourlyProbabilities.length; i++) {
            hourlyProbabilities[i] /= totalProbability;
        }
    }
    
    // Clasificar patrón temporal
    const temporalPattern = classifyTemporalPattern(hourlyProbabilities);
    
    // Clasificar patrón espacial
    const spatialPattern = classifySpatialPattern(locationData);
    
    // Crear matriz espacio-temporal
    const spatioTemporalMatrix = createSpatioTemporalMatrix(temporalPattern, spatialPattern);
    
    // Guardar resultados incluyendo los datos de error
    const results = {
        hourlyProbabilities: hourlyProbabilities,
        locationData: locationData,
        intervalData: intervalData,
        validEventCount: validEventCount,
        totalRows: totalRows,
        unprocessedEvents: unprocessedEvents,
        temporalPattern: temporalPattern,
        spatialPattern: spatialPattern,
        spatioTemporalMatrix: spatioTemporalMatrix,
        errorData: errorData
    };
    
    return results;
}

/**
 * Visualiza los resultados del análisis aorístico
 * @param {Object} results - Resultados del análisis
 */
export function visualizeAoristicResults(results) {
    // Guardar los resultados globalmente
    aoristicResults = results;
    
    // Mostrar la sección de resultados
    document.getElementById('aoristicResults').style.display = 'block';
    
    // Visualizar resumen del análisis
    visualizeAoristicSummary(results);
    
    // Visualizar patrones temporales
    visualizeTemporalPatterns(results);
    
    // Visualizar patrones espaciales
    visualizeSpatialPatterns(results);
    
    // Visualizar matriz espacio-temporal
    visualizeSpatioTemporalMatrix(results);
}

/**
 * Crea y visualiza la matriz día-hora para análisis aorístico
 * @param {Object} results - Resultados del análisis
 * @param {Array} colors - Colores para el clustering
 */
export function visualizeDayHourMatrix(results, colors) {
    const container = document.getElementById('dayHourMatrixContainer');
    container.innerHTML = '';
    
    if (!results || !results.intervalData || results.intervalData.length === 0) {
        const noDataMessage = document.createElement('div');
        noDataMessage.className = 'no-data-message';
        noDataMessage.textContent = 'No hay datos suficientes para generar la matriz aorística.';
        container.appendChild(noDataMessage);
        return;
    }
    
    // Título para la matriz de probabilidad
    const probabilityTitle = document.createElement('h4');
    probabilityTitle.textContent = 'Matriz Aorística Día-Hora';
    container.appendChild(probabilityTitle);
    
    // Crear matriz de día x hora para probabilidades
    const dayHourMatrix = createDayHourMatrix(results.intervalData);
    const matrixTable = createMatrixTable(dayHourMatrix, colors, 'probability');
    matrixTable.id = 'dayHourMatrix';
    container.appendChild(matrixTable);
    
    // Crear leyenda para la matriz de probabilidad
    createMatrixLegend(container, 'Leyenda de Valores', 'Cada celda muestra la probabilidad acumulada para ese día y hora', 'probability');
    
    // Título para la matriz de porcentajes
    const percentageTitle = document.createElement('h4');
    percentageTitle.style.marginTop = '30px';
    percentageTitle.textContent = 'Matriz Aorística Día-Hora (Porcentajes)';
    container.appendChild(percentageTitle);
    
    // Crear matriz de día x hora para porcentajes
    const percentageMatrix = createPercentageMatrix(dayHourMatrix, results.validEventCount);
    const percentageTable = createMatrixTable(percentageMatrix, colors, 'percentage');
    percentageTable.id = 'dayHourPercentageMatrix';
    container.appendChild(percentageTable);
    
    // Crear leyenda para la matriz de porcentajes
    createMatrixLegend(container, 'Leyenda de Porcentajes', 'Cada celda muestra el porcentaje respecto al total de eventos analizados', 'percentage');
}

/**
 * Crea una leyenda para la matriz
 * @param {HTMLElement} container - Contenedor donde se agregará la leyenda
 * @param {string} title - Título de la leyenda
 * @param {string} description - Descripción de la leyenda
 * @param {string} type - Tipo de matriz ('probability' o 'percentage')
 */
function createMatrixLegend(container, title, description, type = 'probability') {
    const legendContainer = document.createElement('div');
    legendContainer.className = 'aoristic-color-legend';
    
    const legendTitle = document.createElement('h5');
    legendTitle.textContent = title;
    legendContainer.appendChild(legendTitle);
    
    const legendDescription = document.createElement('p');
    legendDescription.textContent = description;
    legendDescription.style.fontSize = '0.9rem';
    legendDescription.style.color = '#666';
    legendContainer.appendChild(legendDescription);
    
    const legendItems = document.createElement('div');
    legendItems.className = 'aoristic-legend-items';
    
    // Mostrar los colores de clusters según el tipo
    const clusterInfo = type === 'percentage' ? window.percentageClusterInfo : window.probabilityClusterInfo;
    
    if (clusterInfo) {
        // Ordenar clusters por valor
        const sortedClusters = [...clusterInfo].sort((a, b) => a.range.min - b.range.min);
        
        // Crear elemento para cada cluster
        for (const cluster of sortedClusters) {
            const item = document.createElement('div');
            item.className = 'aoristic-legend-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'aoristic-color-box';
            colorBox.style.backgroundColor = cluster.color;
            
            const label = document.createElement('span');
            // Formatear según el tipo
            if (type === 'percentage') {
                if (cluster.range.min === cluster.range.max) {
                    label.textContent = `${cluster.range.min.toFixed(2)}%`;
                } else {
                    label.textContent = `${cluster.range.min.toFixed(2)}% a ${cluster.range.max.toFixed(2)}%`;
                }
            } else {
                // Evitar decimales en números enteros para probability
                if (cluster.range.min === cluster.range.max) {
                    const displayValue = Number.isInteger(cluster.range.min) ? 
                        cluster.range.min : cluster.range.min.toFixed(4);
                    label.textContent = `${displayValue}`;
                } else {
                    const minDisplay = Number.isInteger(cluster.range.min) ? 
                        cluster.range.min : cluster.range.min.toFixed(4);
                    const maxDisplay = Number.isInteger(cluster.range.max) ? 
                        cluster.range.max : cluster.range.max.toFixed(4);
                    label.textContent = `${minDisplay} a ${maxDisplay}`;
                }
            }
            
            item.appendChild(colorBox);
            item.appendChild(label);
            legendItems.appendChild(item);
        }
    }
    
    legendContainer.appendChild(legendItems);
    container.appendChild(legendContainer);
}

/**
 * Calcula los intervalos de hora completos entre dos fechas
 * @param {Date} startDateTime - Fecha y hora de inicio
 * @param {Date} endDateTime - Fecha y hora de fin
 * @returns {Array} Array de intervalos {day, hour}
 */
function calculateIntervals(startDateTime, endDateTime) {
    const intervals = [];
    
    // Clonar las fechas para no modificar los originales
    let currentDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    
    // Redondear al inicio de la hora para la fecha actual
    currentDate.setMinutes(0, 0, 0);
    
    // Avanzar a la siguiente hora completa si no estamos al inicio de una hora
    if (startDateTime.getMinutes() > 0 || startDateTime.getSeconds() > 0) {
        currentDate.setHours(currentDate.getHours() + 1);
    }
    
    // Redondear hacia abajo la hora final
    const endHour = new Date(endDate);
    endHour.setMinutes(0, 0, 0);
    
    // Iterar mientras la fecha actual sea anterior a la fecha final
    while (currentDate < endHour) {
        const dayOfWeek = currentDate.getDay();
        // Ajustar para que 0 = Lunes, ..., 6 = Domingo
        const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        intervals.push({
            day: adjustedDayOfWeek,
            hour: currentDate.getHours(),
            probability: 0 // Se calculará después
        });
        
        // Avanzar a la siguiente hora
        currentDate.setHours(currentDate.getHours() + 1);
    }
    
    return intervals;
}

/**
 * Clasifica el patrón temporal basado en las probabilidades por hora
 * @param {Array} hourlyProbabilities - Probabilidades por hora
 * @returns {Object} Clasificación del patrón temporal
 */
function classifyTemporalPattern(hourlyProbabilities) {
    // Ordenar horas por probabilidad (de mayor a menor)
    const sortedHours = [...hourlyProbabilities]
        .map((prob, hour) => ({ hour, prob }))
        .sort((a, b) => b.prob - a.prob);
    
    // Calcular métricas para clasificación
    let cumulativeProbability = 0;
    let hoursFor50Percent = 0;
    
    // Encontrar cuántas horas contienen el 50% de probabilidad
    for (const hourData of sortedHours) {
        cumulativeProbability += hourData.prob;
        hoursFor50Percent++;
        
        if (cumulativeProbability >= 0.5) {
            break;
        }
    }
    
    // Calcular coeficiente de variación (desviación estándar / media)
    const mean = 1 / 24; // Distribución uniforme perfecta
    const sumSquaredDiffs = hourlyProbabilities.reduce((sum, prob) => sum + Math.pow(prob - mean, 2), 0);
    const variance = sumSquaredDiffs / 24;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    
    // Determinar las horas con mayor probabilidad (top 3)
    const topHours = sortedHours.slice(0, 3).map(h => ({
        hour: h.hour,
        probability: h.prob
    }));
    
    // Clasificar basado en las métricas
    let patternType;
    let confidence;
    
    if (hoursFor50Percent <= 4) {
        patternType = TEMPORAL_PATTERNS.AGUDO;
        confidence = cv > 1.5 ? 'Alta' : 'Media';
    } else if (hoursFor50Percent <= 8) {
        patternType = TEMPORAL_PATTERNS.ENFOCADO;
        confidence = cv > 0.8 ? 'Alta' : 'Media';
    } else {
        patternType = TEMPORAL_PATTERNS.DIFUSO;
        confidence = cv < 0.5 ? 'Alta' : 'Media';
    }
    
    // Generar descripción interpretativa
    let description = '';
    switch (patternType) {
        case TEMPORAL_PATTERNS.AGUDO:
            description = `Patrón temporal altamente concentrado. El 50% de la probabilidad se encuentra en solo ${hoursFor50Percent} horas del día. Esto indica momentos específicos de alta actividad que requieren atención focalizada.`;
            break;
        case TEMPORAL_PATTERNS.ENFOCADO:
            description = `Patrón temporal moderadamente concentrado. El 50% de la probabilidad se distribuye en ${hoursFor50Percent} horas. Existen periodos de mayor actividad, pero no tan marcados como en un patrón agudo.`;
            break;
        case TEMPORAL_PATTERNS.DIFUSO:
            description = `Patrón temporal disperso. El 50% de la probabilidad abarca ${hoursFor50Percent} horas, indicando una distribución más uniforme a lo largo del día sin picos horarios claros.`;
            break;
    }
    
    return {
        type: patternType,
        metrics: {
            hoursFor50Percent,
            coefficientOfVariation: cv.toFixed(2),
            topHours
        },
        confidence,
        description
    };
}

/**
 * Clasifica el patrón espacial basado en los datos de ubicación
 * @param {Array} locationData - Datos de ubicación
 * @returns {Object} Clasificación del patrón espacial
 */
function classifySpatialPattern(locationData) {
    // Si no hay datos de ubicación, retornar un patrón indefinido
    if (!locationData || locationData.length === 0) {
        return {
            type: 'Indefinido',
            metrics: {
                uniqueLocations: 0,
                topPercent: 0,
                dispersal: 0
            },
            confidence: 'Baja',
            description: 'No hay datos de ubicación disponibles para análisis.'
        };
    }
    
    // Contar la frecuencia de cada ubicación
    const locationCounts = {};
    let totalProbability = 0;
    
    locationData.forEach(item => {
        const location = item.location;
        const probability = item.probability * item.intervals.length;
        
        if (!locationCounts[location]) {
            locationCounts[location] = 0;
        }
        
        locationCounts[location] += probability;
        totalProbability += probability;
    });
    
    // Crear array de ubicaciones con su frecuencia y porcentaje
    const locations = Object.keys(locationCounts).map(location => ({
        location,
        count: locationCounts[location],
        percentage: (locationCounts[location] / totalProbability) * 100
    }));
    
    // Ordenar por frecuencia (de mayor a menor)
    locations.sort((a, b) => b.count - a.count);
    
    // Calcular métricas para clasificación
    const uniqueLocations = locations.length;
    const topLocationPercent = uniqueLocations > 0 ? locations[0].percentage : 0;
    
    // Calcular índice de dispersión (similar al coeficiente de variación)
    const expectedProbability = 1 / uniqueLocations; // Distribución uniforme perfecta
    const sumSquaredDiffs = locations.reduce(
        (sum, loc) => sum + Math.pow((loc.count / totalProbability) - expectedProbability, 2), 
        0
    );
    
    const dispersal = uniqueLocations > 1 
        ? Math.sqrt(sumSquaredDiffs / uniqueLocations) / expectedProbability 
        : 0;
    
    // Determinar clasificación
    let patternType;
    let confidence;
    
    if (uniqueLocations === 1 || topLocationPercent > 60) {
        patternType = SPATIAL_PATTERNS.PUNTO_CALIENTE;
        confidence = topLocationPercent > 75 ? 'Alta' : 'Media';
    } else if (topLocationPercent > 25 || dispersal > 1.0) {
        patternType = SPATIAL_PATTERNS.AGRUPAMIENTO;
        confidence = (topLocationPercent > 35 || dispersal > 1.5) ? 'Alta' : 'Media';
    } else {
        patternType = SPATIAL_PATTERNS.DISPERSION;
        confidence = (uniqueLocations > 10 && topLocationPercent < 15) ? 'Alta' : 'Media';
    }
    
    // Generar descripción interpretativa
    let description = '';
    switch (patternType) {
        case SPATIAL_PATTERNS.PUNTO_CALIENTE:
            description = `Patrón espacial altamente concentrado. La ubicación principal representa el ${topLocationPercent.toFixed(1)}% de los eventos, indicando un "punto caliente" claro que requiere atención focalizada.`;
            break;
        case SPATIAL_PATTERNS.AGRUPAMIENTO:
            description = `Patrón espacial con agrupamientos definidos. Se detectan ${uniqueLocations} ubicaciones distintas, con la principal representando el ${topLocationPercent.toFixed(1)}% de los eventos.`;
            break;
        case SPATIAL_PATTERNS.DISPERSION:
            description = `Patrón espacial disperso. Los eventos están distribuidos entre ${uniqueLocations} ubicaciones diferentes, sin concentraciones dominantes.`;
            break;
    }
    
    return {
        type: patternType,
        metrics: {
            uniqueLocations,
            topPercent: topLocationPercent.toFixed(1),
            dispersal: dispersal.toFixed(2)
        },
        topLocations: locations.slice(0, 10), // Top 10 ubicaciones
        confidence,
        description
    };
}

/**
 * Crea una matriz espacio-temporal para clasificación operativa
 * @param {Object} temporalPattern - Patrón temporal
 * @param {Object} spatialPattern - Patrón espacial
 * @returns {Object} Matriz espacio-temporal
 */
function createSpatioTemporalMatrix(temporalPattern, spatialPattern) {
    // Ensure valid pattern types with fallbacks
    const validTemporalType = Object.values(TEMPORAL_PATTERNS).includes(temporalPattern.type) 
        ? temporalPattern.type 
        : TEMPORAL_PATTERNS.DIFUSO;
    
    const validSpatialType = Object.values(SPATIAL_PATTERNS).includes(spatialPattern.type)
        ? spatialPattern.type
        : SPATIAL_PATTERNS.DISPERSION;
    
    // Definir los niveles de prioridad operativa según la combinación de patrones
    const priorityMatrix = {
        // Filas: patrones temporales
        [TEMPORAL_PATTERNS.AGUDO]: {
            // Columnas: patrones espaciales
            [SPATIAL_PATTERNS.PUNTO_CALIENTE]: { level: 'Muy Alta', color: '#e63946', description: 'Prioridad máxima: eventos concentrados en tiempo y espacio específicos.' },
            [SPATIAL_PATTERNS.AGRUPAMIENTO]: { level: 'Alta', color: '#f4a261', description: 'Prioridad alta: eventos concentrados en tiempo específico con múltiples ubicaciones agrupadas.' },
            [SPATIAL_PATTERNS.DISPERSION]: { level: 'Media-Alta', color: '#a8dadc', description: 'Prioridad media-alta: eventos concentrados en tiempo pero dispersos espacialmente.' }
        },
        [TEMPORAL_PATTERNS.ENFOCADO]: {
            [SPATIAL_PATTERNS.PUNTO_CALIENTE]: { level: 'Alta', color: '#f4a261', description: 'Prioridad alta: eventos moderadamente concentrados en tiempo, pero muy focalizados espacialmente.' },
            [SPATIAL_PATTERNS.AGRUPAMIENTO]: { level: 'Media', color: '#457b9d', description: 'Prioridad media: eventos con concentración moderada tanto en tiempo como en espacio.' },
            [SPATIAL_PATTERNS.DISPERSION]: { level: 'Media-Baja', color: '#90be6d', description: 'Prioridad media-baja: eventos con alguna concentración temporal pero espacialmente dispersos.' }
        },
        [TEMPORAL_PATTERNS.DIFUSO]: {
            [SPATIAL_PATTERNS.PUNTO_CALIENTE]: { level: 'Media-Alta', color: '#a8dadc', description: 'Prioridad media-alta: eventos temporalmente dispersos pero en un lugar específico.' },
            [SPATIAL_PATTERNS.AGRUPAMIENTO]: { level: 'Media-Baja', color: '#90be6d', description: 'Prioridad media-baja: eventos con cierta agrupación espacial pero temporalmente dispersos.' },
            [SPATIAL_PATTERNS.DISPERSION]: { level: 'Baja', color: '#1d3557', description: 'Prioridad baja: eventos dispersos tanto en tiempo como en espacio.' }
        }
    };
    
    // Generar matriz completa para visualización
    const matrixData = [];
    
    // Para cada combinación posible de patrones
    Object.keys(TEMPORAL_PATTERNS).forEach(temporalKey => {
        const row = {
            temporalPattern: TEMPORAL_PATTERNS[temporalKey],
            cells: []
        };
        
        Object.keys(SPATIAL_PATTERNS).forEach(spatialKey => {
            const cell = {
                spatialPattern: SPATIAL_PATTERNS[spatialKey],
                priority: priorityMatrix[TEMPORAL_PATTERNS[temporalKey]][SPATIAL_PATTERNS[spatialKey]],
                selected: TEMPORAL_PATTERNS[temporalKey] === validTemporalType && 
                          SPATIAL_PATTERNS[spatialKey] === validSpatialType
            };
            
            row.cells.push(cell);
        });
        
        matrixData.push(row);
    });
    
    // Determinar la prioridad para la combinación actual con manejo seguro
    let currentPriority;
    try {
        currentPriority = priorityMatrix[validTemporalType][validSpatialType];
    } catch (error) {
        // Fallback en caso de error
        currentPriority = { 
            level: 'Media', 
            color: '#457b9d', 
            description: 'Prioridad por defecto: no se pudo determinar la combinación exacta.'
        };
    }
    
    return {
        matrix: matrixData,
        currentPriority
    };
}

/**
 * Crea una matriz día-hora con los datos aorísticos
 * @param {Array} intervalData - Datos de intervalos
 * @returns {Array} Matriz día-hora
 */
function createDayHourMatrix(intervalData) {
    // Inicializar matriz día-hora con ceros
    const matrix = Array(7).fill().map(() => Array(24).fill(0));
    
    // Llenar la matriz con los datos de intervalos
    intervalData.forEach(interval => {
        matrix[interval.day][interval.hour] += interval.probability;
    });
    
    return matrix;
}

/**
 * Crea una matriz de porcentajes a partir de la matriz de probabilidades
 * @param {Array} matrix - Matriz de probabilidades
 * @param {Number} totalEvents - Total de eventos
 * @returns {Array} Matriz de porcentajes
 */
function createPercentageMatrix(matrix, totalEvents) {
    return matrix.map(row => row.map(value => (value * 100) / totalEvents));
}

/**
 * Crea una tabla HTML para visualizar la matriz día-hora
 * @param {Array} matrix - Matriz de probabilidades o porcentajes
 * @param {Array} colors - Colores para clustering
 * @param {string} type - Tipo de matriz ('probability' o 'percentage')
 * @returns {HTMLTableElement} Tabla HTML
 */
function createMatrixTable(matrix, colors, type = 'probability') {
    // Preparar los datos para clustering
    const dataPoints = [];
    const pointIndex = [];
    
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            dataPoints.push([matrix[day][hour]]);
            pointIndex.push({ day, hour });
        }
    }
    
    // Configurar clustering con los colores seleccionados
    const clusterCount = parseInt(document.getElementById('clusterCount').value, 10);
    
    // Determinar el tipo de datos para el clustering
    const dataType = type === 'percentage' ? 'percentages' : 'counts';
    
    // Realizar clustering
    const clusterResult = performKMeansClustering(dataPoints, clusterCount, colors, dataType);
    
    // Crear tabla HTML
    const table = document.createElement('table');
    
    // Crear encabezado con horas
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Celda de esquina
    const cornerCell = document.createElement('th');
    cornerCell.className = 'corner-header';
    
    // Texto dividido para la celda de esquina
    const headerTemporal = document.createElement('div');
    headerTemporal.className = 'header-temporal';
    headerTemporal.textContent = 'Día';
    
    const headerSpatial = document.createElement('div');
    headerSpatial.className = 'header-spatial';
    headerSpatial.textContent = 'Hora';
    
    cornerCell.appendChild(headerTemporal);
    cornerCell.appendChild(headerSpatial);
    headerRow.appendChild(cornerCell);
    
    // Horas
    for (let hour = 0; hour < 24; hour++) {
        const th = document.createElement('th');
        th.textContent = hour.toString().padStart(2, '0');
        headerRow.appendChild(th);
    }
    
    // Agregar celda para el total de filas
    const totalHeader = document.createElement('th');
    totalHeader.textContent = 'Total';
    totalHeader.className = 'total-header';
    totalHeader.style.cursor = 'pointer';
    totalHeader.addEventListener('click', () => createDailyTotalsChart(matrix, type));
    headerRow.appendChild(totalHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Crear cuerpo de la tabla
    const tbody = document.createElement('tbody');
    
    // Calcular totales por columna (horas)
    const columnTotals = Array(24).fill(0);
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            columnTotals[hour] += matrix[day][hour];
        }
    }
    
    // Días
    for (let day = 0; day < 7; day++) {
        const row = document.createElement('tr');
        
        // Celda con el nombre del día
        const dayCell = document.createElement('th');
        dayCell.textContent = DAYS_OF_WEEK[day];
        dayCell.style.whiteSpace = 'nowrap'; // Evitar que el texto se divida
        row.appendChild(dayCell);
        
        // Calcular total de fila
        let rowTotal = 0;
        
        // Celdas para cada hora
        for (let hour = 0; hour < 24; hour++) {
            const td = document.createElement('td');
            const value = matrix[day][hour];
            rowTotal += value;
            
            // Formatear el valor para visualización: probabilidad o porcentaje
            if (type === 'percentage') {
                td.textContent = value.toFixed(2) + '%';
            } else {
                // Mostrar con hasta 2 decimales, eliminar decimales en números enteros
                td.textContent = Number.isInteger(Math.round(value * 100) / 100) 
                    ? Math.round(value * 100) / 100 
                    : value.toFixed(2);
            }
            
            // Obtener el color basado en el cluster
            const flatIndex = day * 24 + hour;
            const clusterIndex = clusterResult.pointClusters[flatIndex];
            
            // Tratar valores muy pequeños o cero
            if (value < 0.0001) {
                td.style.backgroundColor = '#ffffff'; // Color blanco
                td.style.color = '#888888';
            } else {
                // Buscar el color del cluster
                const clusterData = clusterResult.clusterInfo.find(c => c.index === clusterIndex);
                if (clusterData) {
                    td.style.backgroundColor = clusterData.color;
                    
                    // Ajustar color de texto para mejor contraste
                    const colorValue = parseInt(clusterData.color.slice(1), 16);
                    const isDark = colorValue < 0x888888;
                    td.style.color = isDark ? '#ffffff' : '#000000';
                }
            }
            
            row.appendChild(td);
        }
        
        // Agregar celda de total para la fila
        const totalCell = document.createElement('td');
        totalCell.className = 'row-total';
        if (type === 'percentage') {
            totalCell.textContent = rowTotal.toFixed(2) + '%';
        } else {
            // Mostrar con hasta 2 decimales, eliminar decimales en números enteros
            totalCell.textContent = Number.isInteger(Math.round(rowTotal * 100) / 100) 
                ? Math.round(rowTotal * 100) / 100 
                : rowTotal.toFixed(2);
        }
        totalCell.style.fontWeight = 'bold';
        row.appendChild(totalCell);
        
        tbody.appendChild(row);
    }
    
    // Agregar fila de totales por columna
    const totalsRow = document.createElement('tr');
    const totalsHeader = document.createElement('th');
    totalsHeader.textContent = 'Total';
    totalsHeader.className = 'total-header';
    totalsHeader.style.cursor = 'pointer';
    totalsHeader.addEventListener('click', () => createHourlyTotalsChart(columnTotals, type));
    totalsRow.appendChild(totalsHeader);
    
    // Totales por hora
    let grandTotal = 0;
    for (let hour = 0; hour < 24; hour++) {
        const totalCell = document.createElement('td');
        totalCell.className = 'column-total';
        if (type === 'percentage') {
            totalCell.textContent = columnTotals[hour].toFixed(2) + '%';
        } else {
            // Mostrar con hasta 2 decimales, eliminar decimales en números enteros
            totalCell.textContent = Number.isInteger(Math.round(columnTotals[hour] * 100) / 100) 
                ? Math.round(columnTotals[hour] * 100) / 100 
                : columnTotals[hour].toFixed(2);
        }
        totalCell.style.fontWeight = 'bold';
        totalsRow.appendChild(totalCell);
        grandTotal += columnTotals[hour];
    }
    
    // Gran total
    const grandTotalCell = document.createElement('td');
    grandTotalCell.className = 'grand-total';
    if (type === 'percentage') {
        grandTotalCell.textContent = grandTotal.toFixed(2) + '%';
    } else {
        // Mostrar con hasta 2 decimales, eliminar decimales en números enteros
        grandTotalCell.textContent = Number.isInteger(Math.round(grandTotal * 100) / 100) 
            ? Math.round(grandTotal * 100) / 100 
            : grandTotal.toFixed(2);
    }
    grandTotalCell.style.fontWeight = 'bold';
    totalsRow.appendChild(grandTotalCell);
    
    tbody.appendChild(totalsRow);
    table.appendChild(tbody);
    
    // Si es la matriz de porcentajes, guardar la información del cluster para la leyenda
    if (type === 'percentage') {
        window.percentageClusterInfo = clusterResult.clusterInfo;
    } else {
        window.probabilityClusterInfo = clusterResult.clusterInfo;
    }
    
    return table;
}

/**
 * Crea y muestra un gráfico de barras con los totales diarios
 * @param {Array} matrix - Matriz de datos
 * @param {string} type - Tipo de datos ('probability' o 'percentage')
 */
function createDailyTotalsChart(matrix, type) {
    // Calcular totales por día
    const dailyTotals = [];
    for (let day = 0; day < 7; day++) {
        let total = 0;
        for (let hour = 0; hour < 24; hour++) {
            total += matrix[day][hour];
        }
        dailyTotals.push(total);
    }
    
    // Crear ventana modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    // Contenedor del gráfico
    const chartContainer = document.createElement('div');
    chartContainer.style.backgroundColor = 'white';
    chartContainer.style.padding = '20px';
    chartContainer.style.borderRadius = '8px';
    chartContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    chartContainer.style.maxWidth = '90%';
    chartContainer.style.width = '800px';
    chartContainer.style.maxHeight = '90%';
    chartContainer.style.overflow = 'auto';
    chartContainer.style.resize = 'both';
    
    // Título
    const title = document.createElement('h3');
    title.textContent = 'Distribución por Día de la Semana';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    chartContainer.appendChild(title);
    
    // Canvas para el gráfico
    const canvas = document.createElement('canvas');
    canvas.id = 'dailyTotalsChart';
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    chartContainer.appendChild(canvas);
    
    // Botón para cerrar
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Cerrar';
    closeButton.style.display = 'block';
    closeButton.style.margin = '20px auto 0';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#3366cc';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modal);
    chartContainer.appendChild(closeButton);
    
    modal.appendChild(chartContainer);
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera del contenedor
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Crear el gráfico
    const ctx = document.getElementById('dailyTotalsChart').getContext('2d');
    
    // Formatear valores según el tipo
    const formattedValues = dailyTotals.map(value => {
        if (type === 'percentage') {
            return value;
        } else {
            return value;
        }
    });
    
    // Crear el gráfico de barras
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DAYS_OF_WEEK,
            datasets: [{
                label: type === 'percentage' ? 'Porcentaje (%)' : 'Probabilidad',
                data: formattedValues,
                backgroundColor: [
                    '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', 
                    '#59a14f', '#edc949', '#af7aa1'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: type === 'percentage' ? 'Porcentaje (%)' : 'Probabilidad'
                    },
                    ticks: {
                        callback: function(value) {
                            return type === 'percentage' ? value + '%' : value;
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Día de la semana'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw.toFixed(2);
                            return type === 'percentage' 
                                ? `Porcentaje: ${value}%` 
                                : `Probabilidad: ${value}`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución por Día de la Semana'
                }
            }
        }
    });
}

/**
 * Crea y muestra un gráfico radial con los totales por hora
 * @param {Array} hourlyTotals - Totales por hora
 * @param {string} type - Tipo de datos ('probability' o 'percentage')
 */
function createHourlyTotalsChart(hourlyTotals, type) {
    // Crear ventana modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    // Contenedor del gráfico
    const chartContainer = document.createElement('div');
    chartContainer.style.backgroundColor = 'white';
    chartContainer.style.padding = '20px';
    chartContainer.style.borderRadius = '8px';
    chartContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    chartContainer.style.maxWidth = '90%';
    chartContainer.style.width = '800px';
    chartContainer.style.maxHeight = '90%';
    chartContainer.style.overflow = 'auto';
    chartContainer.style.resize = 'both';
    
    // Título
    const title = document.createElement('h3');
    title.textContent = 'Distribución por Hora del Día';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    chartContainer.appendChild(title);
    
    // Canvas para el gráfico
    const canvas = document.createElement('canvas');
    canvas.id = 'hourlyTotalsChart';
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    chartContainer.appendChild(canvas);
    
    // Botón para cerrar
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Cerrar';
    closeButton.style.display = 'block';
    closeButton.style.margin = '20px auto 0';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#3366cc';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modal);
    chartContainer.appendChild(closeButton);
    
    modal.appendChild(chartContainer);
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera del contenedor
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Crear el gráfico
    const ctx = document.getElementById('hourlyTotalsChart').getContext('2d');
    
    // Crear etiquetas para las horas
    const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    // Crear el gráfico radial
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: type === 'percentage' ? 'Porcentaje (%)' : 'Probabilidad',
                data: hourlyTotals,
                fill: true,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                pointBackgroundColor: 'rgb(54, 162, 235)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(54, 162, 235)'
            }]
        },
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw.toFixed(2);
                            return type === 'percentage' 
                                ? `Porcentaje: ${value}%` 
                                : `Probabilidad: ${value}`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribución por Hora del Día'
                }
            }
        }
    });
}

/**
 * Exporta los resultados aorísticos a imagen PNG
 */
function exportAoristicResults() {
    try {
        // Crear un contenedor temporal para la imagen
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.background = '#fff';
        tempContainer.style.padding = '20px';
        tempContainer.style.boxSizing = 'border-box';
        tempContainer.style.width = '1200px'; // Ancho fijo para mejor calidad
        
        // Crear título para la imagen
        const title = document.createElement('h2');
        title.textContent = 'Matrices de Análisis Aorístico';
        title.style.color = '#000000';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        
        // Clonar las matrices y leyendas
        const probabilityMatrix = document.getElementById('dayHourMatrix').cloneNode(true);
        const probabilityTitle = document.createElement('h4');
        probabilityTitle.textContent = 'Matriz Aorística Día-Hora';
        probabilityTitle.style.marginTop = '20px';
        
        const probabilityLegendContainer = document.querySelector('.aoristic-color-legend').cloneNode(true);
        
        const percentageMatrix = document.getElementById('dayHourPercentageMatrix').cloneNode(true);
        const percentageTitle = document.createElement('h4');
        percentageTitle.textContent = 'Matriz Aorística Día-Hora (Porcentajes)';
        percentageTitle.style.marginTop = '30px';
        
        const percentageLegendContainer = document.querySelectorAll('.aoristic-color-legend')[1].cloneNode(true);
        
        // Agregar todos los elementos al contenedor temporal
        tempContainer.appendChild(title);
        tempContainer.appendChild(probabilityTitle);
        tempContainer.appendChild(probabilityMatrix);
        tempContainer.appendChild(probabilityLegendContainer);
        tempContainer.appendChild(percentageTitle);
        tempContainer.appendChild(percentageMatrix);
        tempContainer.appendChild(percentageLegendContainer);
        
        // Añadir al DOM para capturar
        document.body.appendChild(tempContainer);
        
        // Usar la función exportTableToPNG reutilizando código existente
        // pero pasando el contenedor completo en lugar de solo una tabla
        exportTableToPNG(tempContainer, 'matrices_aoristicas.png');
        
        // Eliminar el contenedor temporal después de capturar
        setTimeout(() => {
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
        }, 500);
    } catch (error) {
        console.error('Error al exportar matriz aorística:', error);
        alert('No se pudo exportar la matriz a PNG');
    }
}

/**
 * Visualiza el resumen del análisis aorístico
 * @param {Object} results - Resultados del análisis
 */
function visualizeAoristicSummary(results) {
    const summaryContainer = document.getElementById('aoristicSummary');
    summaryContainer.innerHTML = '';
    
    // Crear contenedor para el patrón temporal
    const patternSummary = document.createElement('div');
    patternSummary.className = 'pattern-summary';
    
    // Crear elemento para el patrón temporal
    const temporalItem = document.createElement('div');
    temporalItem.className = 'summary-item';
    
    temporalItem.innerHTML = `
        <h4>Patrón Temporal</h4>
        <span class="pattern-type ${results.temporalPattern.type.toLowerCase()}">${results.temporalPattern.type}</span>
        <p class="pattern-confidence">Confianza: ${results.temporalPattern.confidence}</p>
        <p class="pattern-description">Concentración en ${results.temporalPattern.metrics.hoursFor50Percent} horas</p>
    `;
    
    // Crear elemento para el patrón espacial
    const spatialItem = document.createElement('div');
    spatialItem.className = 'summary-item';
    
    spatialItem.innerHTML = `
        <h4>Patrón Espacial</h4>
        <span class="pattern-type ${results.spatialPattern.type.toLowerCase().replace(' ', '-')}">${results.spatialPattern.type}</span>
        <p class="pattern-confidence">Confianza: ${results.spatialPattern.confidence}</p>
        <p class="pattern-description">${results.spatialPattern.metrics.uniqueLocations} ubicaciones únicas</p>
    `;
    
    // Crear elemento para la clasificación combinada
    const combinedItem = document.createElement('div');
    combinedItem.className = 'summary-item';
    
    combinedItem.innerHTML = `
        <h4>Clasificación Combinada</h4>
        <span class="pattern-type combined">Prioridad ${results.spatioTemporalMatrix.currentPriority.level}</span>
        <p class="pattern-confidence">${results.temporalPattern.type} + ${results.spatialPattern.type}</p>
        <p class="pattern-description">${results.spatioTemporalMatrix.currentPriority.description}</p>
    `;
    
    // Agregar elementos al contenedor de resumen de patrones
    patternSummary.appendChild(temporalItem);
    patternSummary.appendChild(spatialItem);
    patternSummary.appendChild(combinedItem);
    
    // Crear contenedor para la información general
    const generalInfo = document.createElement('div');
    generalInfo.className = 'general-info';
    
    generalInfo.innerHTML = `
        <h4>Información General</h4>
        <p><strong>Eventos analizados:</strong> ${results.validEventCount}</p>
        <p><strong>Eventos no procesados:</strong> ${results.unprocessedEvents}</p>
        <p><strong>Horas con mayor probabilidad ponderada:</strong></p>
    `;
    
    // Crear lista para horas de mayor probabilidad
    const hoursList = document.createElement('ul');
    hoursList.className = 'hours-list';
    
    results.temporalPattern.metrics.topHours.forEach(hour => {
        const percentage = (hour.probability * 100).toFixed(1);
        const hourItem = document.createElement('li');
        hourItem.innerHTML = `<strong>${hour.hour.toString().padStart(2, '0')}:00</strong> - ${percentage}%`;
        hoursList.appendChild(hourItem);
    });
    
    generalInfo.appendChild(hoursList);
    
    // Agregar elementos al contenedor principal
    summaryContainer.appendChild(patternSummary);
    summaryContainer.appendChild(generalInfo);
}

/**
 * Visualiza los patrones temporales
 * @param {Object} results - Resultados del análisis
 */
function visualizeTemporalPatterns(results) {
    const temporalContainer = document.getElementById('timeClassification');
    temporalContainer.innerHTML = '';
    
    // Crear gráfico de probabilidad por hora (Data Clock)
    createDataClockChart(results.hourlyProbabilities);
    
    // Mostrar la clasificación temporal
    const classificationDetails = document.createElement('div');
    classificationDetails.className = 'classification-details';
    
    // Tipo de patrón
    const patternType = document.createElement('div');
    patternType.className = 'classification-type';
    
    const patternBadge = document.createElement('span');
    patternBadge.className = `pattern-type ${results.temporalPattern.type.toLowerCase()}`;
    patternBadge.textContent = results.temporalPattern.type;
    
    const confidenceSpan = document.createElement('span');
    confidenceSpan.className = 'pattern-confidence';
    confidenceSpan.textContent = `Confianza: ${results.temporalPattern.confidence}`;
    
    patternType.appendChild(patternBadge);
    patternType.appendChild(document.createElement('br'));
    patternType.appendChild(confidenceSpan);
    
    // Métricas clave
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'classification-metrics';
    
    const hoursMetric = document.createElement('div');
    hoursMetric.className = 'metric';
    hoursMetric.innerHTML = `<span class="label">Concentración:</span> El 50% de la probabilidad se encuentra en ${results.temporalPattern.metrics.hoursFor50Percent} horas`;
    
    const cvMetric = document.createElement('div');
    cvMetric.className = 'metric';
    cvMetric.innerHTML = `<span class="label">Variación:</span> Coeficiente de variación = ${results.temporalPattern.metrics.coefficientOfVariation}`;
    
    metricsDiv.appendChild(hoursMetric);
    metricsDiv.appendChild(cvMetric);
    
    // Descripción del patrón
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'classification-description';
    descriptionDiv.textContent = results.temporalPattern.description;
    
    // Ensamblar todo
    classificationDetails.appendChild(patternType);
    classificationDetails.appendChild(metricsDiv);
    classificationDetails.appendChild(descriptionDiv);
    
    temporalContainer.appendChild(classificationDetails);
}

/**
 * Crea un gráfico de barras tipo Data Clock
 * @param {Array} hourlyProbabilities - Probabilidades por hora
 */
function createDataClockChart(hourlyProbabilities) {
    // Crear labels para las horas
    const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    // Convertir probabilidades a porcentajes
    const percentages = hourlyProbabilities.map(p => p * 100);
    
    // Obtener los colores del clustering para el gráfico
    let colors = [];
    if (window.clusterInfo && window.clusterInfo.length > 0) {
        // Ordenar clusters por valor (de menor a mayor)
        const sortedClusters = [...window.clusterInfo].sort((a, b) => a.center - b.center);
        colors = sortedClusters.map(cluster => cluster.color);
    } else {
        // Colores por defecto si no hay clusters definidos
        colors = ['#3366cc', '#dc3545', '#28a745', '#ffc107', '#17a2b8'];
    }
    
    // Generar colores para cada barra según su valor
    const barColors = percentages.map(value => {
        // Si hay suficientes colores disponibles, usar esos
        if (colors && colors.length > 0) {
            const clusterCount = colors.length;
            // Normalizar el valor para seleccionar un color
            const colorIndex = Math.min(Math.floor(value / 20 * clusterCount), clusterCount - 1);
            return colors[colorIndex];
        }
        // Color por defecto
        return '#3366cc';
    });
    
    // Crear el gráfico
    const ctx = document.getElementById('dataClockProbability').getContext('2d');
    
    // Destruir el gráfico anterior si existe
    if (window.dataClockChart) {
        window.dataClockChart.destroy();
    }
    
    window.dataClockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probabilidad (%)',
                data: percentages,
                backgroundColor: barColors,
                borderColor: barColors.map(color => color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Probabilidad (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hora del día'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Probabilidad: ${context.raw.toFixed(2)}%`;
                        }
                    }
                },
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Distribución de Probabilidad por Hora'
                }
            }
        }
    });
}

/**
 * Visualiza los patrones espaciales
 * @param {Object} results - Resultados del análisis
 */
function visualizeSpatialPatterns(results) {
    const spatialContainer = document.getElementById('spatialClassification');
    const spatialChartContainer = document.getElementById('spatialChart');
    
    spatialContainer.innerHTML = '';
    spatialChartContainer.innerHTML = '';
    
    // Mostrar la tabla de frecuencia de ubicaciones
    createLocationFrequencyTable(results.spatialPattern.topLocations || [], spatialChartContainer);
    
    // Mostrar la clasificación espacial
    const classificationDetails = document.createElement('div');
    classificationDetails.className = 'classification-details';
    
    // Tipo de patrón
    const patternType = document.createElement('div');
    patternType.className = 'classification-type';
    
    const patternClass = results.spatialPattern.type.toLowerCase().replace(' ', '-');
    
    const patternBadge = document.createElement('span');
    patternBadge.className = `pattern-type ${patternClass}`;
    patternBadge.textContent = results.spatialPattern.type;
    
    const confidenceSpan = document.createElement('span');
    confidenceSpan.className = 'pattern-confidence';
    confidenceSpan.textContent = `Confianza: ${results.spatialPattern.confidence}`;
    
    patternType.appendChild(patternBadge);
    patternType.appendChild(document.createElement('br'));
    patternType.appendChild(confidenceSpan);
    
    // Métricas clave
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'classification-metrics';
    
    const locationsMetric = document.createElement('div');
    locationsMetric.className = 'metric';
    locationsMetric.innerHTML = `<span class="label">Ubicaciones únicas:</span> ${results.spatialPattern.metrics.uniqueLocations}`;
    
    const topLocationMetric = document.createElement('div');
    topLocationMetric.className = 'metric';
    topLocationMetric.innerHTML = `<span class="label">Ubicación principal:</span> ${results.spatialPattern.metrics.topPercent}% de los eventos`;
    
    const dispersalMetric = document.createElement('div');
    dispersalMetric.className = 'metric';
    dispersalMetric.innerHTML = `<span class="label">Índice de dispersión:</span> ${results.spatialPattern.metrics.dispersal}`;
    
    metricsDiv.appendChild(locationsMetric);
    metricsDiv.appendChild(topLocationMetric);
    metricsDiv.appendChild(dispersalMetric);
    
    // Descripción del patrón
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'classification-description';
    descriptionDiv.textContent = results.spatialPattern.description;
    
    // Ensamblar todo
    classificationDetails.appendChild(patternType);
    classificationDetails.appendChild(metricsDiv);
    classificationDetails.appendChild(descriptionDiv);
    
    spatialContainer.appendChild(classificationDetails);
}

/**
 * Crea una tabla de frecuencia de ubicaciones
 * @param {Array} locations - Ubicaciones con sus frecuencias
 * @param {HTMLElement} container - Contenedor donde se añadirá la tabla
 */
function createLocationFrequencyTable(locations, container) {
    if (!locations || locations.length === 0) {
        const noDataMessage = document.createElement('div');
        noDataMessage.className = 'no-data-message';
        noDataMessage.textContent = 'No hay datos de ubicación disponibles.';
        container.appendChild(noDataMessage);
        return;
    }
    
    const title = document.createElement('h5');
    title.textContent = 'Frecuencia de Ubicaciones (Top 10)';
    container.appendChild(title);
    
    const table = document.createElement('table');
    table.className = 'location-frequency-table';
    
    // Encabezado de la tabla
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Ubicación', 'Frecuencia', 'Porcentaje'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Cuerpo de la tabla
    const tbody = document.createElement('tbody');
    
    locations.forEach(location => {
        const row = document.createElement('tr');
        
        const locationCell = document.createElement('td');
        locationCell.textContent = location.location;
        
        const countCell = document.createElement('td');
        countCell.textContent = location.count.toFixed(2);
        
        const percentCell = document.createElement('td');
        percentCell.textContent = location.percentage.toFixed(2) + '%';
        
        row.appendChild(locationCell);
        row.appendChild(countCell);
        row.appendChild(percentCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

/**
 * Visualiza la matriz espacio-temporal
 * @param {Object} results - Resultados del análisis
 */
function visualizeSpatioTemporalMatrix(results) {
    const matrixContainer = document.getElementById('spatioTemporalMatrix');
    matrixContainer.innerHTML = '';
    
    // Crear tabla para la matriz
    const table = document.createElement('table');
    table.className = 'spatio-temporal-table';
    
    // Encabezado
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Celda de esquina
    const cornerCell = document.createElement('th');
    cornerCell.textContent = 'Temporal / Espacial';
    headerRow.appendChild(cornerCell);
    
    // Encabezados espaciales
    Object.values(SPATIAL_PATTERNS).forEach(pattern => {
        const th = document.createElement('th');
        th.textContent = pattern;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Cuerpo
    const tbody = document.createElement('tbody');
    
    // Filas para cada patrón temporal
    results.spatioTemporalMatrix.matrix.forEach(row => {
        const tr = document.createElement('tr');
        
        // Encabezado de fila (patrón temporal)
        const th = document.createElement('th');
        th.textContent = row.temporalPattern;
        tr.appendChild(th);
        
        // Celdas para cada combinación
        row.cells.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell.priority.level;
            td.style.backgroundColor = cell.priority.color;
            
            // Color de texto para mejor contraste
            const colorValue = parseInt(cell.priority.color.slice(1), 16);
            const isDark = colorValue < 0x888888;
            td.style.color = isDark ? '#ffffff' : '#000000';
            
            // Marcar la celda seleccionada (combinación actual)
            if (cell.selected) {
                td.className = 'selected-cell';
                td.title = 'Clasificación actual';
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    matrixContainer.appendChild(table);
}