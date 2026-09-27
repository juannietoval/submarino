/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * SubmarineModel.js - Modelo 3D Optimizado y Elegante con Casco Translúcido
 * Diseño limpio, geométricamente exacto y fiel a la línea visual aprobada UTP.
 */

import * as THREE from 'three';

export class SubmarineModel {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        // Dimensiones base
        this.SUB_RADIUS = 1.5;
        this.SUB_LENGTH = 13.0;
        this.hullCylLen = this.SUB_LENGTH - (this.SUB_RADIUS * 2.0); // 10.0 m
        this.tailLen = this.SUB_RADIUS * 2.0; // 3.0 m

        this.rootGroup = new THREE.Group();
        this.hullGroup = new THREE.Group();
        this.internalGroup = new THREE.Group();
        this.propellerGroup = new THREE.Group();
        this.fairwaterPlanesGroup = new THREE.Group();
        this.vectorsGroup = new THREE.Group();

        this.initMaterials();
        this.buildSubmarine();
        this.buildForceVectors();

        // Orientar el submarino para que la proa apunte al frente-derecha (idéntico a la referencia UTP)
        this.hullGroup.rotation.y = Math.PI;
        this.internalGroup.rotation.y = Math.PI;

        this.rootGroup.add(this.internalGroup);
        this.rootGroup.add(this.hullGroup);
        this.rootGroup.add(this.vectorsGroup);

        this.scene.add(this.rootGroup);
    }

    initMaterials() {
        // 1. Acero naval oscuro satinado (Proa, popa, torreta, timones)
        this.steelDarkMat = new THREE.MeshStandardMaterial({
            color: 0x37474f,
            metalness: 0.70,
            roughness: 0.38,
        });

        // 2. Acero / Titanio claro (Cuadernas de refuerzo internas, mástiles)
        this.detailMat = new THREE.MeshStandardMaterial({
            color: 0xcfd8dc,
            metalness: 0.70,
            roughness: 0.30,
        });

        // 3. Bronce naval (Hélice propulsora)
        this.bronzeMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.85,
            roughness: 0.25,
        });

        // 4. Casco Cilíndrico Translúcido (Acrílico marino limpio con brillo de superficie)
        this.hullMat = new THREE.MeshPhysicalMaterial({
            color: 0xd0d0d0,
            metalness: 0.30,
            roughness: 0.10,
            transmission: 0.25,
            thickness: 1.5,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            depthWrite: false,
        });

        // 5. Contenedor de tanques de lastre (cilindro sutil translúcido, sin rejillas invasivas)
        this.tankShellMat = new THREE.MeshStandardMaterial({
            color: 0x88ccdd,
            transparent: true,
            opacity: 0.12,
            roughness: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        // 6. Fluido de agua de lastre viva (Azul cian nítido y luminoso)
        this.waterFillMat = new THREE.MeshStandardMaterial({
            color: 0x00bfff,
            emissive: 0x004466,
            emissiveIntensity: 0.30,
            transparent: true,
            opacity: 0.85,
            roughness: 0.10,
            metalness: 0.15,
            side: THREE.DoubleSide,
        });

        // Superficie líquida horizontal
        this.waterSurfaceMat = new THREE.MeshStandardMaterial({
            color: 0x66e5ff,
            emissive: 0x005577,
            emissiveIntensity: 0.40,
            transparent: true,
            opacity: 0.90,
            roughness: 0.05,
            side: THREE.DoubleSide,
        });
    }

    buildSubmarine() {
        const R = this.SUB_RADIUS;
        const L = this.hullCylLen;
        const T = this.tailLen;

        // --- 1. CASCO CENTRAL CILÍNDRICO TRANSLÚCIDO ---
        const mainHullGeo = new THREE.CylinderGeometry(R, R, L, 36);
        this.mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
        this.mainHull.rotation.x = Math.PI / 2;
        this.hullGroup.add(this.mainHull);

        // --- 2. PROA HEMISFÉRICA (+Z) ---
        const noseGeo = new THREE.SphereGeometry(R, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2);
        this.nose = new THREE.Mesh(noseGeo, this.steelDarkMat);
        this.nose.rotation.x = Math.PI / 2; // Apunta hacia +Z
        this.nose.position.z = L / 2;
        this.hullGroup.add(this.nose);

        // --- 3. POPA CÓNICA (-Z) ---
        const tailGeo = new THREE.CylinderGeometry(R, R * 0.30, T, 36);
        this.tail = new THREE.Mesh(tailGeo, this.steelDarkMat);
        this.tail.rotation.x = Math.PI / 2;
        this.tail.position.z = -(L / 2 + T / 2);
        this.hullGroup.add(this.tail);

        // --- 4. ALETAS DE POPA (Timones en cruz) ---
        const finGeo = new THREE.BoxGeometry(0.10, 1.4, 1.3);
        const finHorizGeo = new THREE.BoxGeometry(1.4, 0.10, 1.3);

        const finTop = new THREE.Mesh(finGeo, this.steelDarkMat);
        finTop.position.set(0, R * 0.75, -(L / 2 + T * 0.45));
        this.hullGroup.add(finTop);

        const finBot = new THREE.Mesh(finGeo, this.steelDarkMat);
        finBot.position.set(0, -R * 0.75, -(L / 2 + T * 0.45));
        this.hullGroup.add(finBot);

        const finLeft = new THREE.Mesh(finHorizGeo, this.steelDarkMat);
        finLeft.position.set(R * 0.75, 0, -(L / 2 + T * 0.45));
        this.hullGroup.add(finLeft);

        const finRight = new THREE.Mesh(finHorizGeo, this.steelDarkMat);
        finRight.position.set(-R * 0.75, 0, -(L / 2 + T * 0.45));
        this.hullGroup.add(finRight);

        // --- 5. HÉLICE PROPULSORA EN BRONCE (-Z) ---
        this.propellerGroup.position.set(0, 0, -(L / 2 + T + 0.05));

        const propHubGeo = new THREE.ConeGeometry(0.15, 0.40, 20);
        const propHub = new THREE.Mesh(propHubGeo, this.detailMat);
        propHub.rotation.x = -Math.PI / 2;
        this.propellerGroup.add(propHub);

        const numBlades = 5;
        const bladeGeo = new THREE.BoxGeometry(0.75, 0.12, 0.035);
        for (let i = 0; i < numBlades; i++) {
            const blade = new THREE.Mesh(bladeGeo, this.detailMat);
            blade.position.z = -0.12;
            blade.rotation.z = (Math.PI * 2 / numBlades) * i;
            blade.rotation.y = 0.30;
            this.propellerGroup.add(blade);
        }
        this.hullGroup.add(this.propellerGroup);

        // --- 6. VELA / TORRE DE MANDO (Conning Tower) ---
        const sailGroup = new THREE.Group();
        sailGroup.position.set(0, R * 0.75, L * 0.20);

        const sailGeo = new THREE.BoxGeometry(R * 0.75, R * 1.45, R * 1.35);
        const sailMesh = new THREE.Mesh(sailGeo, this.steelDarkMat);
        sailMesh.position.y = (R * 1.45) / 2;
        sailGroup.add(sailMesh);

        // Timones de inmersión en la vela
        const planeGeo = new THREE.BoxGeometry(1.10, 0.08, 0.55);
        const planeLeft = new THREE.Mesh(planeGeo, this.steelDarkMat);
        planeLeft.position.set((R * 0.75) / 2 + 0.55, (R * 1.45) * 0.60, 0);
        this.fairwaterPlanesGroup.add(planeLeft);

        const planeRight = new THREE.Mesh(planeGeo, this.steelDarkMat);
        planeRight.position.set(-((R * 0.75) / 2 + 0.55), (R * 1.45) * 0.60, 0);
        this.fairwaterPlanesGroup.add(planeRight);

        sailGroup.add(this.fairwaterPlanesGroup);

        // Mástiles de periscopio
        const mastGeo1 = new THREE.CylinderGeometry(0.06, 0.06, 1.15, 16);
        const mast1 = new THREE.Mesh(mastGeo1, this.detailMat);
        mast1.position.set(0.18, (R * 1.45) + 0.55, 0.12);
        sailGroup.add(mast1);

        const mastGeo2 = new THREE.CylinderGeometry(0.05, 0.05, 0.80, 16);
        const mast2 = new THREE.Mesh(mastGeo2, this.detailMat);
        mast2.position.set(-0.18, (R * 1.45) + 0.38, -0.12);
        sailGroup.add(mast2);

        this.hullGroup.add(sailGroup);

        // --- 7. ESQUELETO INTERNO: 6 CUADERNAS ANULARES ---
        const numRibs = 6;
        const ribGeo = new THREE.TorusGeometry(R * 0.95, 0.045, 16, 36);
        for (let i = 0; i < numRibs; i++) {
            const rib = new THREE.Mesh(ribGeo, this.detailMat);
            const zPos = -L / 2 + (L / (numRibs - 1)) * i;
            rib.position.z = zPos;
            this.internalGroup.add(rib);
        }

        // --- 8. TANQUES DE LASTRE MBT (PROA Y POPA) ---
        this.tankRadius = R * 0.60;
        this.tankLength = L * 0.28;

        // Cilíndros translúcidos suaves de tanque
        const tankVisGeo = new THREE.CylinderGeometry(this.tankRadius, this.tankRadius, this.tankLength, 24);

        const tankFront = new THREE.Mesh(tankVisGeo, this.tankShellMat);
        tankFront.rotation.x = Math.PI / 2;
        tankFront.position.z = L * 0.25;
        this.internalGroup.add(tankFront);

        const tankBack = new THREE.Mesh(tankVisGeo, this.tankShellMat);
        tankBack.rotation.x = Math.PI / 2;
        tankBack.position.z = -L * 0.25;
        this.internalGroup.add(tankBack);

        // Anillos metálicos de mamparo en los extremos de los tanques
        const bulkheadGeo = new THREE.TorusGeometry(this.tankRadius, 0.035, 12, 32);
        const bhFwd1 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhFwd1.position.z = L * 0.25 + this.tankLength / 2;
        this.internalGroup.add(bhFwd1);

        const bhFwd2 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhFwd2.position.z = L * 0.25 - this.tankLength / 2;
        this.internalGroup.add(bhFwd2);

        const bhAft1 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhAft1.position.z = -L * 0.25 + this.tankLength / 2;
        this.internalGroup.add(bhAft1);

        const bhAft2 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhAft2.position.z = -L * 0.25 - this.tankLength / 2;
        this.internalGroup.add(bhAft2);

        // Mallas de volumen de agua viva dentro de los tanques
        const waterGeo = new THREE.CylinderGeometry(this.tankRadius * 0.98, this.tankRadius * 0.98, this.tankLength * 0.98, 24);

        this.fwdWaterMesh = new THREE.Mesh(waterGeo, this.waterFillMat);
        this.fwdWaterMesh.rotation.x = Math.PI / 2;
        this.fwdWaterMesh.position.z = L * 0.25;
        this.internalGroup.add(this.fwdWaterMesh);

        this.aftWaterMesh = new THREE.Mesh(waterGeo, this.waterFillMat);
        this.aftWaterMesh.rotation.x = Math.PI / 2;
        this.aftWaterMesh.position.z = -L * 0.25;
        this.internalGroup.add(this.aftWaterMesh);

        // Superficies de nivel líquido horizontales
        const surfGeo = new THREE.PlaneGeometry(this.tankRadius * 1.85, this.tankLength * 0.96);
        surfGeo.rotateX(-Math.PI / 2);

        this.fwdWaterSurface = new THREE.Mesh(surfGeo, this.waterSurfaceMat);
        this.fwdWaterSurface.position.z = L * 0.25;
        this.internalGroup.add(this.fwdWaterSurface);

        this.aftWaterSurface = new THREE.Mesh(surfGeo, this.waterSurfaceMat);
        this.aftWaterSurface.position.z = -L * 0.25;
        this.internalGroup.add(this.aftWaterSurface);
    }

    /**
     * Construcción de Vectores 3D de Fuerza (Empuje verde y Peso rojo)
     */
    buildForceVectors() {
        this.buoyancyArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 2.0, 0),
            5.5,
            0x00e676,
            1.8,
            0.9
        );

        this.weightArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, -2.0, 0),
            5.5,
            0xff1744,
            1.8,
            0.9
        );

        this.vectorsGroup.add(this.buoyancyArrow);
        this.vectorsGroup.add(this.weightArrow);

        this.buoyancyLabel = this.createVectorSprite('Empuje (E)', '#00e676');
        this.weightLabel = this.createVectorSprite('Peso (W)', '#ff1744');

        this.buoyancyLabel.position.set(0, 8.5, 0);
        this.weightLabel.position.set(0, -8.5, 0);

        this.vectorsGroup.add(this.buoyancyLabel);
        this.vectorsGroup.add(this.weightLabel);
    }

    createVectorSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(6.5, 1.4, 1.0);
        return sprite;
    }

    setXrayMode(enabled) {
        if (enabled) {
            this.hullMat.opacity = 0.75;
            this.hullMat.transmission = 0.25;
        } else {
            this.hullMat.opacity = 0.95;
            this.hullMat.transmission = 0.05;
        }
    }

    update(dt) {
        const posY = Number.isFinite(this.state.y) ? this.state.y : -0.2;
        const pitchAngle = Number.isFinite(this.state.pitch) ? this.state.pitch : 0.0;

        // Mantener el submarino centrado en el visor en Z y X
        this.rootGroup.position.set(0, posY, 0);
        this.rootGroup.rotation.x = -pitchAngle;

        // Rotación de la hélice según RPM
        const rpm = Number.isFinite(this.state.propellerRPM) ? this.state.propellerRPM : 0.0;
        const rps = rpm / 60.0;
        const deltaT = Number.isFinite(dt) ? dt : 0.016;
        this.propellerGroup.rotation.z += rps * Math.PI * 2 * deltaT;

        // Planos de inmersión
        const diveAngle = Number.isFinite(this.state.divePlanesAngle) ? this.state.divePlanesAngle : 0.0;
        const planeRad = (diveAngle * Math.PI) / 180.0;
        this.fairwaterPlanesGroup.rotation.x = planeRad;

        // Dinámica de llenado de agua en los tanques
        const fwdRaw = Number.isFinite(this.state.fwdBallastPct) ? this.state.fwdBallastPct : 0.0;
        const aftRaw = Number.isFinite(this.state.aftBallastPct) ? this.state.aftBallastPct : 0.0;
        const fwdFrac = Math.max(0.01, Math.min(1.0, fwdRaw / 100.0));
        const aftFrac = Math.max(0.01, Math.min(1.0, aftRaw / 100.0));

        // Nivel vertical en el tanque
        const r = this.tankRadius;
        if (this.fwdWaterMesh) {
            // Longitud de tanque (eje Y local del cilindro rotado) se mantiene al 100%
            // Radio vertical (eje Z local) y transversal (eje X local) crecen con el llenado
            const scaleZ = Math.max(0.05, fwdFrac);
            const scaleX = Math.max(0.20, Math.sqrt(fwdFrac));
            this.fwdWaterMesh.scale.set(scaleX, 1.0, scaleZ);
            this.fwdWaterMesh.position.y = -r * 0.45 * (1.0 - scaleZ);

            // Plano superficial horizontal del agua
            const surfY = -r * 0.85 + (r * 1.70 * fwdFrac);
            this.fwdWaterSurface.position.y = surfY;
            this.fwdWaterSurface.scale.set(scaleX, 1.0, 1.0);
            this.fwdWaterSurface.visible = fwdRaw > 1.0;
        }

        if (this.aftWaterMesh) {
            const scaleZ = Math.max(0.05, aftFrac);
            const scaleX = Math.max(0.20, Math.sqrt(aftFrac));
            this.aftWaterMesh.scale.set(scaleX, 1.0, scaleZ);
            this.aftWaterMesh.position.y = -r * 0.45 * (1.0 - scaleZ);

            const surfY = -r * 0.85 + (r * 1.70 * aftFrac);
            this.aftWaterSurface.position.y = surfY;
            this.aftWaterSurface.scale.set(scaleX, 1.0, 1.0);
            this.aftWaterSurface.visible = aftRaw > 1.0;
        }

        // Vectores de fuerza
        this.vectorsGroup.visible = !!this.state.showForceVectors;
        if (this.vectorsGroup.visible) {
            const forceScale = 1.0 / 1200000.0;
            const minLen = 3.5;

            const bForce = Number.isFinite(this.state.buoyancyForce) ? this.state.buoyancyForce : 8.1e6;
            const wForce = Number.isFinite(this.state.weightForce) ? this.state.weightForce : 7.9e6;

            const eLen = Math.max(minLen, Math.min(18.0, bForce * forceScale));
            this.buoyancyArrow.setLength(eLen, Math.min(1.8, eLen * 0.25), 0.8);
            this.buoyancyLabel.position.set(0, eLen + 3.0, 0);

            const wLen = Math.max(minLen, Math.min(18.0, wForce * forceScale));
            this.weightArrow.setLength(wLen, Math.min(1.8, wLen * 0.25), 0.8);
            this.weightLabel.position.set(0, -(wLen + 3.0), 0);
        }
    }
}
