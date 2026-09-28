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
     * Color base azul naval profundo (#0c1e33) y niebla marina homogénea
     */
    initAtmosphere() {
        const baseColor = new THREE.Color(0x0c1e33);
        this.scene.background = baseColor;
        this.scene.fog = new THREE.FogExp2(0x0a1827, 0.005);
    }

    /**
     * Cuadrícula espacial cian luminiscente / suelo de pruebas de ingeniería
     */
    buildSpatialCyanGrid() {
        // Cuadrícula principal situada bajo la quilla para no cortar transversalmente el casco acrílico
        const gridSize = 160;
        const gridDivisions = 32;

        this.gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x38bdf8, // Línea central cian suave
            0x1e3a5f  // Retícula estructural naval
        );
        this.gridHelper.position.y = -2.6; // Justo bajo la quilla en flotación
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.38;
        this.rootGroup.add(this.gridHelper);

        // Cuadrícula secundaria en el fondo marino
        const bedGrid = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x008899,
            0x061824
        );
        bedGrid.position.y = -ENVIRONMENT_CONSTANTS.SEABED_DEPTH;
        bedGrid.material.transparent = true;
        bedGrid.material.opacity = 0.20;
        this.rootGroup.add(bedGrid);
    }

    /**
     * Superficie marina traslúcida con acabado acuático brillante
     */
    buildOceanSurface() {
        const surfaceGeom = new THREE.PlaneGeometry(1200, 1200);
        surfaceGeom.rotateX(-Math.PI / 2);

        this.surfaceMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.10,
            side: THREE.DoubleSide,
            roughness: 0.1,
            metalness: 0.1,
        });

        this.surfaceMesh = new THREE.Mesh(surfaceGeom, this.surfaceMat);
        this.surfaceMesh.position.y = 0.0;
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
        const k = 0.022;
        const ratio = Math.exp(-k * depth);

        // De azul petróleo (#1b2631) a abismo oscuro (#050a10)
        const r = Math.max(0.015, 0.106 * ratio);
        const g = Math.max(0.035, 0.149 * ratio);
        const b = Math.max(0.055, 0.192 * ratio);

        if (this.scene.fog) {
            this.scene.fog.color.setRGB(r, g, b);
            this.scene.fog.density = 0.0055 + (depth / 50.0) * 0.008;
        }

        this.scene.background.setRGB(r, g, b);
    }
}
