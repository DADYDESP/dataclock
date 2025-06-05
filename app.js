import CONFIG from './config.js';
import { performKMeansClustering } from './clustering.js';
import { exportResultsToExcel } from './export-utils.js';
import { createClusterColorControls, getSelectedColors } from './clustering-ui.js';
import { COLOR_SCHEMES, getColorScheme } from './color-schemes.js';
import { generateUserGuide } from './user-guide.js';
import { initImageExport } from './app-extension.js';
import { initParameterSelection, updateParameterSelects, getSelectedFilters, generateMatrixTitle, initializeFilters } from './parameter-selection.js';
import { applyFilters } from './filter-utils.js';
import { processFile } from './file-handler.js';
import { initAoristicAnalysis, performAoristicAnalysis, visualizeAoristicResults, visualizeDayHourMatrix } from './aoristic-analysis.js';

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('file-name');
    const columnSelectionSection = document.getElementById('column-selection');
    const dateColumnSelect = document.getElementById('dateColumn');
    const timeColumnSelect = document.getElementById('timeColumn');
    const analysisOptionsSection = document.getElementById('analysis-options');
    const clusterCountInput = document.getElementById('clusterCount');
    const colorControlsContainer = document.getElementById('colorControls');
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsSection = document.getElementById('results');
    const eventMatrixTable = document.getElementById('eventMatrix');
    const colorLegendDiv = document.getElementById('colorLegend');
    const errorLegendDiv = document.getElementById('errorLegend');
    const userGuideButton = document.getElementById('userGuideButton');
    const matrixTitle = document.getElementById('matrixTitle');
    const aoristicResultsSection = document.getElementById('aoristicResults');
    const enableAoristicCheckbox = document.getElementById('enableAoristic');
    const endDateColumnSelect = document.getElementById('endDateColumn');
    const endTimeColumnSelect = document.getElementById('endTimeColumn');
    const locationColumnSelect = document.getElementById('locationColumn');

    // Variables para almacenar datos
    let workbook = null;
    let sheetData = null;
    let columnHeaders = [];
    let matrixData = null;
    let colorInputs = [];
    let errorData = {
        invalidDate: 0,
        invalidTime: 0,
        missingData: 0,
        invalidAoristic: 0
    };

    // Inicializar configuración
    clusterCountInput.value = CONFIG.defaultClusterCount;
    clusterCountInput.min = CONFIG.clusterRange.min;
    clusterCountInput.max = CONFIG.clusterRange.max;

    // Crear controles de color iniciales
    colorInputs = createClusterColorControls(
        colorControlsContainer, 
        CONFIG.defaultClusterCount, 
        CONFIG.defaultBaseColor
    );

    // Inicializar selección de parámetros
    initParameterSelection();
    
    // Inicializar análisis aorístico
    initAoristicAnalysis();

    // Deshabilitar campos de análisis aorístico por defecto
    endDateColumnSelect.disabled = true;
    endTimeColumnSelect.disabled = true;
    locationColumnSelect.disabled = true;

    // Event Listeners
    fileInput.addEventListener('change', handleFileUpload);
    analyzeButton.addEventListener('click', performAnalysis);
    clusterCountInput.addEventListener('change', updateColorControls);
    document.getElementById('exportButton').addEventListener('click', () => {
        exportResultsToExcel(matrixData, window.clusterInfo, errorData, CONFIG);
    });
    userGuideButton.addEventListener('click', generateUserGuide);
    document.getElementById('aoristicGuideButton').addEventListener('click', showAoristicGuide);
    document.getElementById('closeGuideDialogButton').addEventListener('click', closeAoristicGuideDialog);

    // Event listener para el checkbox de análisis aorístico
    enableAoristicCheckbox.addEventListener('change', function() {
        const isEnabled = this.checked;
        endDateColumnSelect.disabled = !isEnabled;
        endTimeColumnSelect.disabled = !isEnabled;
        locationColumnSelect.disabled = !isEnabled;
        const aoristicGroup = document.querySelector('.aoristic-group');
        aoristicGroup.classList.toggle('expanded', isEnabled);
    });

    // Inicializar exportación de imágenes
    initImageExport();

    // Función para actualizar los controles de color cuando cambia el color base o el número de clusters
    function updateColorControls() {
        const clusterCount = parseInt(clusterCountInput.value);
        
        if (clusterCount < CONFIG.clusterRange.min || clusterCount > CONFIG.clusterRange.max) {
            return; // No actualizar si el número de clusters es inválido
        }
        
        // Usar el color del primer input como color base, o el valor predeterminado si no existe
        const baseColor = colorInputs.length > 0 ? colorInputs[0].value : CONFIG.defaultBaseColor;
        
        colorInputs = createClusterColorControls(colorControlsContainer, clusterCount, baseColor);
    }

    // Función para manejar la carga de archivos
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        fileName.textContent = `Archivo seleccionado: ${file.name}`;
        
        try {
            // Use the file handler module to process different file formats
            const result = await processFile(file);
            workbook = result.workbook;
            sheetData = result.sheetData;
            
            if (sheetData.length < 2) {
                throw new Error('El archivo no contiene suficientes datos');
            }
            
            // Extract headers
            columnHeaders = sheetData[0];
            
            // Update selects with headers
            populateSelectOptions(dateColumnSelect, columnHeaders);
            populateSelectOptions(timeColumnSelect, columnHeaders);
            updateParameterSelects(columnHeaders);
            
            // Initialize filters with loaded data
            initializeFilters(sheetData);
            preselectFilterColumns(columnHeaders);
            
            // Show column selection section
            columnSelectionSection.style.display = 'block';
            analysisOptionsSection.style.display = 'block';
            resultsSection.style.display = 'none';
            
        } catch (error) {
            alert(`Error al procesar el archivo: ${error.message}`);
            console.error(error);
        }
    }

    function preselectFilterColumns(columnHeaders) {
        const partidoColumnSelect = document.getElementById('partidoColumn');
        const localidadColumnSelect = document.getElementById('localidadColumn');
        const segmentColumnSelect = document.getElementById('segmentColumn');
    
        // Function to select a column if it exists
        const selectColumn = (selectElement, columnName) => {
            const index = columnHeaders.findIndex(header => header.toLowerCase().includes(columnName.toLowerCase()));
            if (index !== -1) {
                selectElement.value = index;
            }
        };
    
        // Attempt to pre-select Partido, Localidad and Segment columns
        selectColumn(partidoColumnSelect, 'partido');
        selectColumn(localidadColumnSelect, 'localidad');
        selectColumn(segmentColumnSelect, 'segment');
    }

    // Función para llenar las opciones de los select
    function populateSelectOptions(selectElement, options) {
        selectElement.innerHTML = '';
        
        // Crear opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Seleccione una columna';
        selectElement.appendChild(defaultOption);
        
        // Agregar opciones de columnas
        options.forEach((option, index) => {
            const optElement = document.createElement('option');
            optElement.value = index;
            optElement.textContent = option;
            selectElement.appendChild(optElement);
        });
    }

    // Función para realizar el análisis
    function performAnalysis() {
        const dateColumnIndex = parseInt(dateColumnSelect.value);
        const timeColumnIndex = parseInt(timeColumnSelect.value);
        const clusterCount = parseInt(clusterCountInput.value);
        const filters = getSelectedFilters();
        
        if (isNaN(dateColumnIndex) || isNaN(timeColumnIndex)) {
            alert('Por favor, seleccione las columnas de fecha y hora');
            return;
        }
        
        if (clusterCount < CONFIG.clusterRange.min || clusterCount > CONFIG.clusterRange.max) {
            alert(`El número de clusters debe estar entre ${CONFIG.clusterRange.min} y ${CONFIG.clusterRange.max}`);
            return;
        }
        
        // Ocultar resultados anteriores
        aoristicResultsSection.style.display = 'none';
        
        try {
            // Procesar datos y crear matriz con filtros
            const filterData = processDataAndCreateMatrix(dateColumnIndex, timeColumnIndex, filters);
            
            // Obtener los colores seleccionados
            const selectedColors = getSelectedColors(colorInputs);
            
            // Aplicar clustering con los colores seleccionados
            applyKMeansClustering(clusterCount, selectedColors);
            
            // Mostrar resultados
            displayResults();
            
            // Mostrar la sección de resultados
            resultsSection.style.display = 'block';
            
            // Actualizar título de la matriz con filtros aplicados
            if (matrixTitle) {
                matrixTitle.textContent = generateMatrixTitle(filterData);
            }
            
            // Si el análisis aorístico está habilitado, realizarlo
            if (filters.aoristic && filters.aoristic.enabled) {
                // Realizar análisis aorístico
                const aoristicResults = performAoristicAnalysis(sheetData, filters, errorData);
                
                // Si hay resultados, visualizarlos
                if (aoristicResults) {
                    visualizeAoristicResults(aoristicResults);
                    visualizeDayHourMatrix(aoristicResults, selectedColors);
                } else {
                    // Get the selected colors for aoristic data visualization even when there's an error
                    const selectedColors = getSelectedColors(colorInputs);
                    visualizeDayHourMatrix(aoristicResults, selectedColors);
                    console.warn('No se pudieron generar resultados de análisis aorístico');
                }
            }
            
        } catch (error) {
            alert(`Error al analizar los datos: ${error.message}`);
            console.error(error);
        }
    }

    // Función para procesar los datos y crear la matriz
    function processDataAndCreateMatrix(dateColumnIndex, timeColumnIndex, filters = {}) {
        // Inicializar matriz para conteo de eventos por día y hora
        matrixData = Array(24).fill().map(() => Array(7).fill(0));
        
        // Reiniciar contadores de errores
        errorData = {
            invalidDate: 0,
            invalidTime: 0,
            missingData: 0,
            invalidAoristic: 0
        };
        
        // Información de filtros aplicados
        const filterData = {};
        
        // Establecer índices de columnas para filtros
        const partidoColumnIndex = filters.partido.enabled ? filters.partido.columnIndex : -1;
        const localidadColumnIndex = filters.localidad.enabled ? filters.localidad.columnIndex : -1;
        const segmentColumnIndex = filters.segment.enabled ? filters.segment.columnIndex : -1;
        
        // Guardar valores seleccionados para el título
        if (filters.partido.enabled && filters.partido.values && filters.partido.values.length > 0) {
            if (filters.partido.values.length === 1) {
                filterData.partido = filters.partido.values[0];
            } else {
                filterData.partidos = filters.partido.values;
            }
        }
        
        if (filters.localidad.enabled && filters.localidad.values && filters.localidad.values.length > 0) {
            if (filters.localidad.values.length === 1) {
                filterData.localidad = filters.localidad.values[0];
            } else {
                filterData.localidades = filters.localidad.values;
            }
        }

        if (filters.segment.enabled && filters.segment.values && filters.segment.values.length > 0) {
            if (filters.segment.values.length === 1) {
                filterData.segment = filters.segment.values[0];
            } else {
                filterData.segments = filters.segment.values;
            }
        }
        
        // Procesar cada fila de datos (excluyendo la fila de encabezados)
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            
            // Verificar si la fila tiene datos en las columnas requeridas
            if (!row[dateColumnIndex] && !row[timeColumnIndex]) {
                continue; // Saltar filas sin datos
            }
            
            if (!row[dateColumnIndex] || !row[timeColumnIndex]) {
                errorData.missingData++;
                continue;
            }
            
            // Aplicar filtros a esta fila
            if (!applyFilters(row, filters, partidoColumnIndex, localidadColumnIndex, segmentColumnIndex)) {
                continue; // Saltar filas que no cumplen con los filtros
            }
            
            const dateValue = row[dateColumnIndex];
            const timeValue = row[timeColumnSelect.value];
            
            try {
                // Intentar parsear la fecha
                const parsedDate = parseDate(dateValue);
                if (!parsedDate) {
                    errorData.invalidDate++;
                    continue;
                }
                
                // Intentar parsear la hora
                const parsedTime = parseTime(timeValue);
                if (!parsedTime) {
                    errorData.invalidTime++;
                    continue;
                }
                
                // Combinar fecha y hora
                const dateTimeValue = new Date(
                    parsedDate.getFullYear(),
                    parsedDate.getMonth(),
                    parsedDate.getDate(),
                    parsedTime.getHours(),
                    parsedTime.getMinutes(),
                    parsedTime.getSeconds()
                );
                
                // Obtener día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
                let dayOfWeek = dateTimeValue.getDay();
                // Ajustar para que 0 = Lunes, ..., 6 = Domingo
                dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                
                // Obtener hora del día
                const hour = dateTimeValue.getHours();
                
                // Incrementar el contador en la matriz
                matrixData[hour][dayOfWeek]++;
                
            } catch (error) {
                // Si ocurre algún error al procesar, incrementar contador de errores
                if (error.message.includes('fecha')) {
                    errorData.invalidDate++;
                } else if (error.message.includes('hora')) {
                    errorData.invalidTime++;
                } else {
                    errorData.missingData++;
                }
            }
        }
        
        return filterData;
    }

    // Función para intentar parsear una fecha
    function parseDate(dateValue) {
        if (!dateValue) return null;
        
        // Convertir a string si no lo es
        const dateStr = String(dateValue);
        
        // Intentar formato DD/MM/YYYY (día/mes/año) obligatoriamente
        const formats = [
            // DD/MM/YYYY
            (str) => {
                const parts = str.split('/');
                if (parts.length !== 3) return null;
                
                // Usar exclusivamente formato DD/MM/YYYY
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                
                // Verificar que sea una fecha válida
                const date = new Date(year, month, day);
                if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
                    return null;
                }
                return date;
            },
            // DD-MM-YYYY
            (str) => {
                const parts = str.split('-');
                if (parts.length !== 3) return null;
                
                // Usar exclusivamente formato DD-MM-YYYY
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                
                // Verificar que sea una fecha válida
                const date = new Date(year, month, day);
                if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
                    return null;
                }
                return date;
            },
            // Intentar formato para Excel (puede devolver fechas en formato personalizado)
            (str) => {
                // Asumimos que si es un número, puede ser un valor de fecha de Excel
                if (!isNaN(str) && !isNaN(parseFloat(str))) {
                    // Convertir número a fecha utilizando lógica de Excel
                    // En Excel, las fechas se representan como días desde el 1/1/1900
                    const excelDate = new Date(1900, 0, 1);
                    excelDate.setDate(excelDate.getDate() + parseInt(str) - 2); // -2 por ajuste de Excel
                    
                    // Verificar que sea válida y devolver solo si es después de 1930
                    // (para evitar fechas demasiado antiguas que podrían ser errores)
                    if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() >= 1930) {
                        return excelDate;
                    }
                }
                return null;
            }
        ];
        
        for (const formatParser of formats) {
            const result = formatParser(dateStr);
            if (result) return result;
        }
        
        return null;
    }

    // Función para intentar parsear una hora
    function parseTime(timeValue) {
        if (!timeValue) return null;
        
        // Convertir a string si no lo es
        const timeStr = String(timeValue);
        
        // Intentar diferentes formatos de hora
        const formats = [
            // HH:MM:SS o HH:MM
            (str) => {
                const parts = str.split(':');
                if (parts.length < 2 || parts.length > 3) return null;
                
                const hours = parseInt(parts[0]);
                const minutes = parseInt(parts[1]);
                const seconds = parts.length === 3 ? parseInt(parts[2]) : 0;
                
                if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
                if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
                
                const date = new Date();
                date.setHours(hours, minutes, seconds, 0);
                return date;
            },
            // Intentar con Date directamente
            (str) => {
                const today = new Date().toDateString();
                const dateTime = new Date(`${today} ${str}`);
                return !isNaN(dateTime.getTime()) ? dateTime : null;
            }
        ];
        
        for (const formatParser of formats) {
            const result = formatParser(timeStr);
            if (result) return result;
        }
        
        return null;
    }

    // Función para aplicar clustering K-Means
    function applyKMeansClustering(clusterCount, colors) {
        try {
            // Preparar datos para clustering
            const dataPoints = [];
            const pointIndex = [];
            
            for (let hour = 0; hour < 24; hour++) {
                for (let day = 0; day < 7; day++) {
                    dataPoints.push([matrixData[hour][day]]);
                    pointIndex.push({ hour, day });
                }
            }
            
            // Usar el módulo de clustering refactorizado con colores personalizados
            const result = performKMeansClustering(dataPoints, clusterCount, colors);
            
            // Guardar información de clusters para visualización
            window.clusterInfo = result.clusterInfo;
            window.pointClusters = result.pointClusters;
            window.pointIndex = pointIndex;
            
        } catch (error) {
            console.error('Error en clustering K-Means:', error);
            throw new Error('No se pudo aplicar el clustering a los datos');
        }
    }

    // Función para mostrar la matriz de eventos
    function displayEventMatrix() {
        eventMatrixTable.innerHTML = '';
        
        // Crear encabezado con horas (transpuesto - las horas ahora van en las columnas)
        const headerRow = document.createElement('tr');
        const cornerCell = document.createElement('th');
        cornerCell.textContent = 'Día / Hora';
        headerRow.appendChild(cornerCell);
        
        for (let hour = 0; hour < 24; hour++) {
            const th = document.createElement('th');
            th.textContent = CONFIG.hoursOfDay[hour];
            headerRow.appendChild(th);
        }
        
        eventMatrixTable.appendChild(headerRow);
        
        // Crear filas para cada día (transpuesto - los días ahora van en las filas)
        for (let day = 0; day < 7; day++) {
            const row = document.createElement('tr');
            
            // Celda de día
            const dayCell = document.createElement('th');
            dayCell.textContent = CONFIG.daysOfWeek[day];
            row.appendChild(dayCell);
            
            // Celdas para cada hora
            for (let hour = 0; hour < 24; hour++) {
                const td = document.createElement('td');
                const count = matrixData[hour][day];
                td.textContent = count;
                
                // Obtener el color basado en el cluster
                const flatIndex = hour * 7 + day;
                const clusterIndex = window.pointClusters[flatIndex];
                
                // Tratamiento especial para valores cero (cluster -1)
                if (clusterIndex === -1) {
                    td.style.backgroundColor = '#ffffff'; // Color blanco para celdas vacías (valores cero)
                    td.style.color = '#888'; // Texto gris para valores cero
                } else {
                    // Buscar el cluster en la información ordenada
                    const clusterData = window.clusterInfo.find(c => c.index === clusterIndex);
                    if (clusterData) {
                        td.style.backgroundColor = clusterData.color;
                        
                        // Ajustar color de texto para mejor contraste
                        const colorValue = parseInt(clusterData.color.slice(1), 16);
                        const isDark = colorValue < 0x888888;
                        td.style.color = isDark ? '#fff' : '#000';
                    }
                }
                
                row.appendChild(td);
            }
            
            eventMatrixTable.appendChild(row);
        }
    }

    // Función para mostrar la leyenda de colores
    function displayColorLegend() {
        colorLegendDiv.innerHTML = '';
        
        if (!window.clusterInfo) return;
        
        // Añadir entrada especial para valores cero
        const zeroItem = document.createElement('div');
        zeroItem.className = 'color-item';
        
        const zeroColorBox = document.createElement('div');
        zeroColorBox.className = 'color-box';
        zeroColorBox.style.backgroundColor = '#ffffff';
        zeroColorBox.style.border = '1px solid #ddd';
        
        const zeroLabel = document.createElement('span');
        zeroLabel.textContent = '0 eventos (sin color)';
        
        zeroItem.appendChild(zeroColorBox);
        zeroItem.appendChild(zeroLabel);
        colorLegendDiv.appendChild(zeroItem);
        
        // Ordenar por rango ascendente
        const sortedClusters = [...window.clusterInfo].sort((a, b) => a.range.min - b.range.min);
        
        // Crear elementos para cada cluster
        for (const cluster of sortedClusters) {
            const item = document.createElement('div');
            item.className = 'color-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            colorBox.style.backgroundColor = cluster.color;
            
            const label = document.createElement('span');
            if (cluster.range.min === cluster.range.max) {
                label.textContent = `${cluster.range.min} eventos`;
            } else {
                label.textContent = `${cluster.range.min} a ${cluster.range.max} eventos`;
            }
            
            item.appendChild(colorBox);
            item.appendChild(label);
            colorLegendDiv.appendChild(item);
        }
    }

    // Función para mostrar la leyenda de errores
    function displayErrorLegend() {
        errorLegendDiv.innerHTML = '';
        
        const hasErrors = Object.values(errorData).some(count => count > 0);
        
        if (!hasErrors) {
            const noErrorItem = document.createElement('div');
            noErrorItem.textContent = 'No se encontraron errores en los datos.';
            errorLegendDiv.appendChild(noErrorItem);
            return;
        }
        
        // Mostrar cada tipo de error
        for (const [errorType, count] of Object.entries(errorData)) {
            if (count > 0) {
                const errorItem = document.createElement('div');
                errorItem.className = 'error-item';
                
                const message = CONFIG.errorMessages[errorType] || errorType;
                errorItem.textContent = `${message}: ${count} evento(s)`;
                
                errorLegendDiv.appendChild(errorItem);
            }
        }
    }

    // Función para mostrar los resultados
    function displayResults() {
        // Mostrar la matriz de eventos
        displayEventMatrix();
        
        // Mostrar leyenda de colores
        displayColorLegend();
        
        // Mostrar leyenda de errores
        displayErrorLegend();
        
        // Mostrar botones de exportación
        document.getElementById('exportButton').style.display = 'inline-block';
        document.getElementById('exportImageButton').style.display = 'inline-block';
    }

    // Function to show the aoristic user guide dialog
    function showAoristicGuide() {
        const dialog = document.getElementById('aoristicGuideDialog');
        const contentArea = document.getElementById('aoristicGuideContent');

        fetch('aoristic-user-guide.txt')
            .then(response => response.text())
            .then(text => {
                contentArea.textContent = text;
                dialog.style.display = 'flex'; // Use flex to properly display dialog
            })
            .catch(error => {
                console.error('Error fetching aoristic user guide:', error);
                alert('No se pudo cargar la guía de usuario del Análisis Aorístico.');
            });
    }

    // Function to close the aoristic user guide dialog
    function closeAoristicGuideDialog() {
        const dialog = document.getElementById('aoristicGuideDialog');
        dialog.style.display = 'none';
    }

    // Hacer públicas las funciones de parseo para módulos externos
    window.parseDate = parseDate;
    window.parseTime = parseTime;
});