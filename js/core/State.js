/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * State.js - Estado global reactivo, almacenamiento de telemetría y publicador de eventos
 */

import { PHYSICS_CONSTANTS, SUBMARINE_CONSTANTS, ENVIRONMENT_CONSTANTS } from '../config/constants.js';

class SimulationState {
    constructor() {
        this.listeners = new Map();

        // Parámetros de simulación
        this.isRunning = true;
        this.timeScale = 1.0;
        this.simTime = 0.0;
        this.subSteps = 4; // RK4 sub-stepping para estabilidad

        // Parámetros del fluido ambiental
        this.waterDensity = PHYSICS_CONSTANTS.DENSITY_SEAWATER_STD; // kg/m^3
        this.gravity = PHYSICS_CONSTANTS.G; // m/s^2
        this.compressibilityMultiplier = 1.0; // Multiplicador didáctico de compresibilidad
        this.dragMultiplier = 1.0; // Multiplicador de arrastre

        // Estado cinemático del submarino
        // En Three.js: y = 0 es superficie, y < 0 es inmersión (profundidad h = -y)
        this.y = -0.2;          // Posición vertical (m) - inicia flotando en superficie a 0.2m
        this.vy = 0.0;          // Velocidad vertical (m/s)
        this.ay = 0.0;          // Aceleración vertical (m/s^2)
        
        this.x = 0.0;           // Posición horizontal (m)
        this.vx = 0.0;          // Velocidad de avance (m/s)
        this.ax = 0.0;          // Aceleración horizontal (m/s^2)

        this.pitch = 0.0;       // Ángulo de cabeceo (radianes)
        this.pitchRate = 0.0;   // Velocidad angular de cabeceo (rad/s)

        // Estado de los tanques de lastre (MBT)
        // Fracción de llenado inicial (0% para iniciar en superficie con máxima reserva de flotabilidad)
        this.fwdBallastVolume = 0.0;
        this.aftBallastVolume = 0.0;
        
        // Masa y volumen dinámicos
        this.ballastMass = 0.0;
        this.totalMass = SUBMARINE_CONSTANTS.HULL_DRY_MASS;
        this.currentHullVolume = SUBMARINE_CONSTANTS.BASELINE_VOLUME;
        this.submersionRatio = 0.0; // eta(y) de 0.0 (en aire) a 1.0 (completamente sumergido)

        // Dinámica de fuerzas calculadas (Newtons)
        this.buoyancyForce = 0.0;       // E(y) hacia arriba
        this.weightForce = 0.0;         // W(t) hacia abajo
        this.dragForceY = 0.0;          // Fd,y opuesta al movimiento vertical
        this.netForceY = 0.0;           // E - W - Fd
        this.seabedContactForce = 0.0;  // Fuerza de reacción del fondo marino
        this.hydrostaticPressure = 0.0; // Pa

        // Estado de control de válvulas y propulsión
        this.valves = {
            fwdFlood: false,
            fwdBlow: false,
            aftFlood: false,
            aftBlow: false,
            emergencyBlow: false,
        };

        this.throttle = 0.0;       // [-1.0 a 1.0] Acelerador motor
        this.propellerRPM = 0.0;   // RPM actual
        this.divePlanesAngle = 0.0;// Ángulo timones de inmersión en grados [-25 a 25]

        // Salud estructural e implosión
        this.structuralIntegrity = 100.0; // %
        this.isImploded = false;
        this.implosionTriggered = false;
        this.implosionProgress = 0.0;

        // Historial de telemetría para gráficas en tiempo real (buffer circular)
        this.historyCapacity = 240;
        this.history = {
            time: [],
            depth: [],
            vy: [],
            ay: [],
            buoyancy: [],
            weight: [],
            drag: [],
            volumeCompression: [],
        };

        // Modos de cámara y visualización
        this.viewMode = 'chase'; // 'chase', 'orbit', 'cutaway', 'sonar'
        this.hullCutaway = true; // Casco translúcido para ver tanques internos
        this.showForceVectors = true; // Flechas 3D de fuerzas
        this.soundEnabled = false; // Sonar acústico

        this.updateDerivedValues();
    }

    /**
     * Calcula valores derivados inmediatos basados en el estado actual
     */
    updateDerivedValues() {
        const depth = Math.max(0, -this.y);
        
        // Masa de agua en los tanques
        const totalBallastVol = this.fwdBallastVolume + this.aftBallastVolume;
        this.ballastMass = totalBallastVol * this.waterDensity;
        this.totalMass = SUBMARINE_CONSTANTS.HULL_DRY_MASS + this.ballastMass;

        // Presión hidrostática total (Ley fundamental de la hidrostática P = Patm + rho * g * h)
        this.hydrostaticPressure = PHYSICS_CONSTANTS.P_ATM + (this.waterDensity * this.gravity * depth);

        // Compresibilidad del casco (Ley de Hooke volumétrica)
        const beta = SUBMARINE_CONSTANTS.HULL_COMPRESSIBILITY_BETA * this.compressibilityMultiplier;
        const deltaV = -SUBMARINE_CONSTANTS.BASELINE_VOLUME * beta * (this.waterDensity * this.gravity * depth);
        this.currentHullVolume = Math.max(SUBMARINE_CONSTANTS.BASELINE_VOLUME * 0.7, SUBMARINE_CONSTANTS.BASELINE_VOLUME + deltaV);

        // Nivel de llenado en porcentaje para UI
        this.fwdBallastPct = (this.fwdBallastVolume / SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_FWD) * 100;
        this.aftBallastPct = (this.aftBallastVolume / SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_AFT) * 100;
        this.totalBallastPct = (totalBallastVol / (SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_FWD + SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_AFT)) * 100;
    }

    /**
     * Registra un punto en el buffer de telemetría
     */
    recordTelemetry() {
        const h = this.history;
        const depth = Math.max(0, -this.y);
        const compPct = ((SUBMARINE_CONSTANTS.BASELINE_VOLUME - this.currentHullVolume) / SUBMARINE_CONSTANTS.BASELINE_VOLUME) * 100;

        h.time.push(this.simTime);
        h.depth.push(depth);
        h.vy.push(this.vy);
        h.ay.push(this.ay);
        h.buoyancy.push(this.buoyancyForce / 1000); // kN
        h.weight.push(this.weightForce / 1000);     // kN
        h.drag.push(this.dragForceY / 1000);        // kN
        h.volumeCompression.push(compPct);

        if (h.time.length > this.historyCapacity) {
            h.time.shift();
            h.depth.shift();
            h.vy.shift();
            h.ay.shift();
            h.buoyancy.shift();
            h.weight.shift();
            h.drag.shift();
            h.volumeCompression.shift();
        }
    }

    /**
     * Reinicia el submarino a la condición de flotabilidad en superficie
     */
    reset() {
        this.y = -0.2;
        this.vy = 0.0;
        this.ay = 0.0;
        this.x = 0.0;
        this.vx = 0.0;
        this.ax = 0.0;
        this.pitch = 0.0;
        this.pitchRate = 0.0;

        // Válvulas cerradas
        this.valves.fwdFlood = false;
        this.valves.fwdBlow = false;
        this.valves.aftFlood = false;
        this.valves.aftBlow = false;
        this.valves.emergencyBlow = false;

        // Tanques al 0%
        this.fwdBallastVolume = 0.0;
        this.aftBallastVolume = 0.0;
        
        this.throttle = 0.0;
        this.propellerRPM = 0.0;
        this.divePlanesAngle = 0.0;

        this.structuralIntegrity = 100.0;
        this.isImploded = false;
        this.implosionTriggered = false;
        this.implosionProgress = 0.0;

        this.history.time.length = 0;
        this.history.depth.length = 0;
        this.history.vy.length = 0;
        this.history.ay.length = 0;
        this.history.buoyancy.length = 0;
        this.history.weight.length = 0;
        this.history.drag.length = 0;
        this.history.volumeCompression.length = 0;

        this.updateDerivedValues();
        this.emit('reset');
    }

    // Sistema sencillo de eventos Pub/Sub
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }
}

export const state = new SimulationState();
