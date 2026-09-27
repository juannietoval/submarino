/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * TelemetryDashboard.js - Visualización HUD de métricas físicas en vivo:
 * Profundidad, velocidad vertical, balanza E vs W, presión hidrostática,
 * compresión volumétrica por Ley de Hooke, integridad del casco y sonar acústico.
 */

import { SUBMARINE_CONSTANTS, PHYSICS_CONSTANTS } from '../config/constants.js';

export class TelemetryDashboard {
    constructor(state) {
        this.state = state;
        this.container = document.getElementById('telemetry-dashboard');

        // Audio Context para síntesis de Sonar Ping
        this.audioCtx = null;
        this.lastPingTime = 0;

        this.initDOMElements();
        this.setupAudio();
    }

    /**
     * Mapea elementos del DOM para actualizaciones de alto rendimiento sin reflows costosos
     */
    initDOMElements() {
        this.dom = {
            depthVal: document.getElementById('telemetry-depth-val'),
            depthRate: document.getElementById('telemetry-depth-rate'),
            depthGaugeFill: document.getElementById('gauge-depth-fill'),
            
            buoyancyVal: document.getElementById('telemetry-buoyancy-val'),
            weightVal: document.getElementById('telemetry-weight-val'),
            balanceIndicator: document.getElementById('buoyancy-balance-indicator'),
            balanceStatus: document.getElementById('buoyancy-balance-status'),

            netForceVal: document.getElementById('telemetry-netforce-val'),
            accelVal: document.getElementById('telemetry-accel-val'),
            velocityVal: document.getElementById('telemetry-velocity-val'),

            pressureVal: document.getElementById('telemetry-pressure-val'),
            pressureAtm: document.getElementById('telemetry-pressure-atm'),

            fwdBallastBar: document.getElementById('ballast-bar-fwd'),
            aftBallastBar: document.getElementById('ballast-bar-aft'),
            fwdBallastTxt: document.getElementById('ballast-txt-fwd'),
            aftBallastTxt: document.getElementById('ballast-txt-aft'),

            volumeCurrent: document.getElementById('telemetry-volume-current'),
            volumeCompPct: document.getElementById('telemetry-volume-comp'),

            densityVal: document.getElementById('telemetry-density-val'),

            integrityVal: document.getElementById('telemetry-integrity-val'),
            integrityBar: document.getElementById('telemetry-integrity-bar'),
            alarmBanner: document.getElementById('alarm-banner'),
        };
    }

    /**
     * Inicializa sintetizador de sonido Web Audio API para el clásico "Ping" de sonar
     */
    setupAudio() {
        this.state.on('play-sonar-ping', () => {
            this.playSonarPing();
        });
    }

    playSonarPing() {
        if (!this.state.soundEnabled) return;
        try {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioContext();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            // Oscilador senoidal puro a 1250 Hz (frecuencia típica sonar activo)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1250, now);
            osc.frequency.exponentialRampToValueAtTime(1240, now + 0.35); // Doppler leve

            // Envolvente de decaimiento acústico submarino
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 1.25);
        } catch (e) {
            console.warn('Web Audio no disponible:', e);
        }
    }

    /**
     * Formatea números con separadores y precisión fija
     */
    formatNumber(num, decimals = 1) {
        return num.toLocaleString('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    /**
     * Actualiza el dashboard en cada cuadro de animación
     */
    update() {
        const s = this.state;
        const d = this.dom;
        const depth = Math.max(0, -s.y);

        // 1. Profundidad y tasa de descenso/ascenso
        if (d.depthVal) d.depthVal.textContent = this.formatNumber(depth, 1) + ' m';
        if (d.depthRate) {
            const rate = -s.vy; // Positivo si se sumerge, negativo si emerge
            const arrow = rate > 0.05 ? '▼ Hundimiento' : rate < -0.05 ? '▲ Ascenso' : '● Estacionario';
            d.depthRate.textContent = `${arrow} (${this.formatNumber(Math.abs(rate), 2)} m/s)`;
            d.depthRate.className = rate > 0.05 ? 'rate-descending' : rate < -0.05 ? 'rate-ascending' : 'rate-neutral';
        }

        // Indicador de nivel en el gauge de profundidad
        if (d.depthGaugeFill) {
            const gaugePct = Math.min(100, (depth / SUBMARINE_CONSTANTS.CRUSH_DEPTH) * 100);
            d.depthGaugeFill.style.height = `${gaugePct}%`;
        }

        // 2. Balanza Empuje E vs Peso W
        const eKn = s.buoyancyForce / 1000;
        const wKn = s.weightForce / 1000;
        if (d.buoyancyVal) d.buoyancyVal.textContent = `${this.formatNumber(eKn, 0)} kN`;
        if (d.weightVal) d.weightVal.textContent = `${this.formatNumber(wKn, 0)} kN`;

        // Balanza visual (-100% todo abajo, 0% equilibrio neutro, +100% todo arriba)
        if (d.balanceIndicator && d.balanceStatus) {
            const deltaF = s.buoyancyForce - s.weightForce;
            const maxDelta = 300000; // 300 kN
            const normDelta = Math.max(-1, Math.min(1, deltaF / maxDelta));
            const pct = 50 + normDelta * 45; // 50% es centro neutro
            d.balanceIndicator.style.left = `${pct}%`;

            if (Math.abs(deltaF) < 15000 && Math.abs(s.vy) < 0.1) {
                d.balanceStatus.textContent = 'Flotabilidad Neutra (E ≈ W)';
                d.balanceStatus.className = 'status-badge status-neutral';
            } else if (deltaF > 0) {
                d.balanceStatus.textContent = `Flotabilidad Positiva (+${this.formatNumber(deltaF / 1000, 0)} kN)`;
                d.balanceStatus.className = 'status-badge status-positive';
            } else {
                d.balanceStatus.textContent = `Flotabilidad Negativa (${this.formatNumber(deltaF / 1000, 0)} kN)`;
                d.balanceStatus.className = 'status-badge status-negative';
            }
        }

        // 3. Cinemática vertical neta
        if (d.netForceVal) d.netForceVal.textContent = `${this.formatNumber(s.netForceY / 1000, 1)} kN`;
        if (d.accelVal) d.accelVal.textContent = `${this.formatNumber(s.ay, 2)} m/s²`;
        if (d.velocityVal) d.velocityVal.textContent = `${this.formatNumber(s.vy, 2)} m/s`;

        // 4. Presión hidrostática total (P = Patm + rho * g * h)
        if (d.pressureVal) {
            const pKpa = s.hydrostaticPressure / 1000;
            const pBar = s.hydrostaticPressure / 100000;
            d.pressureVal.textContent = `${this.formatNumber(pBar, 1)} bar (${this.formatNumber(pKpa, 0)} kPa)`;
        }
        if (d.pressureAtm) {
            const atm = s.hydrostaticPressure / PHYSICS_CONSTANTS.P_ATM;
            d.pressureAtm.textContent = `${this.formatNumber(atm, 1)} atm`;
        }

        // 5. Nivel de tanques de lastre
        if (d.fwdBallastBar) d.fwdBallastBar.style.width = `${s.fwdBallastPct}%`;
        if (d.aftBallastBar) d.aftBallastBar.style.width = `${s.aftBallastPct}%`;
        if (d.fwdBallastTxt) d.fwdBallastTxt.textContent = `${this.formatNumber(s.fwdBallastPct, 0)}% (${this.formatNumber(s.fwdBallastVolume, 1)} m³)`;
        if (d.aftBallastTxt) d.aftBallastTxt.textContent = `${this.formatNumber(s.aftBallastPct, 0)}% (${this.formatNumber(s.aftBallastVolume, 1)} m³)`;

        // 6. Volumen del casco y compresibilidad elástica
        if (d.volumeCurrent) d.volumeCurrent.textContent = `${this.formatNumber(s.currentHullVolume, 1)} m³`;
        if (d.volumeCompPct) {
            const comp = ((SUBMARINE_CONSTANTS.BASELINE_VOLUME - s.currentHullVolume) / SUBMARINE_CONSTANTS.BASELINE_VOLUME) * 100;
            d.volumeCompPct.textContent = `-${this.formatNumber(comp, 2)}%`;
        }

        // 7. Densidad del agua actual
        if (d.densityVal) d.densityVal.textContent = `${this.formatNumber(s.waterDensity, 0)} kg/m³`;

        // 8. Integridad estructural y alarmas
        if (d.integrityVal) d.integrityVal.textContent = `${this.formatNumber(s.structuralIntegrity, 0)}%`;
        if (d.integrityBar) {
            d.integrityBar.style.width = `${s.structuralIntegrity}%`;
            if (s.structuralIntegrity < 30) {
                d.integrityBar.style.backgroundColor = '#ff2244';
            } else if (s.structuralIntegrity < 70) {
                d.integrityBar.style.backgroundColor = '#ffaa00';
            } else {
                d.integrityBar.style.backgroundColor = '#00ffcc';
            }
        }

        // Alerta de proximidad a cota de implosión
        if (d.alarmBanner) {
            if (s.isImploded) {
                d.alarmBanner.textContent = '¡IMPLOSIÓN CATASTRÓFICA! CASCO DESTRUIDO';
                d.alarmBanner.className = 'alarm-banner alarm-critical active';
            } else if (depth >= SUBMARINE_CONSTANTS.CRUSH_DEPTH) {
                d.alarmBanner.textContent = '¡ALERTA CRÍTICA: PROFUNDIDAD DE COLAPSO SUPERADA!';
                d.alarmBanner.className = 'alarm-banner alarm-critical active';
            } else if (depth >= SUBMARINE_CONSTANTS.MAX_OPERATING_DEPTH) {
                d.alarmBanner.textContent = 'PRECAUCIÓN: COTA MÁXIMA OPERATIVA EXCEDIDA';
                d.alarmBanner.className = 'alarm-banner alarm-warning active';
            } else {
                d.alarmBanner.className = 'alarm-banner';
            }
        }

        // Sonar Ping periódico (cada 4 segundos cuando el sonar está encendido)
        if (s.soundEnabled && s.simTime - this.lastPingTime > 4.2) {
            this.lastPingTime = s.simTime;
            this.playSonarPing();
        }
    }
}
