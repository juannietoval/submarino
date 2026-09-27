/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * SubmarineModel.js - Modelo 3D con Casco Acrílico Óptico Ultratransparente
 * Inspirado en sumergibles de investigación profunda (Triton / U-Boat Worx) y
 * diagramas técnicos navales de tanques de lastre (Main Ballast Tanks - MBT).
 * 
 * Implementa renderizado óptico de doble capa (BackSide + FrontSide) para
 * garantizar transparencia física impecable sin artefactos de oclusión en 360°.
 */

import * as THREE from 'three';
import { SUBMARINE_CONSTANTS } from '../config/constants.js';

export class SubmarineModel {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.rootGroup = new THREE.Group();
        this.acrylicHullGroup = new THREE.Group();
        this.interiorFrameworkGroup = new THREE.Group();
        this.ballastSystemGroup = new THREE.Group();
        this.propulsionGroup = new THREE.Group();
        this.sailGroup = new THREE.Group();
        this.vectorsGroup = new THREE.Group();

        // Mallas de agua y tanques
        this.fwdWaterMesh = null;
        this.aftWaterMesh = null;
        this.fwdAirPocketMesh = null;
        this.aftAirPocketMesh = null;
        this.propellerBladesGroup = new THREE.Group();
        this.fairwaterPlanesGroup = new THREE.Group();

        this.initPBRMaterials();
        this.buildFullOpticalAcrylicHull();
        this.buildStructuralSkeletonAndBulkheads();
        this.buildBallastSystemWithKingstonValvesAndPiping();
        this.buildCentralCommandPod();
        this.buildSailAndFairwaterPlanes();
        this.buildXRuddersAndPropulsionShaft();
        this.buildForceVectors();

        // Orden de ensamblado
        this.rootGroup.add(this.interiorFrameworkGroup);
        this.rootGroup.add(this.ballastSystemGroup);
        this.rootGroup.add(this.propulsionGroup);
        this.rootGroup.add(this.sailGroup);
        this.rootGroup.add(this.acrylicHullGroup);
        this.rootGroup.add(this.vectorsGroup);

        this.scene.add(this.rootGroup);
    }

    /**
     * Materiales PBR calibrados ópticamente (PMMA Acrílico, Latón, Titanio, Agua Marina)
     */
    initPBRMaterials() {
        // 1. Acrílico Óptico Ultratransparente (Cara Trasera - renderOrder: 3)
        this.acrylicMatBack = new THREE.MeshPhysicalMaterial({
            color: 0xd8f4ff,
            metalness: 0.02,
            roughness: 0.08,
            transmission: 0.95, // Transmisión física de luz
            ior: 1.491,         // Índice de refracción del Acrílico PMMA de alta presión
            thickness: 2.2,     // Espesor para cálculo de dispersión
            specularIntensity: 1.0,
            specularColor: 0xffffff,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            attenuationColor: 0x80e5ff,
            attenuationDistance: 5.5,
            transparent: true,
            opacity: 0.92,
            side: THREE.BackSide,
            depthWrite: false,
        });

        // 2. Acrílico Óptico Ultratransparente (Cara Delantera - renderOrder: 4)
        this.acrylicMatFront = new THREE.MeshPhysicalMaterial({
            color: 0xe6f8ff,
            metalness: 0.02,
            roughness: 0.05,
            transmission: 0.96,
            ior: 1.491,
            thickness: 2.2,
            specularIntensity: 1.0,
            specularColor: 0xffffff,
            clearcoat: 1.0,
            clearcoatRoughness: 0.03,
            attenuationColor: 0x80e5ff,
            attenuationDistance: 5.5,
            transparent: true,
            opacity: 0.94,
            side: THREE.FrontSide,
            depthWrite: false,
        });

        // 3. Estructura de Titanio y Quilla de Lastre Fijo (renderOrder: 0, depthWrite: true)
        this.titaniumMat = new THREE.MeshStandardMaterial({
            color: 0x243242,
            metalness: 0.92,
            roughness: 0.28,
        });

        this.ribMat = new THREE.MeshStandardMaterial({
            color: 0x16222f,
            metalness: 0.95,
            roughness: 0.22,
        });

        // 4. Tuberías de Aire de Alta Presión y Manifolds (Latón / Oro Naval)
        this.brassPipingMat = new THREE.MeshStandardMaterial({
            color: 0xdaa520,
            metalness: 0.94,
            roughness: 0.22,
        });

        // 5. Botellones de Aire Comprimido a 200 bar (Acero Cromado)
        this.chromeFlaskMat = new THREE.MeshStandardMaterial({
            color: 0x90a4ae,
            metalness: 0.98,
            roughness: 0.15,
        });

        // 6. Fluido de Lastre Interno (Agua Marina Luminosa con Menisco - renderOrder: 1)
        this.ballastWaterMat = new THREE.MeshPhysicalMaterial({
            color: 0x00f0ff,
            emissive: 0x004466,
            emissiveIntensity: 0.45,
            metalness: 0.05,
            roughness: 0.12,
            transmission: 0.72,
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        // 7. Envolvente Cilíndrica de los Tanques MBT (Acrílico Interno)
        this.tankCasingMat = new THREE.MeshPhysicalMaterial({
            color: 0x66ccff,
            metalness: 0.05,
            roughness: 0.15,
            transmission: 0.88,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        });

        // 8. Bronce Naval de la Hélice de 7 Palas
        this.propellerBronzeMat = new THREE.MeshStandardMaterial({
            color: 0xc69642,
            metalness: 0.92,
            roughness: 0.24,
        });
    }

    /**
     * Construye el Casco Albacore Completo en Acrílico Óptico Ultratransparente
     * Utiliza técnica de renderizado en dos pasadas (BackSide + FrontSide)
     * para asegurar visualización perfecta en 360° sin artefactos de oclusión.
     */
    buildFullOpticalAcrylicHull() {
        const length = SUBMARINE_CONSTANTS.HULL_LENGTH;       // 42m
        const maxRadius = SUBMARINE_CONSTANTS.HULL_DIAMETER / 2.0; // 2.8m

        const numSteps = 48;
        const profilePoints = [];

        for (let i = 0; i <= numSteps; i++) {
            const u = i / numSteps; // 0 en popa (-21m), 1 en proa (+21m)
            const x = -length / 2.0 + u * length;
            let r = 0;

            if (u >= 0.72) {
                // Domo de proa esferoidal elíptico continuo (Acoustic Sonar Dome)
                const bowU = (u - 0.72) / 0.28;
                r = maxRadius * Math.sqrt(Math.max(0, 1.0 - Math.pow(1.0 - bowU, 2)));
            } else if (u >= 0.32) {
                // Cuerpo cilíndrico medio
                r = maxRadius;
            } else {
                // Popa ahusada estilizada de transición a la hélice
                const sternU = u / 0.32;
                r = 0.68 + (maxRadius - 0.68) * Math.pow(sternU, 1.35);
            }

            profilePoints.push(new THREE.Vector2(r, x));
        }

        const hullGeom = new THREE.LatheGeometry(profilePoints, 48);
        hullGeom.rotateZ(-Math.PI / 2); // Alinear longitudinalmente en X

        // Pasada 1: Caras internas posteriores (BackSide)
        const backMesh = new THREE.Mesh(hullGeom, this.acrylicMatBack);
        backMesh.renderOrder = 3;
        this.acrylicHullGroup.add(backMesh);

        // Pasada 2: Caras externas frontales (FrontSide)
        const frontMesh = new THREE.Mesh(hullGeom, this.acrylicMatFront);
        frontMesh.renderOrder = 4;
        this.acrylicHullGroup.add(frontMesh);

        this.acrylicHullMesh = frontMesh;
    }

    /**
     * Esqueleto Estructural Interno: Quilla naval pesada, 14 anillos de cuaderna
     * y mamparos transversales estancos visibles a través del acrílico.
     */
    buildStructuralSkeletonAndBulkheads() {
        const radius = SUBMARINE_CONSTANTS.HULL_DIAMETER / 2.0;

        // 1. Quilla estructural longitudinal inferior (Keel Beam)
        const keelGeom = new THREE.BoxGeometry(36.0, 0.45, 0.65);
        const keelMesh = new THREE.Mesh(keelGeom, this.titaniumMat);
        keelMesh.position.set(0, -radius + 0.3, 0);
        keelMesh.renderOrder = 0;
        this.interiorFrameworkGroup.add(keelMesh);

        // 2. Columna dorsal superior (Spine Tube) para canalización de cables y tuberías
        const spineGeom = new THREE.CylinderGeometry(0.18, 0.18, 36.0, 16);
        spineGeom.rotateZ(Math.PI / 2);
        const spineMesh = new THREE.Mesh(spineGeom, this.titaniumMat);
        spineMesh.position.set(0, radius - 0.25, 0);
        spineMesh.renderOrder = 0;
        this.interiorFrameworkGroup.add(spineMesh);

        // 3. Anillos de refuerzo estructural (Cuadernas circulares) a lo largo de la eslora
        const ringPositions = [-18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18];
        ringPositions.forEach(xPos => {
            // Calcular radio local del casco en esa cota x
            const u = (xPos + 21.0) / 42.0;
            let localR = radius;
            if (u > 0.72) {
                const bU = (u - 0.72) / 0.28;
                localR = radius * Math.sqrt(Math.max(0, 1.0 - Math.pow(1.0 - bU, 2)));
            } else if (u < 0.32) {
                const sU = u / 0.32;
                localR = 0.68 + (radius - 0.68) * Math.pow(sU, 1.35);
            }

            const ringGeom = new THREE.TorusGeometry(Math.max(0.6, localR - 0.12), 0.09, 10, 32);
            ringGeom.rotateY(Math.PI / 2);
            const ringMesh = new THREE.Mesh(ringGeom, this.ribMat);
            ringMesh.position.x = xPos;
            ringMesh.renderOrder = 0;
            this.interiorFrameworkGroup.add(ringMesh);
        });

        // 4. Mamparos Transversales Estancos (Bulkheads)
        const bulkheadPositions = [-10.5, -2.5, 2.5, 10.5];
        bulkheadPositions.forEach(xPos => {
            const bhGeom = new THREE.CylinderGeometry(radius - 0.2, radius - 0.2, 0.25, 24);
            bhGeom.rotateZ(Math.PI / 2);
            const bhMesh = new THREE.Mesh(bhGeom, this.titaniumMat);
            bhMesh.position.x = xPos;
            bhMesh.renderOrder = 0;
            this.interiorFrameworkGroup.add(bhMesh);

            // Escotilla estanca central
            const hatchGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.35, 16);
            hatchGeom.rotateZ(Math.PI / 2);
            const hatchMesh = new THREE.Mesh(hatchGeom, this.brassPipingMat);
            hatchMesh.position.x = xPos;
            hatchMesh.renderOrder = 0;
            this.interiorFrameworkGroup.add(hatchMesh);
        });
    }

    /**
     * Sistema de Lastre Completo (Main Ballast Tanks - MBT):
     * Modelado según los esquemas técnicos navales con:
     * - Tanques proa y popa (FWD/AFT MBT) con visualización bifásica (agua/aire).
     * - Válvulas de venteo superiores (Vent Valves) en la corona de los tanques.
     * - Rejillas Kingston inferiores de inundación en la quilla.
     * - Tuberías de soplado de aire de alta presión (HP Blow lines a 200 bar).
     * - Bancos de botellones de aire comprimido (HP Air Flasks).
     */
    buildBallastSystemWithKingstonValvesAndPiping() {
        const tankLength = 6.8;
        const tankRadius = 2.3;

        // ==========================================
        // 1. TANQUE DE PROA (FORWARD MBT) en x: +6.5m
        // ==========================================
        const fwdGroup = new THREE.Group();
        fwdGroup.position.set(6.5, 0, 0);

        // Carcasa cilíndrica del tanque
        const casingGeom = new THREE.CylinderGeometry(tankRadius, tankRadius, tankLength, 24, 1, true);
        casingGeom.rotateZ(Math.PI / 2);
        const fwdCasing = new THREE.Mesh(casingGeom, this.tankCasingMat);
        fwdCasing.renderOrder = 2;
        fwdGroup.add(fwdCasing);

        // Cilindro de agua animable interior
        const waterGeom = new THREE.CylinderGeometry(tankRadius * 0.94, tankRadius * 0.94, tankLength * 0.96, 24);
        waterGeom.rotateZ(Math.PI / 2);
        this.fwdWaterMesh = new THREE.Mesh(waterGeom, this.ballastWaterMat);
        this.fwdWaterMesh.renderOrder = 1;
        fwdGroup.add(this.fwdWaterMesh);

        // Válvulas de venteo superiores (Vent Valves)
        const ventGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12);
        const vent1 = new THREE.Mesh(ventGeom, this.titaniumMat);
        vent1.position.set(1.8, tankRadius + 0.1, 0);
        fwdGroup.add(vent1);
        const vent2 = new THREE.Mesh(ventGeom, this.titaniumMat);
        vent2.position.set(-1.8, tankRadius + 0.1, 0);
        fwdGroup.add(vent2);

        // Rejillas inferiores de inundación (Kingston Flood Ports) en el fondo del tanque
        const grateGeom = new THREE.BoxGeometry(2.4, 0.2, 0.9);
        const grateMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
        const fwdGrate = new THREE.Mesh(grateGeom, grateMat);
        fwdGrate.position.set(0, -tankRadius - 0.05, 0);
        fwdGroup.add(fwdGrate);

        this.ballastSystemGroup.add(fwdGroup);

        // ==========================================
        // 2. TANQUE DE POPA (AFT MBT) en x: -6.5m
        // ==========================================
        const aftGroup = new THREE.Group();
        aftGroup.position.set(-6.5, 0, 0);

        const aftCasing = new THREE.Mesh(casingGeom, this.tankCasingMat);
        aftCasing.renderOrder = 2;
        aftGroup.add(aftCasing);

        this.aftWaterMesh = new THREE.Mesh(waterGeom, this.ballastWaterMat);
        this.aftWaterMesh.renderOrder = 1;
        aftGroup.add(this.aftWaterMesh);

        const aftVent1 = new THREE.Mesh(ventGeom, this.titaniumMat);
        aftVent1.position.set(1.8, tankRadius + 0.1, 0);
        aftGroup.add(aftVent1);
        const aftVent2 = new THREE.Mesh(ventGeom, this.titaniumMat);
        aftVent2.position.set(-1.8, tankRadius + 0.1, 0);
        aftGroup.add(aftVent2);

        const aftGrate = new THREE.Mesh(grateGeom, grateMat);
        aftGrate.position.set(0, -tankRadius - 0.05, 0);
        aftGroup.add(aftGrate);

        this.ballastSystemGroup.add(aftGroup);

        // ==========================================
        // 3. LÍNEAS DE AIRE COMPRIMIDO (HP Air Manifold)
        // ==========================================
        // Tubería dorada de soplado que recorre el lomo hacia ambos tanques
        const pipeCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-8.5, tankRadius + 0.15, 0.3),
            new THREE.Vector3(0, tankRadius + 0.25, 0.3),
            new THREE.Vector3(8.5, tankRadius + 0.15, 0.3),
        ]);
        const pipeGeom = new THREE.TubeGeometry(pipeCurve, 24, 0.06, 8, false);
        const hpAirPipe = new THREE.Mesh(pipeGeom, this.brassPipingMat);
        hpAirPipe.renderOrder = 0;
        this.ballastSystemGroup.add(hpAirPipe);

        // ==========================================
        // 4. BANCO DE BOTELLONES DE AIRE A 200 BAR (Air Flasks)
        // ==========================================
        const flaskGeom = new THREE.CylinderGeometry(0.35, 0.35, 3.2, 16);
        flaskGeom.rotateZ(Math.PI / 2);

        const flaskPositions = [
            new THREE.Vector3(0, 0.8, 1.2),
            new THREE.Vector3(0, 0.8, -1.2),
            new THREE.Vector3(0, -0.6, 1.2),
            new THREE.Vector3(0, -0.6, -1.2),
        ];

        flaskPositions.forEach(pos => {
            const flask = new THREE.Mesh(flaskGeom, this.chromeFlaskMat);
            flask.position.copy(pos);
            flask.renderOrder = 0;
            this.ballastSystemGroup.add(flask);

            // Anillos de sujeción dorados
            const collarGeom = new THREE.TorusGeometry(0.38, 0.03, 8, 16);
            collarGeom.rotateY(Math.PI / 2);
            const collar1 = new THREE.Mesh(collarGeom, this.brassPipingMat);
            collar1.position.set(pos.x + 0.9, pos.y, pos.z);
            this.ballastSystemGroup.add(collar1);
            const collar2 = new THREE.Mesh(collarGeom, this.brassPipingMat);
            collar2.position.set(pos.x - 0.9, pos.y, pos.z);
            this.ballastSystemGroup.add(collar2);
        });
    }

    /**
     * Módulo de Mando Central / Esfera de Presión de la Tripulación
     */
    buildCentralCommandPod() {
        const podGroup = new THREE.Group();
        podGroup.position.set(0, 0.2, 0);

        // Consola de control e instrumentación
        const consoleGeom = new THREE.BoxGeometry(2.0, 1.1, 1.8);
        const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1e2836, metalness: 0.85, roughness: 0.3 });
        const consoleMesh = new THREE.Mesh(consoleGeom, consoleMat);
        podGroup.add(consoleMesh);

        // Pantallas HUD holográficas interiores luminosas
        const screenGeom = new THREE.PlaneGeometry(1.2, 0.5);
        screenGeom.rotateY(Math.PI / 2);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 });
        const screen = new THREE.Mesh(screenGeom, screenMat);
        screen.position.set(0, 0.8, 0);
        podGroup.add(screen);

        this.interiorFrameworkGroup.add(podGroup);
    }

    /**
     * Vela / Torre de mando estilizada con planos de inmersión
     */
    buildSailAndFairwaterPlanes() {
        this.sailGroup.position.set(3.8, 2.7, 0);

        const sailShape = new THREE.Shape();
        sailShape.moveTo(-2.8, 0);
        sailShape.quadraticCurveTo(-2.6, 1.0, 0, 1.0);
        sailShape.quadraticCurveTo(2.4, 1.0, 2.8, 0);
        sailShape.quadraticCurveTo(2.4, -1.0, 0, -1.0);
        sailShape.quadraticCurveTo(-2.6, -1.0, -2.8, 0);
        sailShape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: SUBMARINE_CONSTANTS.SAIL_HEIGHT,
            bevelEnabled: true,
            bevelThickness: 0.18,
            bevelSize: 0.12,
            bevelSegments: 3,
        };

        const sailGeom = new THREE.ExtrudeGeometry(sailShape, extrudeSettings);
        sailGeom.rotateX(-Math.PI / 2);
        sailGeom.rotateY(-Math.PI / 2);
        const sailMesh = new THREE.Mesh(sailGeom, this.titaniumMat);
        sailMesh.castShadow = true;
        this.sailGroup.add(sailMesh);

        // Mástil de periscopio
        const mastGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 12);
        const mast = new THREE.Mesh(mastGeom, this.chromeFlaskMat);
        mast.position.set(0.6, SUBMARINE_CONSTANTS.SAIL_HEIGHT + 0.8, 0);
        this.sailGroup.add(mast);

        // Planos de inmersión en la vela (Fairwater dive planes)
        this.fairwaterPlanesGroup.position.set(0.6, SUBMARINE_CONSTANTS.SAIL_HEIGHT * 0.55, 0);

        const planeShape = new THREE.Shape();
        planeShape.moveTo(-1.0, -0.06);
        planeShape.lineTo(1.0, -0.03);
        planeShape.lineTo(0.7, 0.06);
        planeShape.lineTo(-0.8, 0.05);
        planeShape.closePath();

        const planeGeom = new THREE.ExtrudeGeometry(planeShape, { depth: 2.0, bevelEnabled: false });
        planeGeom.center();

        const leftPlane = new THREE.Mesh(planeGeom, this.titaniumMat);
        leftPlane.position.z = 1.8;
        this.fairwaterPlanesGroup.add(leftPlane);

        const rightPlane = new THREE.Mesh(planeGeom, this.titaniumMat);
        rightPlane.position.z = -1.8;
        this.fairwaterPlanesGroup.add(rightPlane);

        this.sailGroup.add(this.fairwaterPlanesGroup);
    }

    /**
     * Eje de transmisión propulsora, Timones en X y Hélice de 7 palas
     */
    buildXRuddersAndPropulsionShaft() {
        this.propulsionGroup.position.set(-18.5, 0, 0);

        // Eje de hélice en acero cromado
        const shaftGeom = new THREE.CylinderGeometry(0.22, 0.22, 5.0, 16);
        shaftGeom.rotateZ(Math.PI / 2);
        const shaftMesh = new THREE.Mesh(shaftGeom, this.chromeFlaskMat);
        shaftMesh.position.x = -1.0;
        this.propulsionGroup.add(shaftMesh);

        // Timones en X
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(-2.8, 0);
        finShape.lineTo(-2.4, 2.8);
        finShape.lineTo(-0.7, 2.4);
        finShape.closePath();

        const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
        finGeom.center();

        [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4].forEach(ang => {
            const fin = new THREE.Mesh(finGeom, this.titaniumMat);
            fin.rotation.x = ang;
            fin.position.y = Math.sin(ang) * 1.5;
            fin.position.z = Math.cos(ang) * 1.5;
            this.propulsionGroup.add(fin);
        });

        // Hélice silenciosa de 7 palas sesgadas (Skewed Propeller)
        this.propellerBladesGroup.position.set(-2.7, 0, 0);

        const hubGeom = new THREE.ConeGeometry(0.65, 1.8, 24);
        hubGeom.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeom, this.propellerBronzeMat);
        this.propellerBladesGroup.add(hub);

        const bladeCount = 7;
        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2;
            const bladeHolder = new THREE.Group();
            bladeHolder.rotation.x = angle;

            const bladeCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.08, 0.35, 0.0),
                new THREE.Vector3(0.0, 1.0, 0.35),
                new THREE.Vector3(-0.25, 1.7, 0.75),
                new THREE.Vector3(-0.38, 2.3, 1.05),
            ]);

            const bladeGeom = new THREE.TubeGeometry(bladeCurve, 16, 0.24, 8, false);
            bladeGeom.scale(0.35, 1.0, 2.5);
            const bladeMesh = new THREE.Mesh(bladeGeom, this.propellerBronzeMat);
            bladeMesh.castShadow = true;

            bladeHolder.add(bladeMesh);
            this.propellerBladesGroup.add(bladeHolder);
        }

        this.propulsionGroup.add(this.propellerBladesGroup);
    }

    /**
     * Flechas y Etiquetas de Fuerzas 3D limpias y nítidas
     * Empuje (E) en verde esmeralda y Peso (W) en rosa tenue
     */
    buildForceVectors() {
        this.buoyancyArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            12.0,
            0x00ffaa,
            2.2,
            1.1
        );

        this.weightArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            12.0,
            0xff4477,
            2.2,
            1.1
        );

        this.vectorsGroup.add(this.buoyancyArrow);
        this.vectorsGroup.add(this.weightArrow);

        this.buoyancyLabel = this.createVectorSprite('Empuje (E)', '#00ffaa');
        this.weightLabel = this.createVectorSprite('Peso (W)', '#ff6688');

        this.vectorsGroup.add(this.buoyancyLabel);
        this.vectorsGroup.add(this.weightLabel);
    }

    createVectorSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 72;
        const ctx = canvas.getContext('2d');

        ctx.font = 'bold 30px "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = colorHex;
        ctx.shadowBlur = 8;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(8.5, 1.6, 1.0);
        return sprite;
    }

    /**
     * Alternar modo de opacidad o rayos X
     */
    setXrayMode(enabled) {
        this.state.hullCutaway = enabled;
        if (enabled) {
            this.acrylicMatFront.transmission = 0.96;
            this.acrylicMatFront.opacity = 0.94;
            this.acrylicMatBack.transmission = 0.95;
            this.acrylicMatBack.opacity = 0.92;
        } else {
            // Modo translúcido naval con tono más ahumado
            this.acrylicMatFront.transmission = 0.75;
            this.acrylicMatFront.opacity = 0.95;
            this.acrylicMatBack.transmission = 0.70;
            this.acrylicMatBack.opacity = 0.95;
        }
    }

    /**
     * Actualización por cuadro de animación
     */
    update(dt) {
        // 1. Cinemática de posición y cabeceo con salvaguardas numéricas
        const posX = Number.isFinite(this.state.x) ? this.state.x : 0.0;
        const posY = Number.isFinite(this.state.y) ? this.state.y : -0.2;
        const pitchAngle = Number.isFinite(this.state.pitch) ? this.state.pitch : 0.0;

        this.rootGroup.position.set(posX, posY, 0);
        this.rootGroup.rotation.z = pitchAngle;

        // 2. Rotación de la hélice de 7 palas
        const rpm = Number.isFinite(this.state.propellerRPM) ? this.state.propellerRPM : 0.0;
        const rps = rpm / 60.0;
        const deltaT = Number.isFinite(dt) ? dt : 0.016;
        this.propellerBladesGroup.rotation.x += rps * Math.PI * 2 * deltaT;

        // 3. Planos de inmersión
        const diveAngle = Number.isFinite(this.state.divePlanesAngle) ? this.state.divePlanesAngle : 0.0;
        const planeRad = (diveAngle * Math.PI) / 180.0;
        this.fairwaterPlanesGroup.rotation.z = -planeRad;

        // 4. Dinámica bifásica de agua de lastre en los tanques MBT
        const fwdRaw = Number.isFinite(this.state.fwdBallastPct) ? this.state.fwdBallastPct : 0.0;
        const aftRaw = Number.isFinite(this.state.aftBallastPct) ? this.state.aftBallastPct : 0.0;
        const fwdFrac = Math.max(0.01, Math.min(1.0, fwdRaw / 100.0));
        const aftFrac = Math.max(0.01, Math.min(1.0, aftRaw / 100.0));

        if (this.fwdWaterMesh) {
            // Escalar en radio vertical y transversal (Y y Z) para simular el llenado cilíndrico
            const scaleRad = Math.max(0.06, Math.min(1.0, Math.sqrt(fwdFrac)));
            this.fwdWaterMesh.scale.set(1.0, scaleRad, scaleRad);
            // El nivel de agua se asienta en el fondo del tanque conforme se vacía
            this.fwdWaterMesh.position.y = -2.3 * (1.0 - scaleRad) * 0.45;
        }

        if (this.aftWaterMesh) {
            const scaleRad = Math.max(0.06, Math.min(1.0, Math.sqrt(aftFrac)));
            this.aftWaterMesh.scale.set(1.0, scaleRad, scaleRad);
            this.aftWaterMesh.position.y = -2.3 * (1.0 - scaleRad) * 0.45;
        }

        // 5. Vectores de Fuerza 3D
        this.vectorsGroup.visible = !!this.state.showForceVectors;
        if (this.vectorsGroup.visible) {
            const forceScale = 1.0 / 480000.0;
            const minLen = 3.0;

            const bForce = Number.isFinite(this.state.buoyancyForce) ? this.state.buoyancyForce : 0.0;
            const wForce = Number.isFinite(this.state.weightForce) ? this.state.weightForce : 0.0;

            const eLen = Math.max(minLen, Math.min(60.0, bForce * forceScale));
            this.buoyancyArrow.setLength(eLen, Math.min(2.5, eLen * 0.25), 1.0);
            this.buoyancyLabel.position.set(0, eLen + 2.0, 0);

            const wLen = Math.max(minLen, Math.min(60.0, wForce * forceScale));
            this.weightArrow.setLength(wLen, Math.min(2.5, wLen * 0.25), 1.0);
            this.weightLabel.position.set(0, -wLen - 2.0, 0);
        }
    }
}
