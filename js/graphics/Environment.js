/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * Environment.js - Océano dinámico, superficie con cáusticas, lecho marino batimétrico,
 * gradiente de irradiancia Beer-Lambert por profundidad, marcadores de cota y niebla volumétrica.
 */

import * as THREE from 'three';
import { ENVIRONMENT_CONSTANTS, SUBMARINE_CONSTANTS, PHYSICS_CONSTANTS } from '../config/constants.js';

export class Environment {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.rootGroup = new THREE.Group();
        this.depthMarkersGroup = new THREE.Group();

        this.initLighting();
        this.buildOceanSurface();
        this.buildSeabed();
        this.buildBathymetricGridAndMarkers();
        this.buildSunRays();

        this.rootGroup.add(this.depthMarkersGroup);
        this.scene.add(this.rootGroup);

        // Configuración inicial de niebla subacuática
        this.scene.fog = new THREE.FogExp2(0x06283d, 0.0075);
    }

    /**
     * Sistema de iluminación con sol direccional, luz de rebote y luz ambiental
     */
    initLighting() {
        // 1. Luz solar direccional cenital penetrante desde la superficie
        this.sunLight = new THREE.DirectionalLight(0xdff9fb, 2.2);
        this.sunLight.position.set(40, 60, 30);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 250;
        this.sunLight.shadow.camera.left = -60;
        this.sunLight.shadow.camera.right = 60;
        this.sunLight.shadow.camera.top = 60;
        this.sunLight.shadow.camera.bottom = -60;
        this.scene.add(this.sunLight);

        // 2. Luz ambiental atenuada por efecto Beer-Lambert
        this.ambientLight = new THREE.AmbientLight(0x0a3d62, 0.85);
        this.scene.add(this.ambientLight);

        // 3. Luz hemisférica para contraste superficie/profundidad
        this.hemiLight = new THREE.HemisphereLight(0x48dbfb, 0x010b14, 0.6);
        this.hemiLight.position.set(0, 50, 0);
        this.scene.add(this.hemiLight);
    }

    /**
     * Superficie marina reflectiva/refractiva con oleaje dinámico
     */
    buildOceanSurface() {
        const surfaceGeom = new THREE.PlaneGeometry(800, 800, 48, 48);
        surfaceGeom.rotateX(-Math.PI / 2);

        this.surfaceMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x005577,
            emissive: 0x001122,
            roughness: 0.15,
            metalness: 0.1,
            transmission: 0.82,
            ior: 1.333,
            transparent: true,
            opacity: 0.88,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.surfaceMesh = new THREE.Mesh(surfaceGeom, this.surfaceMaterial);
        this.surfaceMesh.position.y = ENVIRONMENT_CONSTANTS.SEA_SURFACE_Y;
        this.rootGroup.add(this.surfaceMesh);

        // Cielo superior sobre el agua
        const skyGeom = new THREE.SphereGeometry(700, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x38ada9, side: THREE.BackSide });
        const skyMesh = new THREE.Mesh(skyGeom, skyMat);
        skyMesh.position.y = 0;
        this.rootGroup.add(skyMesh);
    }

    /**
     * Lecho marino batimétrico (Seabed) con relieve oceánico y sedimento
     */
    buildSeabed() {
        const bedGeom = new THREE.PlaneGeometry(800, 800, 64, 64);
        bedGeom.rotateX(-Math.PI / 2);

        // Deformación del terreno para crear cañones submarinos y ondulaciones
        const pos = bedGeom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            const wave = Math.sin(vx * 0.02) * Math.cos(vz * 0.025) * 6.5
                       + Math.sin(vx * 0.05 + vz * 0.04) * 2.8;
            pos.setY(i, wave);
        }
        bedGeom.computeVertexNormals();

        // Textura procedural de arena y sedimento abisal
        const bedMat = new THREE.MeshStandardMaterial({
            color: 0x1a252f,
            roughness: 0.95,
            metalness: 0.15,
            flatShading: true,
        });

        this.seabedMesh = new THREE.Mesh(bedGeom, bedMat);
        this.seabedMesh.position.y = -ENVIRONMENT_CONSTANTS.SEABED_DEPTH;
        this.seabedMesh.receiveShadow = true;
        this.rootGroup.add(this.seabedMesh);
    }

    /**
     * Marcadores batimétricos visuales de profundidad (0m, 50m, 100m, 200m, 300m, Crush Depth 440m)
     * Proporcionan referencia espacial inmediata de escala
     */
    buildBathymetricGridAndMarkers() {
        const depths = [
            { d: 0, label: '0m - Superficie del Mar' },
            { d: 50, label: '50m - Zona Epipelágica (Fótica)' },
            { d: 100, label: '100m - Zona Termoclina' },
            { d: 200, label: '200m - Límite de Luz Solar (Mesopelágica)' },
            { d: SUBMARINE_CONSTANTS.MAX_OPERATING_DEPTH, label: `280m - Cota Máxima Operativa` },
            { d: SUBMARINE_CONSTANTS.TEST_DEPTH, label: `350m - Profundidad de Prueba` },
            { d: ENVIRONMENT_CONSTANTS.SEABED_DEPTH, label: `380m - Lecho Marino Abisal` },
            { d: SUBMARINE_CONSTANTS.CRUSH_DEPTH, label: `440m - COTA CRÍTICA DE IMPLOSIÓN` },
        ];

        depths.forEach(({ d, label }) => {
            const isCrush = d === SUBMARINE_CONSTANTS.CRUSH_DEPTH;
            const isBed = d === ENVIRONMENT_CONSTANTS.SEABED_DEPTH;

            // Anillos y líneas horizontales de referencia de cota
            const ringGeom = new THREE.RingGeometry(80, 80.8, 48);
            ringGeom.rotateX(Math.PI / 2);

            const color = isCrush ? 0xff2244 : isBed ? 0xe67e22 : 0x00d4ff;
            const ringMat = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: isCrush ? 0.65 : 0.25,
            });

            const ringMesh = new THREE.Mesh(ringGeom, ringMat);
            ringMesh.position.set(0, -d, 0);
            this.depthMarkersGroup.add(ringMesh);

            // Sprite con texto indicador de profundidad
            const labelSprite = this.createDepthMarkerSprite(label, color);
            labelSprite.position.set(45, -d + 3.0, 0);
            this.depthMarkersGroup.add(labelSprite);
        });
    }

    createDepthMarkerSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(7, 13, 24, 0.7)';
        ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 26px "JetBrains Mono", monospace';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(16, 2.5, 1);
        return sprite;
    }

    /**
     * Rayos de sol volumétricos subacuáticos (God Rays)
     */
    buildSunRays() {
        const rayGeom = new THREE.ConeGeometry(35, 60, 16, 1, true);
        rayGeom.rotateX(Math.PI);
        const rayMat = new THREE.MeshBasicMaterial({
            color: 0x88e3ff,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.sunRaysMesh = new THREE.Mesh(rayGeom, rayMat);
        this.sunRaysMesh.position.set(10, -25, 0);
        this.rootGroup.add(this.sunRaysMesh);
    }

    /**
     * Actualiza el gradiente lumínico según la Ley de Beer-Lambert:
     * I(h) = I0 * exp(-k * h)
     * y modula la niebla, color de fondo y atenuación solar
     * @param {number} cameraY - Cota vertical de la cámara
     * @param {number} subY - Cota vertical del submarino
     */
    update(cameraY, subY) {
        const depth = Math.max(0, -subY);
        const camDepth = Math.max(0, -cameraY);

        // 1. Atenuación exponencial de Beer-Lambert
        const k = PHYSICS_CONSTANTS.LIGHT_EXTINCTION_K;
        const irradianceRatio = Math.exp(-k * depth);

        // Ajustar intensidad solar
        this.sunLight.intensity = Math.max(0.01, 2.4 * irradianceRatio);
        this.hemiLight.intensity = Math.max(0.02, 0.65 * irradianceRatio);
        this.ambientLight.intensity = Math.max(0.03, 0.85 * irradianceRatio);

        // Ocultar rayos de sol si estamos a más de 80m de profundidad
        if (this.sunRaysMesh) {
            this.sunRaysMesh.material.opacity = Math.max(0.0, 0.08 * Math.exp(-k * 2.2 * camDepth));
        }

        // 2. Transición cromática de la niebla y fondo marino según profundidad
        // De azul turquesa claro en superficie a azul marino profundo y negro abisal
        const r = Math.max(0.004, 0.04 * irradianceRatio);
        const g = Math.max(0.012, 0.20 * irradianceRatio);
        const b = Math.max(0.025, 0.38 * irradianceRatio);

        if (this.scene.fog) {
            this.scene.fog.color.setRGB(r, g, b);
            // Niebla se hace más densa en la profundidad
            this.scene.fog.density = 0.0075 + (depth / 400.0) * 0.0045;
        }

        this.scene.background = new THREE.Color(r, g, b);
    }
}
