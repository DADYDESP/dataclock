/**
 * Implementación de esquemas de color inspirados en ColorBrewer
 * https://colorbrewer2.org/
 */

// Esquemas de color secuenciales
export const COLOR_SCHEMES = {
    // ColorBrewer schemes
    PuBuGn: {
        name: "Púrpura a Verde (PuBuGn)",
        colors: {
            2: ["#fff7fb", "#014636"],
            3: ["#fff7fb", "#67a9cf", "#014636"],
            4: ["#fff7fb", "#9ecae1", "#2b8cbe", "#014636"],
            5: ["#fff7fb", "#bdc9e1", "#67a9cf", "#1c9099", "#014636"],
            6: ["#fff7fb", "#d0d1e6", "#a6bddb", "#3690c0", "#016c59", "#014636"],
            7: ["#fff7fb", "#d0d1e6", "#a6bddb", "#67a9cf", "#1c9099", "#016c59", "#014636"],
            8: ["#fff7fb", "#d0d1e6", "#a6bddb", "#67a9cf", "#3690c0", "#1c9099", "#016c59", "#014636"],
            9: ["#fff7fb", "#d0d1e6", "#a6bddb", "#67a9cf", "#3690c0", "#1c9099", "#016c59", "#014636", "#00261c"]
        }
    },
    YlGnBu: {
        name: "Amarillo a Azul (YlGnBu)",
        colors: {
            2: ["#ffffd9", "#081d58"],
            3: ["#ffffd9", "#41b6c4", "#081d58"],
            4: ["#ffffd9", "#7fcdbb", "#1d91c0", "#081d58"],
            5: ["#ffffd9", "#c7e9b4", "#41b6c4", "#225ea8", "#081d58"],
            6: ["#ffffd9", "#d9f0a3", "#7fcdbb", "#1d91c0", "#225ea8", "#081d58"],
            7: ["#ffffd9", "#d9f0a3", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#081d58"],
            8: ["#ffffd9", "#d9f0a3", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#081d58", "#041b36"],
            9: ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#081d58", "#041b36"]
        }
    },
    OrRd: {
        name: "Naranja a Rojo (OrRd)",
        colors: {
            2: ["#fff7ec", "#7f0000"],
            3: ["#fff7ec", "#fd8d3c", "#7f0000"],
            4: ["#fff7ec", "#fecc5c", "#f03b20", "#7f0000"],
            5: ["#fff7ec", "#fed976", "#fd8d3c", "#e31a1c", "#7f0000"],
            6: ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#e31a1c", "#7f0000"],
            7: ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#e31a1c", "#7f0000"],
            8: ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#7f0000"],
            9: ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#990000", "#7f0000"]
        }
    },
    Blues: {
        name: "Azules (Blues)",
        colors: {
            2: ["#f7fbff", "#08306b"],
            3: ["#f7fbff", "#6baed6", "#08306b"],
            4: ["#f7fbff", "#9ecae1", "#3182bd", "#08306b"],
            5: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
            6: ["#f7fbff", "#deebf7", "#c6dbef", "#6baed6", "#3182bd", "#08306b"],
            7: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08306b"],
            8: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08306b"],
            9: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08306b", "#042448"]
        }
    },
    Greens: {
        name: "Verdes (Greens)",
        colors: {
            2: ["#f7fcf5", "#00441b"],
            3: ["#f7fcf5", "#74c476", "#00441b"],
            4: ["#f7fcf5", "#bae4b3", "#31a354", "#00441b"],
            5: ["#f7fcf5", "#d3eece", "#74c476", "#238b45", "#00441b"],
            6: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#74c476", "#31a354", "#00441b"],
            7: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#31a354", "#00441b"],
            8: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#00441b"],
            9: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"]
        }
    },
    // Personalizados
    Custom: {
        name: "Personalizado",
        colors: {}
    }
};

// Obtener un esquema de color específico
export function getColorScheme(schemeName, count) {
    if (!COLOR_SCHEMES[schemeName]) {
        return null;
    }
    
    const scheme = COLOR_SCHEMES[schemeName];
    
    // Si el esquema tiene exactamente el número de colores solicitado
    if (scheme.colors[count]) {
        return scheme.colors[count];
    }
    
    // Si se solicita más colores de los disponibles, usar el máximo disponible
    const availableCounts = Object.keys(scheme.colors).map(Number).sort((a, b) => a - b);
    const maxCount = availableCounts[availableCounts.length - 1];
    
    if (count > maxCount) {
        return scheme.colors[maxCount];
    }
    
    // Si se solicita un número intermedio no disponible, usar el siguiente disponible
    for (const available of availableCounts) {
        if (available >= count) {
            return scheme.colors[available];
        }
    }
    
    return null;
}

// Función para generar esquema personalizado
export function generateCustomScheme(startColor, endColor, count) {
    const colors = [];
    
    // Conversión de hex a componentes RGB
    const startRGB = hexToRgb(startColor);
    const endRGB = hexToRgb(endColor);
    
    for (let i = 0; i < count; i++) {
        const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * (i / (count - 1)));
        const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * (i / (count - 1)));
        const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * (i / (count - 1)));
        
        colors.push(rgbToHex(r, g, b));
    }
    
    return colors;
}

// Funciones auxiliares para conversión de colores
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}