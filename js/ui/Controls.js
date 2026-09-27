/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * Controls.js - Interfaz de control táctico: Válvulas de lastre, Soplado de Emergencia,
 * acelerador de propulsión, timones de inmersión, selectores de densidad y cámaras.
 */

import { PHYSICS_CONSTANTS } from '../config/constants.js';

export class Controls {
    constructor(state, submarineModel, cameraController) {
        this.state = state;
        this.submarineModel = submarineModel;
        this.cameraController = cameraController;

        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        // Válvulas de Proa
        this.btnFwdFlood = document.getElementById('btn-fwd-flood');
        this.btnFwdBlow = document.getElementById('btn-fwd-blow');

        // Válvulas de Popa
        this.btnAftFlood = document.getElementById('btn-aft-flood');
        this.btnAftBlow = document.getElementById('btn-aft-blow');

        // Válvulas globales (ambos tanques)
        this.btnAllFlood = document.getElementById('btn-all-flood');
        this.btnAllBlow = document.getElementById('btn-all-blow');

        // Soplado de Emergencia (Emergency Blow)
        this.btnEmergencyBlow = document.getElementById('btn-emergency-blow');

        // Propulsión y Timones
        this.sliderThrottle = document.getElementById('slider-throttle');
        this.valThrottle = document.getElementById('val-throttle');
        this.sliderPlanes = document.getElementById('slider-planes');
        this.valPlanes = document.getElementById('val-planes');

        // Parámetros Físicos
        this.selectDensityPreset = document.getElementById('select-density-preset');
        this.sliderDensity = document.getElementById('slider-density');
        this.sliderDensityVal = document.getElementById('val-density');

        this.sliderCompressibility = document.getElementById('slider-compressibility');
        this.sliderCompressibilityVal = document.getElementById('val-compressibility');

        this.sliderDrag = document.getElementById('slider-drag');
        this.sliderDragVal = document.getElementById('val-drag');

        // Simulación
        this.btnPlayPause = document.getElementById('btn-play-pause');
        this.btnReset = document.getElementById('btn-reset');
        this.selectTimeScale = document.getElementById('select-time-scale');

        // Visualización y Sonido
        this.chkCutaway = document.getElementById('chk-cutaway');
        this.chkVectors = document.getElementById('chk-vectors');
        this.chkSound = document.getElementById('chk-sound');

        // Botones de cámara
        this.cameraBtns = document.querySelectorAll('.cam-btn');
    }

    bindEvents() {
        const v = this.state.valves;

        // Válvulas táctiles / de clic sostenido o pulsación
        this.setupValveHoldOrToggle(this.btnFwdFlood, 'fwdFlood', 'fwdBlow');
        this.setupValveHoldOrToggle(this.btnFwdBlow, 'fwdBlow', 'fwdFlood');
        this.setupValveHoldOrToggle(this.btnAftFlood, 'aftFlood', 'aftBlow');
        this.setupValveHoldOrToggle(this.btnAftBlow, 'aftBlow', 'aftFlood');

        // Inundar ambos
        if (this.btnAllFlood) {
            this.btnAllFlood.addEventListener('mousedown', () => {
                v.fwdFlood = true;
                v.aftFlood = true;
                v.fwdBlow = false;
                v.aftBlow = false;
                this.updateValveButtonStyles();
            });
            window.addEventListener('mouseup', () => {
                if (this.btnAllFlood.dataset.mode !== 'toggle') {
                    // Modo momentáneo
                }
            });
        }

        // SOPLADO DE EMERGENCIA (EMERGENCY BLOW)
        if (this.btnEmergencyBlow) {
            this.btnEmergencyBlow.addEventListener('click', () => {
                v.emergencyBlow = !v.emergencyBlow;
                if (v.emergencyBlow) {
                    v.fwdFlood = false;
                    v.aftFlood = false;
                    v.fwdBlow = true;
                    v.aftBlow = true;
                    this.state.emit('play-sonar-ping');
                } else {
                    v.fwdBlow = false;
                    v.aftBlow = false;
                }
                this.updateValveButtonStyles();
            });
        }

        // Acelerador de Propulsión (-100% a +100%)
        if (this.sliderThrottle) {
            this.sliderThrottle.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.state.throttle = val;
                if (this.valThrottle) {
                    this.valThrottle.textContent = `${Math.round(val * 100)}%`;
                }
            });
        }

        // Planos de inmersión en la vela (-25° a +25°)
        if (this.sliderPlanes) {
            this.sliderPlanes.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.state.divePlanesAngle = val;
                if (this.valPlanes) {
                    this.valPlanes.textContent = `${val > 0 ? '+' : ''}${val}°`;
                }
            });
        }

        // Densidad ambiental y presets
        if (this.selectDensityPreset) {
            this.selectDensityPreset.addEventListener('change', (e) => {
                const preset = e.target.value;
                let dens = PHYSICS_CONSTANTS.DENSITY_SEAWATER_STD;
                if (preset === 'fresh') dens = PHYSICS_CONSTANTS.DENSITY_FRESHWATER;
                else if (preset === 'sea') dens = PHYSICS_CONSTANTS.DENSITY_SEAWATER_STD;
                else if (preset === 'high') dens = PHYSICS_CONSTANTS.DENSITY_SALINE_HIGH;
                else if (preset === 'dead_sea') dens = PHYSICS_CONSTANTS.DENSITY_DEAD_SEA;

                this.state.waterDensity = dens;
                if (this.sliderDensity) this.sliderDensity.value = dens;
                if (this.sliderDensityVal) this.sliderDensityVal.textContent = `${dens} kg/m³`;
            });
        }

        if (this.sliderDensity) {
            this.sliderDensity.addEventListener('input', (e) => {
                const dens = parseFloat(e.target.value);
                this.state.waterDensity = dens;
                if (this.sliderDensityVal) this.sliderDensityVal.textContent = `${dens} kg/m³`;
                if (this.selectDensityPreset) this.selectDensityPreset.value = 'custom';
            });
        }

        // Multiplicador de compresibilidad del casco (Ley de Hooke)
        if (this.sliderCompressibility) {
            this.sliderCompressibility.addEventListener('input', (e) => {
                const mult = parseFloat(e.target.value);
                this.state.compressibilityMultiplier = mult;
                if (this.sliderCompressibilityVal) this.sliderCompressibilityVal.textContent = `${mult.toFixed(1)}x`;
            });
        }

        // Multiplicador de arrastre hidrodinámico Cd
        if (this.sliderDrag) {
            this.sliderDrag.addEventListener('input', (e) => {
                const mult = parseFloat(e.target.value);
                this.state.dragMultiplier = mult;
                if (this.sliderDragVal) this.sliderDragVal.textContent = `${mult.toFixed(1)}x`;
            });
        }

        // Play / Pause
        if (this.btnPlayPause) {
            this.btnPlayPause.addEventListener('click', () => {
                this.state.isRunning = !this.state.isRunning;
                this.btnPlayPause.textContent = this.state.isRunning ? '⏸ Pausar' : '▶ Reanudar';
                this.btnPlayPause.classList.toggle('paused', !this.state.isRunning);
            });
        }

        // Reset Simulación
        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => {
                this.state.reset();
                if (this.sliderThrottle) this.sliderThrottle.value = 0;
                if (this.valThrottle) this.valThrottle.textContent = '0%';
                if (this.sliderPlanes) this.sliderPlanes.value = 0;
                if (this.valPlanes) this.valPlanes.textContent = '0°';
                this.updateValveButtonStyles();
            });
        }

        // Escala temporal
        if (this.selectTimeScale) {
            this.selectTimeScale.addEventListener('change', (e) => {
                this.state.timeScale = parseFloat(e.target.value);
            });
        }

        // Toggle Casco Translúcido (Cutaway / X-Ray)
        if (this.chkCutaway) {
            this.chkCutaway.checked = this.state.hullCutaway;
            this.chkCutaway.addEventListener('change', (e) => {
                this.submarineModel.setCutawayMode(e.target.checked);
            });
        }

        // Toggle Vectores de Fuerza 3D
        if (this.chkVectors) {
            this.chkVectors.checked = this.state.showForceVectors;
            this.chkVectors.addEventListener('change', (e) => {
                this.state.showForceVectors = e.target.checked;
            });
        }

        // Toggle Sonar Sound
        if (this.chkSound) {
            this.chkSound.checked = this.state.soundEnabled;
            this.chkSound.addEventListener('change', (e) => {
                this.state.soundEnabled = e.target.checked;
                if (e.target.checked) this.state.emit('play-sonar-ping');
            });
        }

        // Modos de cámara
        this.cameraBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.cam;
                this.cameraBtns.forEach(b => b.classList.toggle('active', b === btn));
                if (this.cameraController) {
                    this.cameraController.setMode(mode);
                }
            });
        });

        // Controles de teclado convenientes (Space = Emergency Blow, W/S = Throttle, Up/Down = Planes)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (this.btnEmergencyBlow) this.btnEmergencyBlow.click();
            } else if (e.key === 'r' || e.key === 'R') {
                if (this.btnReset) this.btnReset.click();
            } else if (e.key === 'p' || e.key === 'P') {
                if (this.btnPlayPause) this.btnPlayPause.click();
            }
        });
    }

    /**
     * Vincula un botón de válvula para permitir modo toggle al clic
     */
    setupValveHoldOrToggle(button, targetValve, oppositeValve) {
        if (!button) return;

        button.addEventListener('click', () => {
            const v = this.state.valves;
            v[targetValve] = !v[targetValve];
            if (v[targetValve]) {
                v[oppositeValve] = false; // Exclusión mutua (no se puede inundar y soplar a la vez)
                v.emergencyBlow = false;
            }
            this.updateValveButtonStyles();
        });
    }

    /**
     * Sincroniza clases visuales de los botones de válvulas según el estado actual
     */
    updateValveButtonStyles() {
        const v = this.state.valves;
        if (this.btnFwdFlood) this.btnFwdFlood.classList.toggle('active-flood', v.fwdFlood);
        if (this.btnFwdBlow) this.btnFwdBlow.classList.toggle('active-blow', v.fwdBlow);
        if (this.btnAftFlood) this.btnAftFlood.classList.toggle('active-flood', v.aftFlood);
        if (this.btnAftBlow) this.btnAftBlow.classList.toggle('active-blow', v.aftBlow);

        if (this.btnEmergencyBlow) {
            this.btnEmergencyBlow.classList.toggle('active-emergency', v.emergencyBlow);
        }
    }
}
