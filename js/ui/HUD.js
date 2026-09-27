/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * HUD.js - Interfaz táctica minimalista, compacta y colapsable (Línea base aprobada).
 * Reserva el 85%+ de la pantalla para el viewport 3D.
 * Integra iconografía SVG exclusiva sin emojis ni stickers.
 */

import { Icons } from './Icons.js';
import { SUBMARINE_CONSTANTS, PHYSICS_CONSTANTS } from '../config/constants.js';

export class HUD {
    constructor(state, submarineModel, lightingSystem, cameraController, onOpenMathModal) {
        this.state = state;
        this.submarineModel = submarineModel;
        this.lightingSystem = lightingSystem;
        this.cameraController = cameraController;
        this.onOpenMathModal = onOpenMathModal;

        this.telemetryCollapsed = false;
        this.controlsCollapsed = false;

        this.createHUDLayout();
        this.bindEvents();
    }

    /**
     * Construcción de la estructura HTML con SVGs limpios integrados
     */
    createHUDLayout() {
        const hudContainer = document.getElementById('hud-layer');
        if (!hudContainer) return;

        hudContainer.innerHTML = `
            <!-- ENCABEZADO SUPERIOR DERECHO (Marca Académica Institucional UTP) -->
            <div class="academic-brand-watermark">
                <h1 class="brand-title-main">MECANISMO DE HUNDIMIENTO</h1>
                <div class="brand-subtitle-course">Laboratorio Virtual de Física I - UTP</div>
                <div class="brand-authors">Juan Nieto, Santiago Valencia, Juan Campos, Marlon Buitrago (2025)</div>
            </div>

            <!-- PANEL SUPERIOR IZQUIERDO: TELEMETRÍA COMPACTA (Línea base original) -->
            <div id="telemetry-card" class="compact-glass-card telemetry-card">
                <div class="card-header">
                    <span class="card-title">TELEMÉTRÍA</span>
                    <button id="btn-collapse-telemetry" class="collapse-toggle-btn" title="Colapsar panel">
                        ${Icons.minus}
                    </button>
                </div>
                <div id="telemetry-body" class="card-body">
                    <div class="hud-metric-row">
                        <span class="label">Profundidad (h):</span>
                        <span id="hud-depth" class="value">0.2 m</span>
                    </div>
                    <div class="hud-metric-row">
                        <span class="label">Presión Ext:</span>
                        <span id="hud-pressure" class="value">1.02 atm</span>
                    </div>
                    <div class="hud-metric-row">
                        <span class="label">Volumen Casco:</span>
                        <span id="hud-volume" class="value">100.00%</span>
                    </div>
                    <div class="hud-metric-row">
                        <span class="label">Densidad Sub:</span>
                        <span id="hud-density" class="value">923 kg/m³</span>
                    </div>
                    <div class="hud-status-row">
                        <span class="label">Estado:</span>
                        <span id="hud-state-badge" class="state-badge emerging">EMERGIENDO (E > W)</span>
                    </div>
                </div>
            </div>

            <!-- PANEL INFERIOR DERECHO: CONSOLA DE CONTROL TÁCTICA COMPACTA -->
            <div id="control-card" class="compact-glass-card control-card">
                <div class="card-header">
                    <span class="card-title">Panel de Control</span>
                    <button id="btn-collapse-controls" class="collapse-toggle-btn" title="Colapsar panel">
                        ${Icons.chevronDown}
                    </button>
                </div>
                <div id="control-body" class="card-body">
                    <!-- Control deslizante de inundación de lastre -->
                    <div class="control-row">
                        <div class="slider-header-line">
                            <span class="label">Llenar Tanques (%):</span>
                            <span id="val-ballast-pct" class="slider-readout">0%</span>
                        </div>
                        <input id="slider-ballast" type="range" min="0" max="100" step="1" value="0" class="hud-range-slider">
                    </div>

                    <!-- Presets de Cámara -->
                    <div class="cam-presets-row">
                        <button class="btn-cam-preset active" data-preset="iso">Isométrica</button>
                        <button class="btn-cam-preset" data-preset="side">Lateral</button>
                        <button class="btn-cam-preset" data-preset="tanks">Tanques</button>
                        <button class="btn-cam-preset" data-preset="top">Cenital</button>
                        <button class="btn-cam-preset" data-preset="bottom">Ventral</button>
                    </div>

                    <!-- Botón de Soplado de Emergencia (Aire comprimido a 200 bar) -->
                    <button id="btn-hud-emergency" class="btn-emergency-action">
                        ${Icons.alertTriangle}
                        <span>EMERGENCIA (Aire)</span>
                    </button>

                    <!-- Botón de Fundamentos EDOs -->
                    <button id="btn-hud-math" class="btn-secondary-action">
                        ${Icons.math}
                        <span>Fundamentos EDOs</span>
                    </button>

                    <!-- Botón de reinicio dentro del panel -->
                    <button id="btn-hud-reset" class="btn-secondary-action">
                        ${Icons.rotateCcw}
                        <span>Reiniciar</span>
                    </button>
                </div>
            </div>

            <!-- PIE DE PÁGINA (Guía de navegación del usuario) -->
            <footer class="interaction-footer">
                Interactuar: Click Izq (Rotar) | Click Der (Mover) | Rueda (Zoom)
            </footer>
        `;
    }

    /**
     * Vinculación de oyentes de eventos con respuesta inmediata
     */
    bindEvents() {
        // 1. Colapso de panel de telemetría (- / +)
        const btnColTel = document.getElementById('btn-collapse-telemetry');
        const telBody = document.getElementById('telemetry-body');
        if (btnColTel && telBody) {
            btnColTel.addEventListener('click', () => {
                this.telemetryCollapsed = !this.telemetryCollapsed;
                telBody.classList.toggle('collapsed', this.telemetryCollapsed);
                btnColTel.innerHTML = this.telemetryCollapsed ? Icons.plus : Icons.minus;
            });
        }

        // 2. Colapso de panel de control
        const btnColCtrl = document.getElementById('btn-collapse-controls');
        const ctrlBody = document.getElementById('control-body');
        if (btnColCtrl && ctrlBody) {
            btnColCtrl.addEventListener('click', () => {
                this.controlsCollapsed = !this.controlsCollapsed;
                ctrlBody.classList.toggle('collapsed', this.controlsCollapsed);
                btnColCtrl.innerHTML = this.controlsCollapsed ? Icons.chevronUp : Icons.chevronDown;
            });
        }

        // 3. Modal de Fundamentos EDOs
        const btnMath = document.getElementById('btn-hud-math') || document.getElementById('btn-toggle-math');
        if (btnMath && this.onOpenMathModal) {
            btnMath.addEventListener('click', () => this.onOpenMathModal());
        }

        // 4. Modo Rayos X
        const btnXray = document.getElementById('btn-toggle-xray');
        if (btnXray) {
            btnXray.addEventListener('click', () => {
                const isXray = !this.state.hullCutaway;
                this.submarineModel.setXrayMode(isXray);
                btnXray.classList.toggle('active', isXray);
            });
        }

        // 5. Linterna Dirigible
        const btnFlash = document.getElementById('btn-toggle-flashlight');
        if (btnFlash) {
            btnFlash.addEventListener('click', () => {
                const isFlash = !this.lightingSystem.flashlightActive;
                this.lightingSystem.setFlashlightEnabled(isFlash);
                btnFlash.classList.toggle('active', isFlash);
            });
        }

        // Atajo de teclado 'L' para linterna
        window.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                if (btnFlash) btnFlash.click();
            }
        });

        // 6. Botones de Reinicio
        let lastSliderPct = 0;
        const handleReset = () => {
            this.state.reset();
            this.state.isFilling = false;
            this.state.isBlowing = false;
            this.state.fillingTimer = 0.0;
            this.state.blowingTimer = 0.0;
            lastSliderPct = 0;
            const slider = document.getElementById('slider-ballast');
            if (slider) slider.value = 0;
            const readout = document.getElementById('val-ballast-pct');
            if (readout) readout.textContent = '0%';
        };

        const btnResetTop = document.getElementById('btn-reset-sim');
        if (btnResetTop) btnResetTop.addEventListener('click', handleReset);

        const btnResetCard = document.getElementById('btn-hud-reset');
        if (btnResetCard) btnResetCard.addEventListener('click', handleReset);

        // 7. Slider de Llenado de Tanques (0% a 100%)
        const sliderBallast = document.getElementById('slider-ballast');
        const readoutBallast = document.getElementById('val-ballast-pct');
        if (sliderBallast) {
            sliderBallast.addEventListener('input', (e) => {
                const pct = parseFloat(e.target.value);
                if (readoutBallast) readoutBallast.textContent = `${pct}%`;

                // Detectar direccion de flujo: llenado (inundacion) vs vaciado (inyeccion de aire)
                if (pct > lastSliderPct + 0.5) {
                    this.state.isFilling = true;
                    this.state.fillingTimer = 1.2;
                    this.state.isBlowing = false;
                    this.state.blowingTimer = 0.0;
                } else if (pct < lastSliderPct - 0.5) {
                    this.state.isBlowing = true;
                    this.state.blowingTimer = 1.5;
                    this.state.isFilling = false;
                    this.state.fillingTimer = 0.0;
                }
                lastSliderPct = pct;

                // Asignar volumen proporcional a tanques de proa y popa
                const fwdMax = SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_FWD;
                const aftMax = SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_AFT;
                this.state.fwdBallastVolume = fwdMax * (pct / 100.0);
                this.state.aftBallastVolume = aftMax * (pct / 100.0);
                this.state.valves.emergencyBlow = false;
            });
        }

        // 8. Botón Soplado de Emergencia (Inyección masiva de aire comprimido)
        const btnEmerg = document.getElementById('btn-hud-emergency');
        if (btnEmerg) {
            btnEmerg.addEventListener('click', () => {
                this.state.valves.emergencyBlow = true;
                this.state.isBlowing = true;
                this.state.blowingTimer = 3.5;
                this.state.isFilling = false;
                this.state.fillingTimer = 0.0;
            });
        }

        // 9. Presets de Cámara Cinemática
        const camBtns = document.querySelectorAll('.btn-cam-preset');
        camBtns.forEach(b => {
            b.addEventListener('click', () => {
                camBtns.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                if (this.cameraController) {
                    this.cameraController.setPreset(b.dataset.preset);
                }
            });
        });
    }

    /**
     * Actualiza las lecturas de telemetría por cada frame de animación
     */
    update() {
        const s = this.state;
        const depth = Math.max(0, -s.y);

        // 1. Profundidad
        const elDepth = document.getElementById('hud-depth');
        if (elDepth) elDepth.textContent = `${depth.toFixed(1)} m`;

        // 2. Presión Exterior en atmósferas
        const elPressure = document.getElementById('hud-pressure');
        if (elPressure) {
            const atm = s.hydrostaticPressure / PHYSICS_CONSTANTS.P_ATM;
            elPressure.textContent = `${atm.toFixed(2)} atm`;
        }

        // 3. Volumen del Casco % (por compresión de Hooke)
        const elVol = document.getElementById('hud-volume');
        if (elVol) {
            const volPct = (s.currentHullVolume / SUBMARINE_CONSTANTS.BASELINE_VOLUME) * 100;
            elVol.textContent = `${volPct.toFixed(2)}%`;
        }

        // 4. Densidad Media del Submarino (Masa total / Volumen desplazado)
        const elDens = document.getElementById('hud-density');
        if (elDens) {
            const subDensity = s.totalMass / s.currentHullVolume;
            elDens.textContent = `${Math.round(subDensity)} kg/m³`;
        }

        // 5. Empuje E y Peso W en MegaNewtons (MN)
        const elB = document.getElementById('hud-buoyancy');
        if (elB) elB.textContent = `${(s.buoyancyForce / 1000000).toFixed(2)} MN`;

        const elW = document.getElementById('hud-weight');
        if (elW) elW.textContent = `${(s.weightForce / 1000000).toFixed(2)} MN`;

        // 6. Estado Dinámico Sincronizado (Resuelve la discordancia reportada en 1.1)
        const elState = document.getElementById('hud-state-badge');
        if (elState) {
            const deltaF = s.buoyancyForce - s.weightForce;
            const threshold = 18000; // 18 kN de tolerancia para estado neutro

            if (Math.abs(deltaF) <= threshold && Math.abs(s.vy) < 0.08) {
                elState.textContent = 'NEUTRO (E ≈ W)';
                elState.className = 'state-badge neutral';
            } else if (deltaF > threshold) {
                elState.textContent = 'EMERGIENDO (E > W)';
                elState.className = 'state-badge emerging';
            } else {
                elState.textContent = 'HUNDIÉNDOSE (E < W)';
                elState.className = 'state-badge sinking';
            }
        }

        // 7. Sincronización continua del slider durante soplado de emergencia o purga activa
        if (s.valves.emergencyBlow || s.isBlowing) {
            const slider = document.getElementById('slider-ballast');
            const readout = document.getElementById('val-ballast-pct');
            const currentPct = Math.round(s.totalBallastPct);
            if (slider && document.activeElement !== slider) {
                slider.value = currentPct;
            }
            if (readout) {
                readout.textContent = `${currentPct}%`;
            }
        }
    }
}
