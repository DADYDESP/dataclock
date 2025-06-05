/**
 * Gestiona la interfaz de usuario para el clustering
 */

import { generateColorGradient } from './clustering.js';
import { COLOR_SCHEMES, getColorScheme, generateCustomScheme } from './color-schemes.js';
import CONFIG from './config.js';

/**
 * Crea los controles para seleccionar colores de clusters
 * @param {Element} container - Contenedor para los controles
 * @param {Number} clusterCount - Número de clusters
 * @param {String} baseColor - Color base inicial
 * @returns {Array} - Array de elementos input para colores
 */
export function createClusterColorControls(container, clusterCount, baseColor) {
    container.innerHTML = '';
    
    // Obtener colores del esquema predeterminado
    let colors = getColorScheme(CONFIG.defaultColorScheme, clusterCount);
    
    // Si no hay un esquema disponible, usar generador personalizado
    if (!colors) {
        colors = generateCustomScheme(CONFIG.defaultBaseColor, CONFIG.defaultEndColor, clusterCount);
    }
    
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'cluster-color-controls';
    
    // Crear contenedor para opciones de color
    const colorOptionsContainer = document.createElement('div');
    colorOptionsContainer.className = 'color-options-container';
    
    // Crear selector de esquema de color
    const schemeSelectContainer = document.createElement('div');
    schemeSelectContainer.className = 'scheme-select-container';
    
    const schemeLabel = document.createElement('label');
    schemeLabel.textContent = 'Esquema de color:';
    schemeLabel.htmlFor = 'colorSchemeSelect';
    
    const schemeSelect = document.createElement('select');
    schemeSelect.id = 'colorSchemeSelect';
    
    // Agregar opciones para cada esquema
    Object.keys(COLOR_SCHEMES).forEach(schemeName => {
        const option = document.createElement('option');
        option.value = schemeName;
        option.textContent = COLOR_SCHEMES[schemeName].name;
        if (schemeName === CONFIG.defaultColorScheme) {
            option.selected = true;
        }
        schemeSelect.appendChild(option);
    });
    
    // Evento para cambiar el esquema
    schemeSelect.addEventListener('change', function() {
        const selectedScheme = this.value;
        let newColors;
        
        if (selectedScheme === 'Custom') {
            // Usar los colores actuales como base
            const currentColors = colorInputs.map(input => input.value);
            newColors = currentColors;
        } else {
            // Obtener colores del esquema seleccionado
            newColors = getColorScheme(selectedScheme, clusterCount);
            if (!newColors) {
                newColors = generateCustomScheme(CONFIG.defaultBaseColor, CONFIG.defaultEndColor, clusterCount);
            }
            
            // Actualizar cada input de color
            colorInputs.forEach((input, index) => {
                input.value = newColors[index];
            });
        }
    });
    
    schemeSelectContainer.appendChild(schemeLabel);
    schemeSelectContainer.appendChild(schemeSelect);
    
    // Título para los inputs de color
    const colorInputsWrapper = document.createElement('div');
    colorInputsWrapper.className = 'color-inputs-wrapper';
    
    const title = document.createElement('label');
    title.textContent = 'Colores de clusters:';
    colorInputsWrapper.appendChild(title);
    
    // Contenedor para los inputs de color
    const inputsContainer = document.createElement('div');
    inputsContainer.className = 'color-inputs-container';
    
    // Crear inputs de color en orden (de mayor a menor valor)
    const colorInputs = [];
    for (let i = 0; i < clusterCount; i++) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = colors[i];
        colorInput.dataset.index = i;
        
        // El primer color es el color base, actualizamos su título
        if (i === 0) {
            colorInput.title = `Color base (cluster ${i+1})`;
        } else {
            colorInput.title = `Color para cluster ${i+1}`;
        }
        
        colorInputs.push(colorInput);
        inputsContainer.appendChild(colorInput);
    }
    
    colorInputsWrapper.appendChild(inputsContainer);
    
    // Agregar todos los elementos al contenedor principal
    colorOptionsContainer.appendChild(schemeSelectContainer);
    colorOptionsContainer.appendChild(colorInputsWrapper);
    controlsWrapper.appendChild(colorOptionsContainer);
    
    container.appendChild(controlsWrapper);
    
    return colorInputs;
}

/**
 * Obtiene los colores seleccionados de los controles
 * @param {Array} colorInputs - Elementos input de colores
 * @returns {Array} - Array de colores en formato hexadecimal
 */
export function getSelectedColors(colorInputs) {
    return colorInputs.map(input => input.value);
}