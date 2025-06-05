/**
 * Configuración de la aplicación de Análisis de Matriz de Eventos
 */

// Configuración de colores
export const CONFIG = {
    // Color base predeterminado para la visualización de clusters
    defaultBaseColor: "#fff7fb",
    defaultEndColor: "#014636",
    defaultColorScheme: "PuBuGn",
    
    // Número predeterminado de clusters
    defaultClusterCount: 5,
    
    // Rango permitido de clusters
    clusterRange: {
        min: 2,
        max: 10
    },
    
    // Días de la semana ordenados para la matriz
    daysOfWeek: [
        "Lunes", 
        "Martes", 
        "Miércoles", 
        "Jueves", 
        "Viernes", 
        "Sábado", 
        "Domingo"
    ],
    
    // Etiquetas para horas del día (formato 24h)
    hoursOfDay: Array.from({ length: 24 }, (_, i) => 
        i.toString().padStart(2, '0')
    ),
    
    // Mensajes de error para datos no válidos
    errorMessages: {
        invalidDate: "Formato de fecha inválido",
        invalidTime: "Formato de hora inválido",
        missingData: "Información de fecha u hora faltante"
    }
};

export default CONFIG;