/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * main.js - Orquestador maestro del ciclo de vida, render loop de Three.js,
 * OrbitControls fluido sin bloqueos y controlador de iluminación dual interactiva.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { state } from './core/State.js';
import { SUBMARINE_CONSTANTS } from './config/constants.js';
import { PhysicsEngine } from './core/PhysicsEngine.js';
import { SubmarineModel } from './graphics/SubmarineModel.js';
import { LightingSystem } from './graphics/LightingSystem.js';
import { Environment } from './graphics/Environment.js';
import { ParticleEffects } from './graphics/ParticleEffects.js';
import { HUD } from './ui/HUD.js';
import { MathModal } from './ui/MathModal.js';

class SubmarineApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        this.initThree();
        this.initModules();
        this.initCameraController();
        this.initUserInteractions();
        this.applyUrlParameters();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /**
     * Motor Gráfico Three.js con WebGL, sombras y mapeo tonal ACESFilmic
     */
    initThree() {
        this.scene = new THREE.Scene();

        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 2000);
        // Posición isométrica 3/4 con proa a la izquierda y popa a la derecha (idéntico a la referencia técnica UTP)
        this.camera.position.set(18.5, 5.2, 4.2);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.localClippingEnabled = true;

        this.container.appendChild(this.renderer.domElement);

        // OrbitControls con manipulación 3D absoluta y suave amortiguación inercial
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5.0;   // Aproximación cercana
        this.controls.maxDistance = 250.0; // Visión lejana
        this.controls.screenSpacePanning = true; // Paneo libre con clic derecho
        this.controls.target.set(0, 0, 0);
    }

    /**
     * Instancia de todos los módulos del sistema
     */
    initModules() {
        this.physicsEngine = new PhysicsEngine(state);
        this.environment = new Environment(this.scene, state);
        this.lightingSystem = new LightingSystem(this.scene, state);
        this.submarineModel = new SubmarineModel(this.scene, state);
        this.particleEffects = new ParticleEffects(this.scene, state);
        this.mathModal = new MathModal(state);

        this.hud = new HUD(
            state,
            this.submarineModel,
            this.lightingSystem,
            this.cameraController,
            () => this.mathModal.toggle()
        );

        // Escuchar evento de implosión para disparar efectos de choque y ráfaga de burbujas
        state.on('implosion', (data) => {
            if (this.particleEffects) {
                this.particleEffects.triggerImplosionBurst(state.x, state.y, 0);
            }
            if (this.submarineModel) {
                this.submarineModel.triggerImplosionEffect();
            }
        });
    }

    /**
     * Presets cinematográficos de cámara para alternar vistas técnicas
     */
    initCameraController() {
        this.cameraController = {
            setPreset: (preset) => {
                const subY = state.y;

                if (preset === 'side') {
                    // Vista lateral técnica de perfil (Proa a la izquierda, Popa a la derecha)
                    this.targetCamPos = new THREE.Vector3(22.0, subY + 0.4, 0);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'iso') {
                    // Vista isométrica 3/4 de referencia exacta
                    this.targetCamPos = new THREE.Vector3(18.5, subY + 5.2, 4.2);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'tanks') {
                    // Vista cercana perpendicular enfocando ambos tanques y sala central
                    this.targetCamPos = new THREE.Vector3(13.0, subY + 0.4, 0);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'top') {
                    // Vista superior dorsal (planta)
                    this.targetCamPos = new THREE.Vector3(0.01, subY + 22.0, 0.01);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'front') {
                    // Vista frontal de proa (cúpula hemisférica)
                    this.targetCamPos = new THREE.Vector3(0, subY + 0.4, 18.0);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'stern') {
                    // Vista trasera de popa (hélice y timones)
                    this.targetCamPos = new THREE.Vector3(0, subY + 0.4, -18.0);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'interior') {
                    // Vista cercana interior de tanques y mamparos a través del portal
                    this.targetCamPos = new THREE.Vector3(5.5, subY + 0.5, 0.5);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'bottom') {
                    // Vista inferior ventral directa (quilla, válvulas Kingston)
                    this.targetCamPos = new THREE.Vector3(0.01, subY - 18.0, 0.01);
                    this.controls.target.set(0, subY, 0);
                } else if (preset === 'bottom_iso') {
                    // Vista isométrica inferior 3/4 desde abajo
                    this.targetCamPos = new THREE.Vector3(16.0, subY - 10.0, 4.0);
                    this.controls.target.set(0, subY, 0);
                }
            }
        };

        // Asignar controlador a la UI
        this.hud.cameraController = this.cameraController;
    }

    /**
     * Interacciones de usuario y foco dirigible con Raycaster
     */
    initUserInteractions() {
        // Movimiento de linterna móvil con el ratón
        window.addEventListener('mousemove', (e) => {
            this.lightingSystem.onMouseMove(e, this.camera, this.submarineModel.rootGroup);
        });

        // Redimensionamiento responsive
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    /**
     * Parámetros de consulta en URL para pruebas de laboratorio y verificación visual
     */
    applyUrlParameters() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('ballast')) {
                const pct = parseFloat(params.get('ballast'));
                const fwdMax = SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_FWD;
                const aftMax = SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_AFT;
                state.fwdBallastVolume = fwdMax * (pct / 100.0);
                state.aftBallastVolume = aftMax * (pct / 100.0);
                state.updateDerivedValues();

                const slider = document.getElementById('slider-ballast');
                const readout = document.getElementById('val-ballast-pct');
                if (slider) slider.value = pct;
                if (readout) readout.textContent = `${pct}%`;
            }

            if (params.has('y')) {
                state.y = parseFloat(params.get('y'));
                state.updateDerivedValues();
            }

            if (params.has('blow')) {
                state.valves.emergencyBlow = true;
                state.isBlowing = true;
                state.blowingTimer = 8.0;
            }

            if (params.has('imploded')) {
                state.isImploded = true;
                state.structuralIntegrity = 0;
                if (!params.has('y')) {
                    state.y = -26.0;
                }
                state.updateDerivedValues();
                state.emit('implosion', { depth: Math.max(0, -state.y), pressure: state.hydrostaticPressure });
            }

            if (params.has('camX')) {
                const cx = parseFloat(params.get('camX'));
                const cy = parseFloat(params.get('camY') ?? (state.y + 1));
                const cz = parseFloat(params.get('camZ') ?? 0);
                this.camera.position.set(cx, cy, cz);
                this.controls.target.set(0, state.y, 0);
                this.targetCamPos = null;
            } else if (params.has('camera') && this.cameraController) {
                this.cameraController.setPreset(params.get('camera'));
                if (this.targetCamPos) {
                    this.camera.position.copy(this.targetCamPos);
                    this.targetCamPos = null;
                }
            }
        } catch (err) {
            console.warn("No se pudieron aplicar parámetros de URL:", err);
        }
    }

    /**
     * Loop principal de renderizado a 60 FPS
     */
    animate() {
        requestAnimationFrame(this.animate);

        const dt = this.clock.getDelta();

        // 1. Integración numérica RK4 de la física
        this.physicsEngine.step(dt);

        // 2. Actualización de modelos gráficos, fluidos y partículas
        this.submarineModel.update(dt);
        this.environment.update(this.camera.position.y, state.y);
        this.lightingSystem.update(this.camera, state.x, state.y);
        this.particleEffects.update(dt);

        // 3. Telemetría y modal de EDOs
        this.hud.update();
        this.mathModal.update();

        // 4. Suavizado inercial de la cámara hacia preset o seguimiento vertical
        if (this.targetCamPos) {
            this.camera.position.lerp(this.targetCamPos, 0.08);
            if (this.camera.position.distanceTo(this.targetCamPos) < 0.2) {
                this.targetCamPos = null;
            }
        } else {
            // Seguir verticalmente al submarino manteniendo el encuadre relativo constante
            const deltaY = state.y - this.controls.target.y;
            this.controls.target.y += deltaY * 0.15;
            this.camera.position.y += deltaY * 0.15;
        }

        this.controls.update();

        // 5. Renderizado final
        this.renderer.render(this.scene, this.camera);
    }
}

// Polyfill de seguridad para CanvasRenderingContext2D.roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
        this.rect(x, y, w, h);
        return this;
    };
}

function initApp() {
    try {
        console.log("Iniciando Laboratorio Virtual de Dinámica Submarina...");
        window.__subApp = new SubmarineApp();
        console.log("Laboratorio activo exitosamente.");
    } catch (err) {
        console.error("Error al inicializar la aplicación:", err);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(12,20,32,0.96);border:2px solid #ff3366;color:#ffffff;padding:28px;border-radius:12px;font-family:monospace;z-index:99999;max-width:85%;box-shadow:0 0 40px rgba(255,51,102,0.5);';
        errDiv.innerHTML = `<h3 style="color:#ff3366;margin-bottom:12px;font-size:18px;">⚠️ Error de Inicialización</h3><pre style="background:#070d18;padding:12px;border-radius:6px;color:#ff88aa;font-size:12px;overflow:auto;max-height:200px;">${err.stack || err.message || err}</pre>`;
        document.body.appendChild(errDiv);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
