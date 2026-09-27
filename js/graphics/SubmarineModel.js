/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * SubmarineModel.js - Modelo procedural de alta fidelidad:
 * Casco hidrodinámico Albacore en huso, sección translúcida de rayos X,
 * costillas estructurales de refuerzo, mamparos, tanques de lastre proa/popa,
 * timones en X, hélice silenciosa de 7 palas sesgadas y vectores 3D limpios.
 */

import * as THREE from 'three';
import { SUBMARINE_CONSTANTS } from '../config/constants.js';

export class SubmarineModel {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.rootGroup = new THREE.Group();
        this.hullGroup = new THREE.Group();
        this.interiorGroup = new THREE.Group();
        this.exteriorGroup = new THREE.Group();
        this.propellerGroup = new THREE.Group();
        this.fairwaterPlanesGroup = new THREE.Group();
        this.vectorsGroup = new THREE.Group();

        this.fwdWaterMesh = null;
        this.aftWaterMesh = null;
        this.translucentHullMesh = null;
        this.solidHullMeshes = [];

        this.initMaterials();
        this.buildAlbacoreHull();
        this.buildStructuralRings();
        this.buildSailAndPlanes();
        this.buildXRudders();
        this.buildSkewed7BladePropeller();
        this.buildInternalBallastTanks();
        this.buildForceVectors();

        this.rootGroup.add(this.interiorGroup);
        this.rootGroup.add(this.hullGroup);
        this.rootGroup.add(this.exteriorGroup);
        this.rootGroup.add(this.vectorsGroup);

        this.scene.add(this.rootGroup);
    }

    /**
     * Materiales PBR navales de alta definición
     */
    initMaterials() {
        // 1. Acero Naval Táctico Mate (Color gris antracita naval)
        this.hullSteelMat = new THREE.MeshPhysicalMaterial({
            color: 0x222a35,
            metalness: 0.85,
            roughness: 0.35,
            clearcoat: 0.2,
            clearcoatRoughness: 0.15,
        });

        // 2. Sección Translúcida de Inspección (Modo Rayos X PBR con refracción)
        this.xrayGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0x88d4ff,
            metalness: 0.05,
            roughness: 0.12,
            transmission: 0.85, // Alta transmisión
            ior: 1.333,         // Índice de refracción acuático
            thickness: 0.6,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
        });

        // 3. Casco de Presión Interno (Aleación HY-80 oscura)
        this.pressureHullMat = new THREE.MeshStandardMaterial({
            color: 0x3d4855,
            metalness: 0.8,
            roughness: 0.45,
        });

        // 4. Anillos / Costillas de refuerzo estructural
        this.ribMat = new THREE.MeshStandardMaterial({
            color: 0x18202a,
            metalness: 0.9,
            roughness: 0.3,
        });

        // 5. Agua de Lastre Interna (Azul cian luminoso)
        this.ballastWaterMat = new THREE.MeshPhysicalMaterial({
            color: 0x00d4ff,
            emissive: 0x004466,
            emissiveIntensity: 0.35,
            metalness: 0.1,
            roughness: 0.15,
            transmission: 0.75,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
        });

        // 6. Bronce Naval de Hélice
        this.bronzeMat = new THREE.MeshStandardMaterial({
            color: 0xc49746,
            metalness: 0.92,
            roughness: 0.25,
        });
    }

    /**
     * Construye el casco hidrodinámico Albacore continuo con curvatura en huso
     */
    buildAlbacoreHull() {
        const length = SUBMARINE_CONSTANTS.HULL_LENGTH;       // 42m
        const maxRadius = SUBMARINE_CONSTANTS.HULL_DIAMETER / 2.0; // 2.8m

        const numSteps = 42;
        const profilePoints = [];

        for (let i = 0; i <= numSteps; i++) {
            const u = i / numSteps; // 0 en popa (-21m), 1 en proa (+21m)
            const x = -length / 2.0 + u * length;
            let r = 0;

            if (u >= 0.72) {
                // Domo acústico de proa elíptico suave y achatado
                const bowU = (u - 0.72) / 0.28;
                r = maxRadius * Math.sqrt(Math.max(0, 1.0 - Math.pow(1.0 - bowU, 2)));
            } else if (u >= 0.35) {
                // Cuerpo medio paralelo cilíndrico
                r = maxRadius;
            } else {
                // Popa ahusada estilizada
                const sternU = u / 0.35;
                r = 0.65 + (maxRadius - 0.65) * Math.pow(sternU, 1.35);
            }

            profilePoints.push(new THREE.Vector2(r, x));
        }

        // 1. Proa sólida (x: +6m a +21m)
        const bowPoints = profilePoints.filter(p => p.y >= 6.0);
        if (bowPoints.length > 1) {
            const bowGeom = new THREE.LatheGeometry(bowPoints, 36);
            bowGeom.rotateZ(-Math.PI / 2);
            const bowMesh = new THREE.Mesh(bowGeom, this.hullSteelMat);
            bowMesh.castShadow = true;
            this.hullGroup.add(bowMesh);
            this.solidHullMeshes.push(bowMesh);
        }

        // 2. Sección central de inspección translúcida ("X-Ray") (x: -6m a +6m)
        const midPoints = profilePoints.filter(p => p.y >= -6.0 && p.y <= 6.0);
        if (midPoints.length > 1) {
            const midGeom = new THREE.LatheGeometry(midPoints, 36);
            midGeom.rotateZ(-Math.PI / 2);
            this.translucentHullMesh = new THREE.Mesh(midGeom, this.xrayGlassMat);
            this.hullGroup.add(this.translucentHullMesh);
        }

        // 3. Popa sólida (x: -21m a -6m)
        const sternPoints = profilePoints.filter(p => p.y <= -6.0);
        if (sternPoints.length > 1) {
            const sternGeom = new THREE.LatheGeometry(sternPoints, 36);
            sternGeom.rotateZ(-Math.PI / 2);
            const sternMesh = new THREE.Mesh(sternGeom, this.hullSteelMat);
            sternMesh.castShadow = true;
            this.hullGroup.add(sternMesh);
            this.solidHullMeshes.push(sternMesh);
        }
    }

    /**
     * Anillos y costillas de refuerzo estructural exteriores (Ribs)
     */
    buildStructuralRings() {
        const ringPositions = [-14, -10, -6, 6, 10, 14];
        const radius = SUBMARINE_CONSTANTS.HULL_DIAMETER / 2.0;

        ringPositions.forEach(xPos => {
            const ringGeom = new THREE.TorusGeometry(radius + 0.05, 0.08, 12, 36);
            ringGeom.rotateY(Math.PI / 2);
            const ringMesh = new THREE.Mesh(ringGeom, this.ribMat);
            ringMesh.position.x = xPos;
            this.exteriorGroup.add(ringMesh);
        });
    }

    /**
     * Vela / Torre de mando con perfil aerodinámico y planos de inmersión móviles
     */
    buildSailAndPlanes() {
        const sailGroup = new THREE.Group();
        sailGroup.position.set(4.2, 2.7, 0);

        // Perfil en gota de agua estilizado para la vela
        const sailShape = new THREE.Shape();
        sailShape.moveTo(-3.0, 0);
        sailShape.quadraticCurveTo(-2.8, 1.1, 0, 1.1);
        sailShape.quadraticCurveTo(2.6, 1.1, 3.0, 0);
        sailShape.quadraticCurveTo(2.6, -1.1, 0, -1.1);
        sailShape.quadraticCurveTo(-2.8, -1.1, -3.0, 0);
        sailShape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: SUBMARINE_CONSTANTS.SAIL_HEIGHT,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.15,
            bevelSegments: 3,
        };

        const sailGeom = new THREE.ExtrudeGeometry(sailShape, extrudeSettings);
        sailGeom.rotateX(-Math.PI / 2);
        sailGeom.rotateY(-Math.PI / 2);
        const sailMesh = new THREE.Mesh(sailGeom, this.hullSteelMat);
        sailMesh.castShadow = true;
        sailGroup.add(sailMesh);

        // Mástiles de periscopio, radar y antenas telescópicas
        const mastGeom = new THREE.CylinderGeometry(0.07, 0.07, 1.8, 12);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.9, roughness: 0.2 });

        const periscope = new THREE.Mesh(mastGeom, mastMat);
        periscope.position.set(0.6, SUBMARINE_CONSTANTS.SAIL_HEIGHT + 0.8, 0);
        sailGroup.add(periscope);

        const radar = new THREE.Mesh(mastGeom, mastMat);
        radar.position.set(-0.7, SUBMARINE_CONSTANTS.SAIL_HEIGHT + 0.65, 0);
        sailGroup.add(radar);

        // Planos de inmersión en la vela (Fairwater dive planes)
        this.fairwaterPlanesGroup.position.set(0.7, SUBMARINE_CONSTANTS.SAIL_HEIGHT * 0.55, 0);

        const planeShape = new THREE.Shape();
        planeShape.moveTo(-1.1, -0.08);
        planeShape.lineTo(1.1, -0.04);
        planeShape.lineTo(0.8, 0.08);
        planeShape.lineTo(-0.9, 0.06);
        planeShape.closePath();

        const planeGeom = new THREE.ExtrudeGeometry(planeShape, { depth: 2.1, bevelEnabled: false });
        planeGeom.center();

        const leftPlane = new THREE.Mesh(planeGeom, this.hullSteelMat);
        leftPlane.position.z = 1.85;
        this.fairwaterPlanesGroup.add(leftPlane);

        const rightPlane = new THREE.Mesh(planeGeom, this.hullSteelMat);
        rightPlane.position.z = -1.85;
        this.fairwaterPlanesGroup.add(rightPlane);

        sailGroup.add(this.fairwaterPlanesGroup);
        this.exteriorGroup.add(sailGroup);
    }

    /**
     * Timones en configuración X (X-Rudders) en la popa
     */
    buildXRudders() {
        const rudderGroup = new THREE.Group();
        rudderGroup.position.set(-18.5, 0, 0);

        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(-3.0, 0);
        finShape.lineTo(-2.6, 3.0);
        finShape.lineTo(-0.8, 2.6);
        finShape.closePath();

        const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
        finGeom.center();

        const angles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
        angles.forEach(ang => {
            const fin = new THREE.Mesh(finGeom, this.hullSteelMat);
            fin.rotation.x = ang;
            fin.position.y = Math.sin(ang) * 1.55;
            fin.position.z = Math.cos(ang) * 1.55;
            rudderGroup.add(fin);
        });

        this.exteriorGroup.add(rudderGroup);
    }

    /**
     * Hélice propulsora de 7 palas con curvatura helicoidal pronunciada (Skewed propeller)
     */
    buildSkewed7BladePropeller() {
        this.propellerGroup.position.set(-21.2, 0, 0);

        // Cubo cónico central
        const hubGeom = new THREE.ConeGeometry(0.65, 1.8, 24);
        hubGeom.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeom, this.bronzeMat);
        this.propellerGroup.add(hub);

        const bladeCount = 7;
        const bladeRadius = 2.4;

        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2;
            const bladeGroup = new THREE.Group();
            bladeGroup.rotation.x = angle;

            const bladeCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.08, 0.4, 0.0),
                new THREE.Vector3(0.0, 1.1, 0.35),
                new THREE.Vector3(-0.25, 1.8, 0.8),
                new THREE.Vector3(-0.4, bladeRadius, 1.1),
            ]);

            const bladeGeom = new THREE.TubeGeometry(bladeCurve, 16, 0.26, 8, false);
            bladeGeom.scale(0.35, 1.0, 2.6);
            const bladeMesh = new THREE.Mesh(bladeGeom, this.bronzeMat);
            bladeMesh.castShadow = true;

            bladeGroup.add(bladeMesh);
            this.propellerGroup.add(bladeGroup);
        }

        this.exteriorGroup.add(this.propellerGroup);
    }

    /**
     * Estructura interna: Casco de presión resistente, mamparos y tanques de lastre
     */
    buildInternalBallastTanks() {
        const innerRadius = 2.15;
        const innerLength = 26.0;

        // Casco interior resistente
        const innerGeom = new THREE.CylinderGeometry(innerRadius, innerRadius, innerLength, 24, 6, true);
        innerGeom.rotateZ(Math.PI / 2);
        const innerMesh = new THREE.Mesh(innerGeom, this.pressureHullMat);
        this.interiorGroup.add(innerMesh);

        // Mamparos transversales (Bulkheads)
        const bulkheadGeom = new THREE.CylinderGeometry(innerRadius, innerRadius, 0.2, 24);
        bulkheadGeom.rotateZ(Math.PI / 2);
        [-10, -5.5, 0, 5.5, 10].forEach(xPos => {
            const bulkhead = new THREE.Mesh(bulkheadGeom, this.pressureHullMat);
            bulkhead.position.x = xPos;
            this.interiorGroup.add(bulkhead);
        });

        // Tanque de lastre proa (Forward MBT)
        const tankLength = 4.8;
        const tankRadius = 1.95;

        const fwdWaterGeom = new THREE.CylinderGeometry(tankRadius * 0.95, tankRadius * 0.95, tankLength * 0.95, 18);
        fwdWaterGeom.rotateZ(Math.PI / 2);
        this.fwdWaterMesh = new THREE.Mesh(fwdWaterGeom, this.ballastWaterMat);
        this.fwdWaterMesh.position.set(2.75, 0, 0);
        this.interiorGroup.add(this.fwdWaterMesh);

        // Tanque de lastre popa (Aft MBT)
        const aftWaterGeom = new THREE.CylinderGeometry(tankRadius * 0.95, tankRadius * 0.95, tankLength * 0.95, 18);
        aftWaterGeom.rotateZ(Math.PI / 2);
        this.aftWaterMesh = new THREE.Mesh(aftWaterGeom, this.ballastWaterMat);
        this.aftWaterMesh.position.set(-2.75, 0, 0);
        this.interiorGroup.add(this.aftWaterMesh);
    }

    /**
     * Vectores 3D de Fuerza: Empuje (E) en verde y Peso (W) en rojo
     * Diseño idéntico a la línea base aprobada (sin saturar la pantalla)
     */
    buildForceVectors() {
        // Flecha de Empuje E (Cian / Verde esmeralda, apunta hacia arriba)
        this.buoyancyArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            12.0,
            0x00ffaa,
            2.2,
            1.1
        );

        // Flecha de Peso W (Rojo / Rosa tenue, apunta hacia abajo)
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

        // Etiquetas 3D flotantes con texto limpio ("Empuje (E)" y "Peso (W)")
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

        ctx.font = 'bold 32px "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = colorHex;
        ctx.shadowBlur = 10;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(9.0, 1.7, 1.0);
        return sprite;
    }

    /**
     * Alterna entre modo translúcido Rayos X y casco de acero opaco
     */
    setXrayMode(enabled) {
        this.state.hullCutaway = enabled;
        if (this.translucentHullMesh) {
            this.translucentHullMesh.material = enabled ? this.xrayGlassMat : this.hullSteelMat;
        }
    }

    update(dt) {
        // 1. Posición y cabeceo cinemático
        this.rootGroup.position.set(this.state.x, this.state.y, 0);
        this.rootGroup.rotation.z = this.state.pitch;

        // 2. Rotación de la hélice de 7 palas
        const rps = this.state.propellerRPM / 60.0;
        this.propellerGroup.rotation.x += rps * Math.PI * 2 * dt;

        // 3. Ángulo de planos de inmersión
        const planeRad = (this.state.divePlanesAngle * Math.PI) / 180.0;
        this.fairwaterPlanesGroup.rotation.z = -planeRad;

        // 4. Nivel dinámico de agua en los tanques de lastre
        const fwdFrac = Math.max(0.02, this.state.fwdBallastPct / 100.0);
        const aftFrac = Math.max(0.02, this.state.aftBallastPct / 100.0);

        if (this.fwdWaterMesh) {
            const radScale = Math.max(0.05, Math.sqrt(fwdFrac));
            this.fwdWaterMesh.scale.set(1.0, radScale, radScale);
            this.fwdWaterMesh.position.y = -1.95 * (1.0 - radScale) * 0.45;
        }

        if (this.aftWaterMesh) {
            const radScale = Math.max(0.05, Math.sqrt(aftFrac));
            this.aftWaterMesh.scale.set(1.0, radScale, radScale);
            this.aftWaterMesh.position.y = -1.95 * (1.0 - radScale) * 0.45;
        }

        // 5. Vectores de fuerza 3D
        if (this.state.showForceVectors) {
            const forceScale = 1.0 / 480000.0;
            const minLen = 3.0;

            const eLen = Math.max(minLen, this.state.buoyancyForce * forceScale);
            this.buoyancyArrow.setLength(eLen, Math.min(2.5, eLen * 0.25), 1.0);
            this.buoyancyLabel.position.set(0, eLen + 2.0, 0);

            const wLen = Math.max(minLen, this.state.weightForce * forceScale);
            this.weightArrow.setLength(wLen, Math.min(2.5, wLen * 0.25), 1.0);
            this.weightLabel.position.set(0, -wLen - 2.0, 0);
        }
    }
}
