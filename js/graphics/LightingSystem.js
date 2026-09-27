/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * LightingSystem.js - Sistema de Iluminación Dual:
 * 1. Iluminación Base Marina (Luz ambiental neutra, hemisferio naval, sol superficial, niebla de Beer-Lambert)
 * 2. Linterna Táctica Dirigible (SpotLight interactivo guiado por Raycaster con puntero de ratón)
 */

import * as THREE from 'three';
import { PHYSICS_CONSTANTS } from '../config/constants.js';

export class LightingSystem {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.flashlightActive = true;
        this.flashlightIntensity = 2.4;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.targetIntersection = new THREE.Vector3(0, 0, 0);

        this.initBaseLighting();
        this.initTacticalFlashlight();
        this.initSubmarineHeadlights();
    }

    /**
     * 1. Iluminación Base de Escena (Ambiente Naval Equilibrado)
     */
    initBaseLighting() {
        // Luz ambiental suave para visibilidad global sin aplanar sombras
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(this.ambientLight);

        // Luz hemisférica con gradiente marino (cielo azul naval profundo #335577, fondo abisal #050a10)
        this.hemiLight = new THREE.HemisphereLight(0x335577, 0x050a10, 0.65);
        this.hemiLight.position.set(0, 80, 0);
        this.scene.add(this.hemiLight);

        // Luz direccional cenital (Sol en superficie que refracta a través del agua)
        this.sunLight = new THREE.DirectionalLight(0xa8e6ff, 1.2);
        this.sunLight.position.set(25, 70, 35);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 300;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);
    }

    /**
     * 2. Linterna Táctica Dirigible del Observador (SpotLight móvil vía Raycaster)
     */
    initTacticalFlashlight() {
        this.flashlight = new THREE.SpotLight(0xffffff, this.flashlightIntensity);
        this.flashlight.angle = Math.PI / 7.0; // Apertura cónica ~25 grados
        this.flashlight.penumbra = 0.4;        // Borde difuso
        this.flashlight.decay = 2.0;           // Atenuación cuadrática física
        this.flashlight.distance = 250;
        this.flashlight.castShadow = false;

        this.flashlightTarget = new THREE.Object3D();
        this.scene.add(this.flashlightTarget);
        this.flashlight.target = this.flashlightTarget;

        this.scene.add(this.flashlight);

        // Plano matemático invisible para proyectar el raycast si el cursor no golpea el submarino
        this.referencePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    }

    /**
     * Focos frontales exploratorios de la proa del submarino
     */
    initSubmarineHeadlights() {
        this.bowLight = new THREE.SpotLight(0x00f0ff, 2.0);
        this.bowLight.angle = Math.PI / 6.0;
        this.bowLight.penumbra = 0.45;
        this.bowLight.distance = 120;
        this.bowLight.decay = 1.8;

        this.bowLightTarget = new THREE.Object3D();
        this.scene.add(this.bowLightTarget);
        this.bowLight.target = this.bowLightTarget;

        this.scene.add(this.bowLight);
    }

    /**
     * Actualiza la orientación del foco dirigible según el cursor del ratón
     * @param {MouseEvent} event 
     * @param {THREE.Camera} camera 
     * @param {THREE.Object3D} targetObject 
     */
    onMouseMove(event, camera, targetObject) {
        if (!this.flashlightActive) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);

        // Intentar intersectar con la malla del submarino para inspección de piezas puntuales
        let hitPoint = null;
        if (targetObject) {
            const intersects = this.raycaster.intersectObject(targetObject, true);
            if (intersects.length > 0) {
                hitPoint = intersects[0].point;
            }
        }

        // Si no golpea la malla, proyectar sobre el plano central Z=0
        if (!hitPoint) {
            hitPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.referencePlane, hitPoint);
        }

        if (hitPoint) {
            this.targetIntersection.copy(hitPoint);
        }
    }

    /**
     * Activa o desactiva la linterna móvil
     * @param {boolean} enabled 
     */
    setFlashlightEnabled(enabled) {
        this.flashlightActive = enabled;
        this.flashlight.visible = enabled;
    }

    /**
     * Modifica la intensidad de la linterna táctica
     * @param {number} val - [0.0 a 4.0]
     */
    setFlashlightIntensity(val) {
        this.flashlightIntensity = val;
        this.flashlight.intensity = val;
    }

    /**
     * Actualización por frame: suavizado del haz de luz y atenuación Beer-Lambert
     */
    update(camera, subX, subY) {
        const depth = Math.max(0, -subY);

        // 1. Posicionar linterna junto a la cámara del usuario (estilo lámpara frontal de inspección)
        if (this.flashlightActive) {
            this.flashlight.position.copy(camera.position);
            // Suavizado lerp del blanco del raycast
            this.flashlightTarget.position.lerp(this.targetIntersection, 0.18);
        }

        // 2. Foco frontal del submarino
        this.bowLight.position.set(subX + 18.0, subY + 0.2, 0);
        this.bowLightTarget.position.set(subX + 50.0, subY - 4.0, 0);

        // 3. Atenuación lumínica exponencial de Beer-Lambert
        // I(h) = I0 * exp(-k * h)
        const k = PHYSICS_CONSTANTS.LIGHT_EXTINCTION_K;
        const ratio = Math.exp(-k * depth);

        this.ambientLight.intensity = Math.max(0.12, 0.45 * ratio);
        this.hemiLight.intensity = Math.max(0.15, 0.65 * ratio);
        this.sunLight.intensity = Math.max(0.02, 1.2 * ratio);
    }
}
