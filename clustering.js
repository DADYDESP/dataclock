/**
 * Módulo de clustering para la aplicación de Análisis de Matriz de Eventos
 * Este archivo contiene funciones relacionadas con el algoritmo K-means
 */

/**
 * Aplica el algoritmo K-means a los datos proporcionados
 * @param {Array} dataPoints - Puntos de datos para el clustering
 * @param {Number} clusterCount - Número de clusters a generar
 * @param {Array} colors - Array de colores hexadecimales
 * @param {String} [dataType='counts'] - Tipo de datos ('counts' o 'percentages') para ajustar el redondeo del cluster info
 * @returns {Object} Resultado del clustering
 */
export function performKMeansClustering(dataPoints, clusterCount, colors, dataType = 'counts') {
    // Manejo de casos especiales para evitar errores
    if (dataPoints.length === 0) {
        throw new Error('No hay datos para aplicar clustering');
    }

    // Filtrar puntos para clustering - solo valores mayores a cero
    const validDataPoints = dataPoints.filter(point => point[0] > 0);
    const zeroDataPoints = dataPoints.filter(point => point[0] === 0);

    // Verificar si hay suficientes puntos para cluster
    if (validDataPoints.length < clusterCount) {
        // Crear clusters artificiales con los puntos disponibles
        return createArtificialClustersWithZeroHandling(dataPoints, clusterCount, colors, dataType);
    }

    // Verificar si todos los valores son iguales
    const allEqual = validDataPoints.every(point => point[0] === validDataPoints[0][0]);

    if (allEqual) {
        // Si todos los valores son iguales, crear clusters artificiales
        return createArtificialClustersWithZeroHandling(dataPoints, clusterCount, colors, dataType);
    }

    try {
        // Aplicar K-Means solo a los puntos con valores mayores a cero
        const kmeans = window.mlKmeans.kmeans(validDataPoints, clusterCount, {
            seed: 42,  // Para resultados consistentes
            maxIterations: 100
        });

        // Asignar colores a los clusters
        // Asegurarse de que colors es un array
        const clusterColors = Array.isArray(colors) ? colors : generateColorGradient('#ffffff', clusterCount); // Fallback a blanco si no es array

        // Ordenar clusters por su valor promedio (centroide)
        const clusterInfo = [];
        for (let i = 0; i < clusterCount; i++) {
            clusterInfo.push({
                index: i,
                center: kmeans.centroids[i][0], // Guardar centroide sin redondear inicialmente
                color: clusterColors[i]
            });
        }

        // Ordenar de menor a mayor valor
        clusterInfo.sort((a, b) => a.center - b.center);

        // Determinar decimales para redondear basado en dataType
        const decimals = dataType === 'percentages' ? 4 : 0;

        // Reasignar colores en orden y calcular rangos redondeados
        for (let i = 0; i < clusterCount; i++) {
            clusterInfo[i].color = clusterColors[i];
            const range = getClusterRange(validDataPoints, kmeans.clusters, clusterInfo[i].index);
            // Redondear centroide y rango según dataType
            clusterInfo[i].range = {
                min: parseFloat(range.min.toFixed(decimals)),
                max: parseFloat(range.max.toFixed(decimals))
            };
            clusterInfo[i].center = parseFloat(clusterInfo[i].center.toFixed(decimals));
        }

        // Reconstruir la asignación de clusters para todos los puntos
        const pointClusters = [];
        let currentPointIndex = 0;

        for (let i = 0; i < dataPoints.length; i++) {
            if (dataPoints[i][0] === 0) {
                // Asignar valores cero a un "cluster especial" (-1)
                pointClusters.push(-1);
            } else {
                // Asignar el cluster según el algoritmo
                const clusterIndex = kmeans.clusters[currentPointIndex];

                // Encontrar el nuevo índice después de la ordenación
                const newClusterIndex = clusterInfo.findIndex(c => c.index === clusterIndex);
                pointClusters.push(newClusterIndex);

                currentPointIndex++;
            }
        }

        return {
            clusterInfo: clusterInfo,
            pointClusters: pointClusters
        };

    } catch (error) {
        console.error('Error en algoritmo K-means:', error);
        // Intentar con enfoque alternativo si el algoritmo falla
        return createArtificialClustersWithZeroHandling(dataPoints, clusterCount, colors, dataType);
    }
}

/**
 * Crea clusters artificiales cuando K-means falla, con manejo especial para valores cero
 * @param {Array} dataPoints - Puntos de datos
 * @param {Number} clusterCount - Número de clusters
 * @param {Array} colors - Array de colores hexadecimales
 * @param {String} [dataType='counts'] - Tipo de datos ('counts' o 'percentages')
 * @returns {Object} Clusters artificiales
 */
function createArtificialClustersWithZeroHandling(dataPoints, clusterCount, colors, dataType = 'counts') {
    // Separar puntos con valor cero
    const zeroDataPoints = dataPoints.filter(point => point[0] === 0);
    const validDataPoints = dataPoints.filter(point => point[0] > 0);

    // Encontrar el valor mínimo y máximo solo entre valores mayores a cero
    let min = Infinity;
    let max = -Infinity;

    validDataPoints.forEach(point => {
        if (point[0] < min) min = point[0];
        if (point[0] > max) max = point[0];
    });

    // Si no hay valores mayores a cero, asignar min=0 (o 0.00 para porcentajes)
    if (min === Infinity || max === -Infinity) {
        min = 0;
        max = 0;
    }

    // Crear rangos uniformes para los clusters
    const range = max - min;
    // Asegurar que el paso no sea cero si el rango es cero
    const step = clusterCount > 0 ? range / clusterCount : 0;
    const clusterColors = Array.isArray(colors) ? colors : generateColorGradient('#ffffff', clusterCount); // Fallback

    // Determinar decimales para redondear
    const decimals = dataType === 'percentages' ? 4 : 0;

    const clusterInfo = [];

    for (let i = 0; i < clusterCount; i++) {
        // Evitar que el rango mínimo sea negativo si min es 0 y step es 0
        const rangeMin = Math.max(0, min + i * step);
        // Asegurar que el último cluster alcance el máximo
        const rangeMax = (i === clusterCount - 1 || step === 0) ? max : min + (i + 1) * step;

        // Calcular y redondear centroide y rango
        clusterInfo.push({
            index: i,
            center: parseFloat(((rangeMin + rangeMax) / 2).toFixed(decimals)),
            color: clusterColors[i],
            range: {
                min: parseFloat(rangeMin.toFixed(decimals)),
                max: parseFloat(rangeMax.toFixed(decimals))
            }
        });
    }

    // Asignar cada punto a un cluster basado en su valor
    const pointClusters = dataPoints.map(point => {
        const value = point[0];

        // Valores cero se asignan a un "cluster especial" (-1)
        if (value === 0) {
            return -1;
        }

        // Handle the case where step is 0
        if (step === 0) {
            return 0; // Assign all non-zero values to the first cluster if range is 0
        }

        // Encontrar el cluster apropiado para valores mayores a cero
        for (let i = 0; i < clusterCount; i++) {
            if (value <= clusterInfo[i].range.max) {
                return i;
            }
        }

        return clusterCount - 1;
    });

    return {
        clusterInfo: clusterInfo,
        pointClusters: pointClusters
    };
}

/**
 * Obtiene el rango de valores en un cluster
 * @param {Array} dataPoints - Puntos de datos
 * @param {Array} clusters - Asignación de clusters
 * @param {Number} clusterIndex - Índice del cluster
 * @returns {Object} Rango mínimo y máximo
 */
function getClusterRange(dataPoints, clusters, clusterIndex) {
    const values = [];
    for (let i = 0; i < clusters.length; i++) {
        if (clusters[i] === clusterIndex) {
            values.push(dataPoints[i][0]);
        }
    }

    // Si no hay valores, devolver 0. Si hay, devolver min/max
    if (values.length === 0) {
        return { min: 0, max: 0 };
    }

    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

/**
 * Convierte color hexadecimal a RGB
 * @param {String} hex - Color en formato hexadecimal
 * @returns {Object|null} - Objeto con componentes RGB o null
 */
function hexToRgb(hex) {
    // Quitar el # si está presente
    hex = hex.replace(/^#/, '');

    // Manejar formato abreviado (p.ej. #ABC)
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    // Convertir a valores RGB
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * Genera una gradiente de color
 * @param {String} baseColor - Color base en formato hexadecimal
 * @param {Number} steps - Número de pasos en la gradiente (debe ser >= 1)
 * @returns {Array} Array de colores en formato hexadecimal
 */
export function generateColorGradient(baseColor, steps) {
    // Convertir color base a componentes RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Generar gradiente
    const gradient = [];
    for (let i = 0; i < steps; i++) {
        // Calcular factor de intensidad (0.3 - 1.0), evitar división por cero si steps es 1
        // Invertir el factor para que valores más altos tengan colores más oscuros
        let factor;
        if (steps <= 1) {
            factor = 1.0; // Solo un color, usar el base
        } else {
            factor = 1.0 - (0.7 * i / (steps - 1));
        }

        // Aplicar factor a componentes RGB
        const adjustedR = Math.max(0, Math.min(255, Math.round(r * factor)));
        const adjustedG = Math.max(0, Math.min(255, Math.round(g * factor)));
        const adjustedB = Math.max(0, Math.min(255, Math.round(b * factor)));

        // Convertir de nuevo a formato hexadecimal
        const colorHex = '#' +
            (adjustedR < 16 ? '0' : '') + adjustedR.toString(16) +
            (adjustedG < 16 ? '0' : '') + adjustedG.toString(16) +
            (adjustedB < 16 ? '0' : '') + adjustedB.toString(16);

        gradient.push(colorHex);
    }

    return gradient;
}