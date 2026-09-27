/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * Environment.js - Entorno marino de referencia:
 * Fondo azul petróleo (#1b2631), cuadrícula espacial cian luminiscente,
 * superficie marina traslúcida y atenuación de niebla exponencial.
 */

import * as THREE from 'three';
import { ENVIRONMENT_CONSTANTS, PHYSICS_CONSTANTS } from '../config/constants.js';

export class Environment {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.rootGroup = new THREE.Group();

        this.initAtmosphere();
        this.buildSpatialCyanGrid();
        this.buildOceanSurface();
        this.buildSeabed();

        this.scene.add(this.rootGroup);
    }

    /**
     * Color base azul petróleo (#1b2631) y niebla de profundidad
     */
    initAtmosphere() {
        const baseColor = new THREE.Color(0x1b2631);
        this.scene.background = baseColor;
        this.scene.fog = new THREE.FogExp2(0x1b2631, 0.0055);
    }

    /**
     * Cuadrícula espacial cian luminiscente (Línea base aprobada en la interfaz)
     */
    buildSpatialCyanGrid() {
        // Cuadrícula principal en el plano horizontal de referencia
        const gridSize = 300;
        const gridDivisions = 30;

        // Color central cian brillante, líneas secundarias cian tenue
        this.gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x00f0ff, // Centro cian vibrante
            0x005577  // Líneas de malla sutiles
        );
        this.gridHelper.position.y = 0.0; // Nivel de flotación inicial
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.35;
        this.rootGroup.add(this.gridHelper);

        // Cuadrícula secundaria en el lecho marino
        const bedGrid = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x00a8b5,
            0x0a2233
        );
        bedGrid.position.y = -ENVIRONMENT_CONSTANTS.SEABED_DEPTH;
        bedGrid.material.transparent = true;
        bedGrid.material.opacity = 0.22;
        this.rootGroup.add(bedGrid);
    }

    /**
     * Superficie marina traslúcida con acabado acuático sutil
     */
    buildOceanSurface() {
        const surfaceGeom = new THREE.PlaneGeometry(600, 600, 32, 32);
        surfaceGeom.rotateX(-Math.PI / 2);

        this.surfaceMat = new THREE.MeshPhysicalMaterial({
            color: 0x003344,
            emissive: 0x001122,
            emissiveIntensity: 0.2,
            roughness: 0.1,
            metalness: 0.05,
            transmission: 0.88,
            ior: 1.333,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.surfaceMesh = new THREE.Mesh(surfaceGeom, this.surfaceMat);
        this.surfaceMesh.position.y = ENVIRONMENT_CONSTANTS.SEA_SURFACE_Y;
        this.rootGroup.add(this.surfaceMesh);
    }

    /**
     * Lecho oceánico batimétrico
     */
    buildSeabed() {
        const bedGeom = new THREE.PlaneGeometry(600, 600, 48, 48);
        bedGeom.rotateX(-Math.PI / 2);

        const pos = bedGeom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            const ripple = Math.sin(vx * 0.03) * Math.cos(vz * 0.025) * 4.0;
            pos.setY(i, ripple);
        }
        bedGeom.computeVertexNormals();

        const bedMat = new THREE.MeshStandardMaterial({
            color: 0x0e1720,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true,
        });

        this.seabedMesh = new THREE.Mesh(bedGeom, bedMat);
        this.seabedMesh.position.y = -ENVIRONMENT_CONSTANTS.SEABED_DEPTH;
        this.seabedMesh.receiveShadow = true;
        this.rootGroup.add(this.seabedMesh);
    }

    /**
     * Actualiza la niebla y el color de fondo según la atenuación de Beer-Lambert
     */
    update(cameraY, subY) {
        const depth = Math.max(0, -subY);
        const k = PHYSICS_CONSTANTS.LIGHT_EXTINCTION_K;
        const ratio = Math.exp(-k * depth);

        // De azul petróleo (#1b2631) a abismo oscuro (#050a10)
        const r = Math.max(0.02, 0.106 * ratio);
        const g = Math.max(0.04, 0.149 * ratio);
        const b = Math.max(0.06, 0.192 * ratio);

        if (this.scene.fog) {
            this.scene.fog.color.setRGB(r, g, b);
            this.scene.fog.density = 0.0055 + (depth / 400.0) * 0.0035;
        }

        this.scene.background.setRGB(r, g, b);
    }
}
