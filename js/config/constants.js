/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * constants.js - Constantes físicas, parámetros geométricos y límites estructurales
 */

export const PHYSICS_CONSTANTS = {
    // Aceleración de la gravedad estándar (m/s^2)
    G: 9.80665,
    
    // Presión atmosférica al nivel del mar (Pa = N/m^2)
    P_ATM: 101325,
    
    // Densidades típicas del fluido (kg/m^3)
    DENSITY_FRESHWATER: 1000.0,
    DENSITY_SEAWATER_STD: 1025.0,
    DENSITY_SALINE_HIGH: 1035.0,
    DENSITY_DEAD_SEA: 1240.0,
    DENSITY_AIR: 1.225,

    // Viscosidad cinemática del agua de mar a 15°C (m^2/s)
    WATER_KINEMATIC_VISCOSITY: 1.19e-6,

    // Coeficiente de extinción lumínica para agua marina clara (Beer-Lambert, m^-1)
    LIGHT_EXTINCTION_K: 0.018,
};

export const SUBMARINE_CONSTANTS = {
    // Dimensiones geométricas principales (Escala real clase ataque oceánico)
    HULL_LENGTH: 42.0,        // Longitud eslora total (m)
    HULL_DIAMETER: 5.6,       // Diámetro manga máxima (m)
    SAIL_HEIGHT: 3.2,         // Altura de la vela / torre de mando (m)
    SAIL_LENGTH: 6.5,         // Longitud de la vela (m)
    
    // Áreas proyectadas de referencia para arrastre (m^2)
    AREA_FRONTAL: Math.PI * Math.pow(5.6 / 2, 2),  // ~24.63 m^2
    AREA_PLANFORM: 42.0 * 5.6 * 0.82,              // ~192.86 m^2 (vista en planta para movimiento vertical)
    
    // Coeficientes de arrastre hidrodinámico adimensionales (Cd)
    CD_VERTICAL: 0.85,        // Cilindro transversal / casco en descenso o ascenso vertical
    CD_FORWARD: 0.16,         // Casco Albacore teardrop optimizado axialmente

    // Parámetros de masa y desplazamiento
    HULL_DRY_MASS: 812240.0,  // Masa en seco del casco y maquinaria (Densidad inicial ~923 kg/m³)
    BASELINE_VOLUME: 880.0,   // Volumen desplazado nominal V0 (m^3) -> Flotabilidad max = 880 * 1025 * g ~ 8.85 MN
    
    // Capacidad de los Tanques de Lastre Principal (MBT - Main Ballast Tanks)
    BALLAST_MAX_VOLUME_FWD: 95.0, // Tanque proa (m^3)
    BALLAST_MAX_VOLUME_AFT: 95.0, // Tanque popa (m^3)
    // Volumen total de lastre = 190 m^3 (capacidad de agua máxima = 194.75 toneladas)
    
    // Tasas de flujo de válvulas de inundación y soplado (m^3/s)
    FLOOD_RATE_NORMAL: 12.0,       // Llenado por gravedad / inundación controlada
    BLOW_RATE_NORMAL: 14.0,        // Vaciado por aire a presión estándar
    BLOW_RATE_EMERGENCY: 45.0,     // Soplado de emergencia con banco de aire a 200 bar

    // Compresibilidad estructural del casco de presión (Ley de Hooke volumétrica)
    // delta_V / V0 = -BETA * rho * g * h
    // Coeficiente elástico calibrado para visualización didáctica y respuesta física inmediata
    HULL_COMPRESSIBILITY_BETA: 3.5e-7, // Produce ~3% de contracción a 15m, ~7% a 25m y ~12% a 35m
    
    // Límites operativos y de colapso estructural accesibles para experimentación pedagógica
    MAX_OPERATING_DEPTH: 20.0,  // Cota máxima de inmersión normal (m)
    TEST_DEPTH: 28.0,           // Cota de advertencia y fatiga elástica (m)
    CRUSH_DEPTH: 35.0,          // Profundidad crítica de implosión por presión hidrostática (m)
    
    // Parámetros de propulsión
    MAX_PROPELLER_RPM: 240.0,
    MAX_THRUST: 120000.0,        // 120 kN de empuje axial máximo
};

export const ENVIRONMENT_CONSTANTS = {
    SEA_SURFACE_Y: 0.0,          // Nivel del mar en el sistema de coordenadas
    SEABED_DEPTH: 48.0,          // Fondo marino accesible (profundidad en metros, y = -48 m)
    SEABED_SPRING_K: 5500000.0,  // Rigidez elástica del lecho marino para asentamiento firme (N/m)
    SEABED_DAMPING_C: 950000.0,  // Amortiguamiento viscoso del sedimento oceánico (N*s/m)
};
