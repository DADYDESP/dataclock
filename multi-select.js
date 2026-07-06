/**
 * Módulo para manejar selecciones múltiples en filtros
 */

/**
 * Convierte un selector regular en un selector múltiple con checkboxes
 * @param {HTMLElement} originalSelect - Elemento select original
 * @param {Function} onChangeCallback - Función a llamar cuando cambia la selección
 * @returns {Object} - Objeto con métodos para manipular el selector múltiple
 */
export function createMultiSelect(originalSelect, onChangeCallback = null) {
    // Ocultar el select original
    originalSelect.style.display = 'none';
    
    // Crear contenedor principal
    const container = document.createElement('div');
    container.className = 'multi-select-container';
    originalSelect.parentNode.insertBefore(container, originalSelect.nextSibling);
    
    // Crear el botón de selección
    const button = document.createElement('button');
    button.className = 'multi-select-button';
    button.textContent = 'Seleccionar opciones...';
    container.appendChild(button);
    
    // Crear el panel desplegable
    const dropdown = document.createElement('div');
    dropdown.className = 'multi-select-dropdown';
    container.appendChild(dropdown);
    
    // Variable para almacenar las opciones seleccionadas
    const selectedValues = new Set();
    
    // Función para actualizar el botón con las opciones seleccionadas
    const updateButtonText = () => {
        if (selectedValues.size === 0) {
            button.textContent = 'Seleccionar opciones...';
        } else if (selectedValues.size === 1) {
            button.textContent = Array.from(selectedValues)[0];
        } else {
            button.textContent = `${selectedValues.size} opciones seleccionadas`;
        }
    };
    
    // Función para agregar opciones al dropdown
    const populateDropdown = (options) => {
        dropdown.innerHTML = '';
        
        // Opción de "Todos/Ninguno"
        const allNoneContainer = document.createElement('div');
        allNoneContainer.className = 'multi-select-all-none';
        
        const selectAllButton = document.createElement('button');
        selectAllButton.textContent = 'Seleccionar todos';
        selectAllButton.className = 'multi-select-all';
        
        const selectNoneButton = document.createElement('button');
        selectNoneButton.textContent = 'Desmarcar todos';
        selectNoneButton.className = 'multi-select-none';
        
        selectAllButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            options.forEach(option => {
                if (option.value) {
                    selectedValues.add(option.textContent);
                }
            });
            
            refreshCheckboxes();
            updateButtonText();
            
            if (onChangeCallback) onChangeCallback(Array.from(selectedValues));
        });
        
        selectNoneButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            selectedValues.clear();
            refreshCheckboxes();
            updateButtonText();
            
            if (onChangeCallback) onChangeCallback([]);
        });
        
        allNoneContainer.appendChild(selectAllButton);
        allNoneContainer.appendChild(selectNoneButton);
        dropdown.appendChild(allNoneContainer);
        
        // Separador
        const separator = document.createElement('div');
        separator.className = 'multi-select-separator';
        dropdown.appendChild(separator);

        // Input de búsqueda
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar...';
        searchInput.className = 'multi-select-search';
        dropdown.appendChild(searchInput);
        
        // Separador
        const separator2 = document.createElement('div');
        separator2.className = 'multi-select-separator';
        dropdown.appendChild(separator2);
        
        // Contenedor para las opciones filtradas
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'multi-select-options-container';
        dropdown.appendChild(optionsContainer);

        let filteredOptions = [...options]; // Copia para filtrar

        const updateFilteredOptions = () => {
            optionsContainer.innerHTML = ''; // Limpiar opciones
            filteredOptions.forEach(option => {
                if (!option.value) return; // Saltar opciones sin valor
            
                const checkContainer = document.createElement('div');
                checkContainer.className = 'multi-select-option';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = option.value;
                checkbox.id = `multi-${originalSelect.id}-${option.value}`;
                checkbox.checked = selectedValues.has(option.textContent);
                
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        selectedValues.add(option.textContent);
                    } else {
                        selectedValues.delete(option.textContent);
                    }
                    
                    updateButtonText();
                    
                    if (onChangeCallback) onChangeCallback(Array.from(selectedValues));
                });
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = option.textContent;
                
                checkContainer.appendChild(checkbox);
                checkContainer.appendChild(label);
                optionsContainer.appendChild(checkContainer);
            });
        }
        
        // Escuchar por cambios en la búsqueda
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            filteredOptions = options.filter(option => option.textContent.toLowerCase().includes(searchTerm));
            updateFilteredOptions();
        });

        updateFilteredOptions();
    };
    
    // Función para actualizar los checkboxes según los valores seleccionados
    const refreshCheckboxes = () => {
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const label = checkbox.nextElementSibling;
            checkbox.checked = selectedValues.has(label.textContent);
        });
    };
    
    // Función para mostrar un indicador de carga
    const showLoadingIndicator = (parent, text) => {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.textContent = text;
        parent.appendChild(loadingIndicator);
        return loadingIndicator;
    };
    
    // Poblar inicialmente el dropdown
    populateDropdown(Array.from(originalSelect.options));
    
    // Manejar la apertura/cierre del dropdown
    button.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.toggle('show');
        
        // Cerrar al hacer clic fuera
        if (dropdown.classList.contains('show')) {
            const closeDropdown = (event) => {
                if (!container.contains(event.target)) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            };
            
            // Pequeño retraso para evitar que el primer clic lo cierre inmediatamente
            setTimeout(() => {
                document.addEventListener('click', closeDropdown);
            }, 100);
        }
    });
    
    // Función para actualizar las opciones
    const updateOptions = (newOptions) => {
        // Si hay muchas opciones, mostrar un indicador de carga
        const showLoading = newOptions.length > 50;
        let loadingIndicator = null;
        
        if (showLoading) {
            loadingIndicator = showLoadingIndicator(container, 'Cargando opciones...');
            
            // Usar setTimeout para permitir que la UI se actualice
            setTimeout(() => {
                populateDropdown(newOptions);
                refreshCheckboxes();
                loadingIndicator.remove();
            }, 10);
        } else {
            populateDropdown(newOptions);
            refreshCheckboxes();
        }
    };
    
    // Método para obtener valores seleccionados
    const getSelectedValues = () => {
        return Array.from(selectedValues);
    };
    
    // Método para establecer valores seleccionados
    const setSelectedValues = (values) => {
        selectedValues.clear();
        values.forEach(value => selectedValues.add(value));
        refreshCheckboxes();
        updateButtonText();
    };
    
    return {
        updateOptions,
        getSelectedValues,
        setSelectedValues
    };
}