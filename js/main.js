/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * main.js - Ciclo de vida principal, render loop de Three.js, controlador de cámaras y orquestación
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { state } from './core/State.js';
import { PhysicsEngine } from './core/PhysicsEngine.js';
import { SubmarineModel } from './graphics/SubmarineModel.js';
import { Environment } from './graphics/Environment.js';
import { ParticleSystems } from './graphics/ParticleSystems.js';
import { TelemetryDashboard } from './ui/TelemetryDashboard.js';
import { MathPanel } from './ui/MathPanel.js';
import { Controls } from './ui/Controls.js';

class SubmarineSimulatorApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        this.initThree();
        this.initModules();
        this.initCameraController();
        this.initEvents();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /**
     * Configuración del motor gráfico Three.js (WebGLRenderer con PBR y Tone Mapping)
     */
    initThree() {
        // Escena
        this.scene = new THREE.Scene();

        // Cámara de perspectiva
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 2000);
        this.camera.position.set(-25, 6, 32);

        // Renderizador WebGL de alta fidelidad
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

        this.container.appendChild(this.renderer.domElement);

        // Controles de órbita base
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.06;
        this.orbitControls.maxDistance = 500;
        this.orbitControls.minDistance = 6;
    }

    /**
     * Instanciación de subsistemas desacoplados
     */
    initModules() {
        this.physicsEngine = new PhysicsEngine(state);
        this.environment = new Environment(this.scene, state);
        this.submarineModel = new SubmarineModel(this.scene, state);
        this.particleSystems = new ParticleSystems(this.scene, state);
        this.telemetryDashboard = new TelemetryDashboard(state);
        this.mathPanel = new MathPanel(state);
    }

    /**
     * Controlador de cámaras con múltiples modos dinámicos
     */
    initCameraController() {
        this.camMode = 'chase'; // 'chase', 'orbit', 'cutaway', 'sonar'

        this.cameraController = {
            setMode: (mode) => {
                this.camMode = mode;
                state.viewMode = mode;
                if (mode === 'orbit') {
                    this.orbitControls.enabled = true;
                    this.orbitControls.target.set(state.x, state.y, 0);
                } else {
                    this.orbitControls.enabled = false;
                }
            }
        };

        // Instanciar controles de UI
        this.controls = new Controls(state, this.submarineModel, this.cameraController);
    }

    /**
     * Gestión de redimensionamiento de ventana
     */
    initEvents() {
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
     * Actualiza la posición y orientación de la cámara según el modo seleccionado
     */
    updateCamera(dt) {
        const subX = state.x;
        const subY = state.y;

        if (this.camMode === 'chase') {
            // Cámara de seguimiento suave en 3ra persona con anticipación
            const targetCamPos = new THREE.Vector3(subX - 28, subY + 6.5, 26);
            this.camera.position.lerp(targetCamPos, dt * 3.5);
            this.camera.lookAt(subX + 4, subY, 0);
        } else if (this.camMode === 'cutaway') {
            // Primer plano transversal lateral centrado en los tanques de lastre
            const targetCamPos = new THREE.Vector3(subX, subY + 0.5, 14);
            this.camera.position.lerp(targetCamPos, dt * 4.0);
            this.camera.lookAt(subX, subY, 0);
        } else if (this.camMode === 'sonar') {
            // Vista cenital táctica batimétrica (Top-Down)
            const targetCamPos = new THREE.Vector3(subX, subY + 70, 0);
            this.camera.position.lerp(targetCamPos, dt * 3.0);
            this.camera.lookAt(subX, subY, 0);
        } else if (this.camMode === 'orbit') {
            this.orbitControls.target.set(subX, subY, 0);
            this.orbitControls.update();
        }
    }

    /**
     * Render Loop principal sincronizado con requestAnimationFrame
     */
    animate() {
        requestAnimationFrame(this.animate);

        const dt = this.clock.getDelta();

        // 1. Integración numérica de la física (RK4 con sub-stepping)
        this.physicsEngine.step(dt);

        // 2. Actualización de modelos gráficos, fluidos y cinemática
        this.submarineModel.update(dt);
        this.environment.update(this.camera.position.y, state.y);
        this.particleSystems.update(dt);

        // 3. Telemetría y módulo pedagógico
        this.telemetryDashboard.update();
        this.mathPanel.update();

        // 4. Controlador de cámara
        this.updateCamera(dt);

        // 5. Renderizado final de escena
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
        console.log("Iniciando SubmarineSimulatorApp...");
        window.__subApp = new SubmarineSimulatorApp();
        console.log("SubmarineSimulatorApp inicializado exitosamente.");
    } catch (err) {
        console.error("Error al inicializar SubmarineSimulatorApp:", err);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(12,20,32,0.96);border:2px solid #ff3366;color:#ffffff;padding:28px;border-radius:12px;font-family:monospace;z-index:99999;max-width:85%;box-shadow:0 0 40px rgba(255,51,102,0.5);';
        errDiv.innerHTML = `<h3 style="color:#ff3366;margin-bottom:12px;font-size:18px;">⚠️ Error de Inicialización Gráfica</h3><p style="color:#94a3b8;margin-bottom:12px;font-size:13px;">Se ha producido un error al cargar el simulador WebGL:</p><pre style="background:#070d18;padding:12px;border-radius:6px;color:#ff88aa;font-size:12px;overflow:auto;max-height:200px;">${err.stack || err.message || err}</pre><p style="margin-top:14px;font-size:12px;color:#00f0ff;">Por favor asegúrate de abrir el simulador mediante un servidor web (http://localhost:...) y con WebGL habilitado en tu navegador.</p>`;
        document.body.appendChild(errDiv);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
