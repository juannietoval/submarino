/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * SubmarineModel.js - Modelo 3D de Alta Fidelidad y Ecosistema de Lastre
 * Basado en la referencia técnica oficial UTP:
 * - Casco cilíndrico de acrílico ultra-translúcido cristalino
 * - Proa hemisférica lisa en titanio/acero satinado cepillado
 * - Vela hidrodinámica con timones de inmersión y mástiles
 * - Depósito cilíndrico de aire comprimido (soplado) superior
 * - Mamparos estancos y pasamuros con racks de baterías y electrónica
 * - Tanques de lastre de proa y popa a sección completa de casco
 * - Válvulas de inundación, purga (venteo) y evacuación con volantes rojos
 * - Bomba de evacuación industrial azul
 * - Hélice propulsora de 7 palas en bronce naval y timones cruciformes
 * - Etiquetas técnicas 3D coincidentes con el diagrama educativo UTP
 */

import * as THREE from 'three';
import { SUBMARINE_CONSTANTS } from '../config/constants.js';

export class SubmarineModel {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        // Dimensiones base del submarino (Escala didáctica normalizada)
        this.SUB_RADIUS = 1.5;
        this.SUB_LENGTH = 13.0;
        this.hullCylLen = this.SUB_LENGTH - (this.SUB_RADIUS * 2.0); // 10.0 m
        this.tailLen = this.SUB_RADIUS * 2.0; // 3.0 m

        this.rootGroup = new THREE.Group();
        this.hullGroup = new THREE.Group();
        this.internalGroup = new THREE.Group();
        this.sailGroup = new THREE.Group();
        this.propellerGroup = new THREE.Group();
        this.fairwaterPlanesGroup = new THREE.Group();
        this.vectorsGroup = new THREE.Group();
        this.calloutsGroup = new THREE.Group();

        this.shockwaveProgress = 1.0;
        this.implosionT = 0.0;

        this.initMaterials();
        this.initShockwave();
        this.buildSubmarine();
        this.buildForceVectors();
        this.buildCalloutLabels();

        // Grupos en coordenadas canónicas (Proa = +Z, Popa = -Z, Babor = +X)

        this.rootGroup.add(this.internalGroup);
        this.rootGroup.add(this.hullGroup);
        this.rootGroup.add(this.vectorsGroup);
        this.rootGroup.add(this.calloutsGroup);

        this.scene.add(this.rootGroup);

        // Suscripción a eventos de física para animaciones reactivas
        if (this.state && typeof this.state.on === 'function') {
            this.state.on('reset', () => this.resetVisuals());
            this.state.on('implosion', () => this.triggerImplosionEffect());
        }
    }

    /**
     * Inicialización de Materiales PBR Navales calibrados a la referencia UTP
     */
    initMaterials() {
        // 1. Titanio / Acero naval satinado cepillado (Proa, popa, vela, timones)
        this.steelBodyMat = new THREE.MeshStandardMaterial({
            color: 0x54667a, // Titanio / acero naval satinado de alta calidad
            metalness: 0.72,
            roughness: 0.32,
        });

        // 2. Acero pulido claro (Bridas de unión, pasamuros, herrajes)
        this.detailMat = new THREE.MeshStandardMaterial({
            color: 0xcfd8dc,
            metalness: 0.85,
            roughness: 0.22,
        });

        // 3. Bronce naval pulido (Hélice propulsora de 7 palas, bujes)
        this.bronzeMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.90,
            roughness: 0.22,
        });

        // 4. Acero inoxidable de tuberías y pasamuros
        this.pipeMat = new THREE.MeshStandardMaterial({
            color: 0xb0c4de,
            metalness: 0.88,
            roughness: 0.20,
        });

        // 5. Depósito cilíndrico de aire comprimido (Aluminio plateado brillante cepillado)
        this.airTankMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            metalness: 0.92,
            roughness: 0.16,
        });

        // 6. Volantes de válvulas de maniobra (Rojo industrial vibrante)
        this.valveRedMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.30,
            metalness: 0.30,
        });

        // 7. Bomba de evacuación / Motor eléctrico (Azul industrial de la referencia UTP)
        this.pumpBlueMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.30,
            metalness: 0.40,
        });

        // 8. Módulos de baterías (Slate oscuro industrial con bornes)
        this.batteryMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.40,
            metalness: 0.35,
        });

        // 9. Casco Cilíndrico Translúcido (Acrílico marino cristalino con alta reflectividad y transparencia)
        this.hullMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.03,
            roughness: 0.04,
            transmission: 0.88,
            thickness: 0.35,
            ior: 1.49,
            reflectivity: 0.95,
            transparent: true,
            opacity: 0.26,
            side: THREE.FrontSide,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            depthWrite: false,
        });

        // 10. Fluido de agua viva en los tanques (Turquesa / Cian marino luminoso)
        this.waterFillMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.18,
            roughness: 0.10,
            metalness: 0.08,
            side: THREE.DoubleSide,
        });

        // Planos de corte físico para tanques de lastre de proa y popa
        this.fwdClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
        this.aftClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

        this.fwdWaterMat = this.waterFillMat.clone();
        this.fwdWaterMat.clippingPlanes = [this.fwdClipPlane];
        this.fwdWaterMat.clipShadows = true;

        this.aftWaterMat = this.waterFillMat.clone();
        this.aftWaterMat.clippingPlanes = [this.aftClipPlane];
        this.aftWaterMat.clipShadows = true;

        // Superficie líquida horizontal (Menisco dinámico)
        this.waterSurfaceMat = new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            emissive: 0x0369a1,
            emissiveIntensity: 0.28,
            roughness: 0.06,
            metalness: 0.10,
            side: THREE.DoubleSide,
        });

        // Rejilla de piso antideslizante interior
        this.walkwayMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            metalness: 0.65,
            roughness: 0.40,
        });

        // Tira de iluminación LED interior
        this.interiorLedMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.85,
            roughness: 0.2,
        });
    }

    /**
     * Malla de onda de choque expansiva para la implosión catastrófica
     */
    initShockwave() {
        const shockGeo = new THREE.SphereGeometry(1.0, 32, 24);
        this.shockwaveMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.0,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.shockwaveMesh = new THREE.Mesh(shockGeo, this.shockwaveMat);
        this.shockwaveMesh.visible = false;
        this.scene.add(this.shockwaveMesh);
    }

    /**
     * Disparador del efecto de onda de choque por aplastamiento hidrostático
     */
    triggerImplosionEffect() {
        if (this.shockwaveMesh) {
            this.shockwaveMesh.position.set(0, this.state.y, 0);
            this.shockwaveMesh.scale.set(1.0, 1.0, 1.0);
            this.shockwaveMesh.visible = true;
            this.shockwaveProgress = 0.0;
        }
    }

    /**
     * Restaura la geometría prístina y propiedades de los materiales tras un reinicio
     */
    resetVisuals() {
        this.implosionT = 0.0;
        this.shockwaveProgress = 1.0;
        const R = this.SUB_RADIUS;
        const L = this.hullCylLen;
        const T = this.tailLen;

        if (this.mainHull) {
            this.mainHull.scale.set(1.0, 1.0, 1.0);
            this.mainHull.position.set(0, 0, 0);
            this.mainHull.rotation.set(Math.PI / 2, 0, 0);
        }
        if (this.nose) {
            this.nose.position.set(0, 0, L / 2);
            this.nose.rotation.set(Math.PI / 2, 0, 0);
            this.nose.scale.set(1.0, 1.0, 1.0);
        }
        if (this.tail) {
            this.tail.position.set(0, 0, -(L / 2 + T / 2));
            this.tail.rotation.set(Math.PI / 2, 0, 0);
            this.tail.scale.set(1.0, 1.0, 1.0);
        }
        if (this.shaftCasing) {
            this.shaftCasing.position.set(0, 0, -(L / 2 + T + 0.17));
            this.shaftCasing.rotation.set(Math.PI / 2, 0, 0);
        }
        if (this.propellerGroup) {
            this.propellerGroup.position.set(0, 0, -(L / 2 + T + 0.35));
            this.propellerGroup.rotation.set(0, 0, 0);
        }
        if (this.fwdFlange) {
            this.fwdFlange.scale.set(1.0, 1.0, 1.0);
            this.fwdFlange.position.set(0, 0, L / 2);
            this.fwdFlange.rotation.set(0, 0, 0);
        }
        if (this.aftFlange) {
            this.aftFlange.scale.set(1.0, 1.0, 1.0);
            this.aftFlange.position.set(0, 0, -L / 2);
            this.aftFlange.rotation.set(0, 0, 0);
        }
        if (this.internalGroup) {
            this.internalGroup.scale.set(1.0, 1.0, 1.0);
            this.internalGroup.position.set(0, 0, 0);
            this.internalGroup.rotation.set(0, 0, 0);
        }
        if (this.ventralGroup) {
            this.ventralGroup.scale.set(1.0, 1.0, 1.0);
            this.ventralGroup.position.set(0, 0, 0);
        }
        if (this.sailGroup) {
            this.sailGroup.rotation.set(0, 0, 0);
            this.sailGroup.position.set(0, R * 0.70, 0.65);
        }
        if (this.fwdWaterMesh) {
            this.fwdWaterMesh.scale.set(1.0, 1.0, 1.0);
        }
        if (this.aftWaterMesh) {
            this.aftWaterMesh.scale.set(1.0, 1.0, 1.0);
        }
        if (this.calloutsGroup) {
            this.calloutsGroup.visible = (this.state.showCallouts !== false);
        }
        if (this.shockwaveMesh) {
            this.shockwaveMesh.visible = false;
        }
        if (this.hullMat) {
            this.hullMat.color.setHex(0xffffff);
            this.hullMat.roughness = 0.04;
            this.hullMat.metalness = 0.03;
            this.hullMat.transmission = 0.88;
            this.hullMat.opacity = 0.26;
            this.hullMat.clearcoat = 1.0;
        }
    }

    /**
     * Construcción de la Arquitectura Completa del Submarino
     */
    buildSubmarine() {
        const R = this.SUB_RADIUS;
        const L = this.hullCylLen;
        const T = this.tailLen;

        // 1. Estructura exterior (Casco transparente, juntas, proa lisa y popa)
        this.buildOuterHull(R, L, T);

        // 2. Vela hidrodinámica limpia Albacore y planos de inmersión en la vela
        this.buildHydrodynamicSail(R, L);

        // 3. Propulsión y empenaje de popa (Hélice 7 palas y timones en cruz)
        this.buildSternPropulsionAndEmpennage(R, L, T);

        // 4. Ecosistema mecánico interior (Mamparos, rack de baterías, depósito aire, bombas y tuberías)
        this.buildInternalFrameworkAndMechanisms(R, L);

        // 5. Tanques de lastre a sección completa (Proa y Popa)
        this.buildBallastTanks(R, L);

        // 6. Partículas de agitación y aeración interna en los tanques
        this.initInternalTankAeration();
    }

    /**
     * 1. Casco Exterior con Anillos de Unión Estancos, Proa Lisa y Válvula de Purga
     */
    buildOuterHull(R, L, T) {
        // A. Casco Central Cilíndrico Ultra-Translúcido
        const mainHullGeo = new THREE.CylinderGeometry(R, R, L, 48);
        this.mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
        this.mainHull.rotation.x = Math.PI / 2;
        this.mainHull.renderOrder = 10; // Garantiza pase de transmisión posterior a fluidos internos
        this.hullGroup.add(this.mainHull);

        // B. Anillos de Brida Reforzada (Juntas estancas entre acrílico y acero)
        const flangeGeo = new THREE.TorusGeometry(R * 1.015, 0.045, 16, 48);
        this.fwdFlange = new THREE.Mesh(flangeGeo, this.detailMat);
        this.fwdFlange.position.z = L / 2;
        this.hullGroup.add(this.fwdFlange);

        this.aftFlange = new THREE.Mesh(flangeGeo, this.detailMat);
        this.aftFlange.position.z = -L / 2;
        this.hullGroup.add(this.aftFlange);

        // C. Proa Hemisférica Lisa en Titanio/Acero Satinado (+Z)
        const noseGeo = new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
        this.nose = new THREE.Mesh(noseGeo, this.steelBodyMat);
        this.nose.rotation.x = Math.PI / 2;
        this.nose.position.z = L / 2;
        this.hullGroup.add(this.nose);

        // D. Válvula de Purga de Aire (Venteo) en la cumbre del casco sobre el tanque de proa
        const ventZ = 3.45; // Sobre el tanque de proa
        const ventGroup = new THREE.Group();
        ventGroup.position.set(0, R, ventZ);

        const ventNipple = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16), this.detailMat);
        ventNipple.position.y = 0.11;
        ventGroup.add(ventNipple);

        const ventKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.08, 16), this.steelBodyMat);
        ventKnob.position.y = 0.24;
        ventGroup.add(ventKnob);

        const ventCollar = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16), this.detailMat);
        ventCollar.rotation.x = Math.PI / 2;
        ventCollar.position.y = 0.16;
        ventGroup.add(ventCollar);

        this.hullGroup.add(ventGroup);

        // E. Popa Cónica Hidrodinámica en Acero (-Z)
        const tailGeo = new THREE.CylinderGeometry(R, R * 0.26, T, 48);
        this.tail = new THREE.Mesh(tailGeo, this.steelBodyMat);
        this.tail.rotation.x = Math.PI / 2;
        this.tail.position.z = -(L / 2 + T / 2);
        this.hullGroup.add(this.tail);

        // Casquillo de bocina del eje de la hélice
        const shaftCasingGeo = new THREE.CylinderGeometry(R * 0.26, R * 0.24, 0.35, 24);
        this.shaftCasing = new THREE.Mesh(shaftCasingGeo, this.detailMat);
        this.shaftCasing.rotation.x = Math.PI / 2;
        this.shaftCasing.position.z = -(L / 2 + T + 0.17);
        this.hullGroup.add(this.shaftCasing);
    }

    /**
     * 2. Vela Hidrodinámica Albacore y Planos de Inmersión NACA
     */
    buildHydrodynamicSail(R, L) {
        this.sailGroup.clear();
        this.sailGroup.position.set(0, R * 0.70, 0.65);

        const sailWidth = R * 0.58;
        const sailLength = R * 1.05; // 1.58m de cuerda hidrodinámica
        const sailHeight = R * 1.25;

        // Geometría extrusionada con perfil hidrodinámico teardrop (borde ataque curvo, borde fuga suave)
        const sailShape = new THREE.Shape();
        const halfW = sailWidth / 2;
        const halfL = sailLength / 2;

        sailShape.moveTo(0, halfL);
        sailShape.bezierCurveTo(halfW, halfL, halfW, halfL * 0.35, halfW, 0);
        sailShape.bezierCurveTo(halfW, -halfL * 0.45, halfW * 0.30, -halfL * 0.85, 0, -halfL);
        sailShape.bezierCurveTo(-halfW * 0.30, -halfL * 0.85, -halfW, -halfL * 0.45, -halfW, 0);
        sailShape.bezierCurveTo(-halfW, halfL * 0.35, -halfW, halfL, 0, halfL);

        const extrudeSettings = {
            steps: 1,
            depth: sailHeight,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.05,
            bevelSegments: 4,
        };

        const sailGeo = new THREE.ExtrudeGeometry(sailShape, extrudeSettings);
        sailGeo.rotateX(Math.PI / 2);
        sailGeo.center();

        const sailMesh = new THREE.Mesh(sailGeo, this.steelBodyMat);
        sailMesh.position.y = sailHeight / 2;
        this.sailGroup.add(sailMesh);

        // Cúpula superior de puente de mando
        const bridgeGeo = new THREE.SphereGeometry(halfW * 0.88, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const bridgeMesh = new THREE.Mesh(bridgeGeo, this.detailMat);
        bridgeMesh.position.set(0, sailHeight + 0.03, halfL * 0.20);
        bridgeMesh.scale.set(1.0, 0.40, 1.3);
        this.sailGroup.add(bridgeMesh);

        // Timones de Inmersión en la Vela con perfil hidroala NACA (Fairwater Planes)
        const planeSpan = 1.05;
        const planeChord = 0.52;
        const planeThick = 0.085;

        const planeShape = new THREE.Shape();
        planeShape.moveTo(0, planeChord * 0.5);
        planeShape.bezierCurveTo(planeThick, planeChord * 0.3, planeThick, 0, 0, -planeChord * 0.5);
        planeShape.bezierCurveTo(-planeThick * 0.6, -planeChord * 0.3, -planeThick * 0.6, planeChord * 0.2, 0, planeChord * 0.5);

        const planeExtrude = {
            steps: 1,
            depth: planeSpan,
            bevelEnabled: true,
            bevelThickness: 0.04,
            bevelSize: 0.03,
            bevelSegments: 3,
        };
        const planeGeo = new THREE.ExtrudeGeometry(planeShape, planeExtrude);
        planeGeo.rotateZ(Math.PI / 2);
        planeGeo.center();

        const planeLeft = new THREE.Mesh(planeGeo, this.steelBodyMat);
        planeLeft.position.set(halfW + planeSpan / 2 + 0.02, sailHeight * 0.52, 0);
        this.fairwaterPlanesGroup.add(planeLeft);

        const planeRight = new THREE.Mesh(planeGeo, this.steelBodyMat);
        planeRight.position.set(-(halfW + planeSpan / 2 + 0.02), sailHeight * 0.52, 0);
        this.fairwaterPlanesGroup.add(planeRight);

        const planeShaftGeo = new THREE.CylinderGeometry(0.05, 0.05, halfW * 2 + 0.12, 16);
        const planeShaft = new THREE.Mesh(planeShaftGeo, this.detailMat);
        planeShaft.rotation.z = Math.PI / 2;
        planeShaft.position.set(0, sailHeight * 0.52, 0);
        this.fairwaterPlanesGroup.add(planeShaft);

        this.sailGroup.add(this.fairwaterPlanesGroup);

        // 3 Mástiles Verticales Retráctiles (Periscopios y radar) idénticos al esquema UTP
        const mastGeo1 = new THREE.CylinderGeometry(0.04, 0.04, 1.15, 16);
        const mast1 = new THREE.Mesh(mastGeo1, this.detailMat);
        mast1.position.set(0, sailHeight + 0.58, halfL * 0.15);
        const opticHead1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.14, 16), this.steelBodyMat);
        opticHead1.position.set(0, sailHeight + 1.18, halfL * 0.15);
        this.sailGroup.add(mast1);
        this.sailGroup.add(opticHead1);

        const mastGeo2 = new THREE.CylinderGeometry(0.04, 0.04, 0.95, 16);
        const mast2 = new THREE.Mesh(mastGeo2, this.detailMat);
        mast2.position.set(0, sailHeight + 0.48, -halfL * 0.10);
        const opticHead2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.14, 16), this.steelBodyMat);
        opticHead2.position.set(0, sailHeight + 0.98, -halfL * 0.10);
        this.sailGroup.add(mast2);
        this.sailGroup.add(opticHead2);

        const mastGeo3 = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 16);
        const mast3 = new THREE.Mesh(mastGeo3, this.detailMat);
        mast3.position.set(0, sailHeight + 0.38, -halfL * 0.35);
        const opticHead3 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.14, 16), this.steelBodyMat);
        opticHead3.position.set(0, sailHeight + 0.78, -halfL * 0.35);
        this.sailGroup.add(mast3);
        this.sailGroup.add(opticHead3);

        this.hullGroup.add(this.sailGroup);
    }

    /**
     * 3. Hélice Naval Skewed de 7 Palas y Timones Cruciformes
     */
    buildSternPropulsionAndEmpennage(R, L, T) {
        // A. Timones Cruciformes
        const finZ = -(L / 2 + T * 0.50);
        const finHeight = R * 0.95;
        const finLength = T * 0.65;

        // Aleta vertical superior (Borde de ataque biselado como en la referencia)
        const vFinGeo = new THREE.BoxGeometry(0.09, finHeight, finLength);
        const vFinTop = new THREE.Mesh(vFinGeo, this.steelBodyMat);
        vFinTop.position.set(0, R * 0.65, finZ);
        this.hullGroup.add(vFinTop);

        // Aleta vertical inferior
        const vFinBot = new THREE.Mesh(vFinGeo, this.steelBodyMat);
        vFinBot.position.set(0, -R * 0.65, finZ);
        this.hullGroup.add(vFinBot);

        // Aletas horizontales
        const hFinGeo = new THREE.BoxGeometry(finHeight * 1.90, 0.09, finLength);
        const hFin = new THREE.Mesh(hFinGeo, this.steelBodyMat);
        hFin.position.set(0, 0, finZ);
        this.hullGroup.add(hFin);

        // B. Hélice Naval Skewed en Bronce
        const propZ = -(L / 2 + T + 0.35);
        this.propellerGroup.position.set(0, 0, propZ);

        // Cono de ojiva en bronce
        const hubGeo = new THREE.ConeGeometry(R * 0.24, 0.60, 24);
        hubGeo.rotateX(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, this.bronzeMat);
        this.propellerGroup.add(hub);

        const hubRingGeo = new THREE.CylinderGeometry(R * 0.24, R * 0.24, 0.12, 24);
        hubRingGeo.rotateX(Math.PI / 2);
        const hubRing = new THREE.Mesh(hubRingGeo, this.detailMat);
        hubRing.position.z = 0.20;
        this.propellerGroup.add(hubRing);

        const numBlades = 7;
        const bladeRadius = R * 0.90;
        const bladeWidth = 0.38;

        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.bezierCurveTo(bladeWidth * 0.65, bladeRadius * 0.25, bladeWidth * 0.95, bladeRadius * 0.65, bladeWidth * 0.35, bladeRadius);
        bladeShape.bezierCurveTo(0, bladeRadius * 0.95, -bladeWidth * 0.40, bladeRadius * 0.65, -bladeWidth * 0.25, bladeRadius * 0.30);
        bladeShape.bezierCurveTo(-bladeWidth * 0.15, bladeRadius * 0.10, -0.05, 0.05, 0, 0);

        const bladeExtrude = {
            steps: 1,
            depth: 0.03,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.01,
            bevelSegments: 2,
        };
        const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrude);
        bladeGeo.center();

        for (let i = 0; i < numBlades; i++) {
            const blade = new THREE.Mesh(bladeGeo, this.bronzeMat);
            const phi = (Math.PI * 2 / numBlades) * i;
            blade.position.z = -0.16;
            blade.rotation.z = phi;
            blade.rotation.y = 0.40;
            blade.rotation.x = 0.14;
            this.propellerGroup.add(blade);
        }

        this.hullGroup.add(this.propellerGroup);
    }

    /**
     * 4. Ecosistema Mecánico Interior Completo (El Mecanismo de Hundimiento)
     * Exactamente como en el diagrama técnico UTP:
     * - Mamparos y Pasamuros Estancos
     * - Depósito Cilíndrico Superior de Aire Comprimido (Soplado)
     * - Rack de Baterías y Electrónica en bandeja inferior
     * - Bomba Eléctrica de Evacuación Azul
     * - Válvulas de Inundación y Evacuación con Volantes Rojos
     * - Tuberías de distribución y soplado
     */
    buildInternalFrameworkAndMechanisms(R, L) {
        this.ventralGroup = new THREE.Group();

        // A. Mamparos y Pasamuros Estancos (Circular bulkheads with ports)
        const bulkheadRadius = R * 0.965;
        const portalRadius = bulkheadRadius * 0.50; // Paso circular amplio

        const bulkheadShape = new THREE.Shape();
        bulkheadShape.absarc(0, 0, bulkheadRadius, 0, Math.PI * 2, false);

        // Agujero central
        const holePath = new THREE.Path();
        holePath.absarc(0, -0.05, portalRadius, 0, Math.PI * 2, true);
        bulkheadShape.holes.push(holePath);

        // Pasamuros superior para tubería de aire de soplado
        const airHole = new THREE.Path();
        airHole.absarc(0, R * 0.70, 0.065, 0, Math.PI * 2, true);
        bulkheadShape.holes.push(airHole);

        // Pasamuros inferior para tubería de agua
        const waterHole = new THREE.Path();
        waterHole.absarc(0, -R * 0.78, 0.08, 0, Math.PI * 2, true);
        bulkheadShape.holes.push(waterHole);

        const bulkheadExtrude = {
            steps: 1,
            depth: 0.10,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.015,
            bevelSegments: 2,
        };
        const bulkheadGeo = new THREE.ExtrudeGeometry(bulkheadShape, bulkheadExtrude);
        bulkheadGeo.center();

        // 1. Mamparo Estanco Proel (+Z = 1.40 m)
        const fwdBulkhead = new THREE.Mesh(bulkheadGeo, this.steelBodyMat);
        fwdBulkhead.position.z = 1.40;
        this.buildBulkheadTrim(fwdBulkhead, bulkheadRadius, portalRadius);
        this.internalGroup.add(fwdBulkhead);

        // 2. Mamparo Estanco Popel (-Z = -1.40 m)
        const aftBulkhead = new THREE.Mesh(bulkheadGeo, this.steelBodyMat);
        aftBulkhead.position.z = -1.40;
        this.buildBulkheadTrim(aftBulkhead, bulkheadRadius, portalRadius);
        this.internalGroup.add(aftBulkhead);

        // B. Bandeja de Piso de Rejilla Metálica entre mamparos
        const deckGeo = new THREE.BoxGeometry(R * 1.15, 0.035, 2.65);
        const deckMesh = new THREE.Mesh(deckGeo, this.walkwayMat);
        deckMesh.position.set(0, -R * 0.58, 0);
        this.internalGroup.add(deckMesh);

        // C. Rack de Módulos de Baterías (Grid ordenado de celdas industriales de potencia)
        const batteryGroup = new THREE.Group();
        batteryGroup.position.set(0, -R * 0.58 + 0.18, -0.20);

        const cellW = 0.28;
        const cellH = 0.32;
        const cellD = 0.44;
        const cellGeo = new THREE.BoxGeometry(cellW, cellH, cellD);
        const termGeo = new THREE.BoxGeometry(cellW * 0.85, 0.025, cellD * 0.85);

        // 2 filas de 4 módulos (8 baterías en total)
        for (let row = 0; row < 2; row++) {
            const rx = (row === 0 ? -0.22 : 0.22);
            for (let col = 0; col < 4; col++) {
                const rz = -0.75 + col * 0.50;

                const cell = new THREE.Mesh(cellGeo, this.batteryMat);
                cell.position.set(rx, 0, rz);
                batteryGroup.add(cell);

                const term = new THREE.Mesh(termGeo, this.detailMat);
                term.position.set(rx, cellH / 2 + 0.015, rz);
                batteryGroup.add(term);
            }
        }
        this.internalGroup.add(batteryGroup);

        // D. Depósito Cilíndrico de Aire Comprimido (Soplado) - UN depósito superior central
        const airTankGroup = new THREE.Group();
        const tankR = 0.22;
        const tankL = 1.35;
        airTankGroup.position.set(0, R * 0.46, -0.25);

        // Cuerpo cilíndrico plateado
        const tankBodyGeo = new THREE.CylinderGeometry(tankR, tankR, tankL, 24);
        tankBodyGeo.rotateX(Math.PI / 2);
        const tankBody = new THREE.Mesh(tankBodyGeo, this.airTankMat);
        airTankGroup.add(tankBody);

        // Tapas hemisféricas redondeadas
        const capGeo = new THREE.SphereGeometry(tankR, 20, 14);
        const fwdCap = new THREE.Mesh(capGeo, this.airTankMat);
        fwdCap.position.z = tankL / 2;
        airTankGroup.add(fwdCap);

        const aftCap = new THREE.Mesh(capGeo, this.airTankMat);
        aftCap.position.z = -tankL / 2;
        airTankGroup.add(aftCap);

        // Cunas de montaje de acero al chasis
        const cradleGeo = new THREE.BoxGeometry(0.55, 0.045, 0.08);
        const cradleFwd = new THREE.Mesh(cradleGeo, this.detailMat);
        cradleFwd.position.set(0, -tankR - 0.02, 0.35);
        airTankGroup.add(cradleFwd);

        const cradleAft = new THREE.Mesh(cradleGeo, this.detailMat);
        cradleAft.position.set(0, -tankR - 0.02, -0.35);
        airTankGroup.add(cradleAft);

        // Manifold de control y válvula superior en T
        const tManifoldGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.20, 16);
        const tManifold = new THREE.Mesh(tManifoldGeo, this.detailMat);
        tManifold.position.set(0, tankR + 0.10, 0);
        airTankGroup.add(tManifold);

        this.internalGroup.add(airTankGroup);

        // E. Red de Tuberías Neumáticas de Soplado (Acero inoxidable / cromo pulido)
        const pipeRadius = 0.034;

        // Tubería de alta presión que sale del manifold superior hacia el mamparo popel (-Z)
        const airLineGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 2.65, 16);
        airLineGeo.rotateX(Math.PI / 2);
        const airLine = new THREE.Mesh(airLineGeo, this.pipeMat);
        airLine.position.set(0, R * 0.70, -1.60);
        this.internalGroup.add(airLine);

        // Codo de bajada que inyecta aire al tanque de popa
        const aftElbowGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.45, 16);
        const aftElbow = new THREE.Mesh(aftElbowGeo, this.pipeMat);
        aftElbow.position.set(0, R * 0.48, -2.90);
        this.internalGroup.add(aftElbow);

        // Tuberías de distribución interna que pasan por el mamparo proel (+Z)
        const fwdDistPipeGeo = new THREE.CylinderGeometry(pipeRadius * 1.1, pipeRadius * 1.1, 1.8, 16);
        fwdDistPipeGeo.rotateX(Math.PI / 2);
        const fwdDistPipe = new THREE.Mesh(fwdDistPipeGeo, this.pipeMat);
        fwdDistPipe.position.set(-0.35, -R * 0.35, 1.6);
        this.internalGroup.add(fwdDistPipe);

        // F. Bomba Eléctrica de Evacuación / Achique (Cilindro azul en el tanque de popa de la referencia UTP)
        const pumpGroup = new THREE.Group();
        // Ubicada exactamente en el compartimento de popa (-Z) justo tras el mamparo estanco popel
        pumpGroup.position.set(0.25, -R * 0.48, -1.95);

        const motorBodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.42, 24);
        motorBodyGeo.rotateX(Math.PI / 2);
        const motorBody = new THREE.Mesh(motorBodyGeo, this.pumpBlueMat);
        pumpGroup.add(motorBody);

        const pumpHeadGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.18, 24);
        pumpHeadGeo.rotateX(Math.PI / 2);
        const pumpHead = new THREE.Mesh(pumpHeadGeo, this.detailMat);
        pumpHead.position.z = -0.28;
        pumpGroup.add(pumpHead);

        const pumpBaseGeo = new THREE.BoxGeometry(0.28, 0.05, 0.44);
        const pumpBase = new THREE.Mesh(pumpBaseGeo, this.detailMat);
        pumpBase.position.y = -0.16;
        pumpGroup.add(pumpBase);

        // Tubería de succión de la bomba hacia el fondo del tanque
        const pumpSuctionGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, 0.32, 16);
        const pumpSuction = new THREE.Mesh(pumpSuctionGeo, this.pipeMat);
        pumpSuction.position.set(0, -0.28, -0.28);
        pumpGroup.add(pumpSuction);

        this.internalGroup.add(pumpGroup);

        // G. VÁLVULA DE INUNDACIÓN (1) con Volante Rojo bajo el tanque de proa
        const floodValveGroup = new THREE.Group();
        floodValveGroup.position.set(0, -R - 0.06, 2.40);

        // Tramo de tubería vertical desde el fondo del casco
        const fwdPipeL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 16), this.pipeMat);
        fwdPipeL1.position.set(0, 0.20, 0.60);
        floodValveGroup.add(fwdPipeL1);

        // Tramo horizontal con la válvula
        const fwdPipeL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.40, 16), this.pipeMat);
        fwdPipeL2.rotateX(Math.PI / 2);
        fwdPipeL2.position.set(0, -0.01, 0.0);
        floodValveGroup.add(fwdPipeL2);

        // Subida al casco
        const fwdPipeL3 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 16), this.pipeMat);
        fwdPipeL3.position.set(0, 0.18, -0.65);
        floodValveGroup.add(fwdPipeL3);

        // Volante de válvula rojo orientado hacia el observador (+X) para máxima visibilidad
        const wheelGeo = new THREE.TorusGeometry(0.13, 0.022, 12, 24);
        wheelGeo.rotateY(Math.PI / 2); // Orientación normal al eje X
        const fwdWheel = new THREE.Mesh(wheelGeo, this.valveRedMat);
        fwdWheel.position.set(0.16, -0.01, 0.0);
        floodValveGroup.add(fwdWheel);

        const wheelStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), this.detailMat);
        wheelStem.rotation.z = Math.PI / 2;
        wheelStem.position.set(0.08, -0.01, 0.0);
        floodValveGroup.add(wheelStem);

        this.ventralGroup.add(floodValveGroup);

        // H. VÁLVULA DE EVACUACIÓN (2) con Volante Rojo bajo el tanque de popa
        const evacValveGroup = new THREE.Group();
        evacValveGroup.position.set(0, -R - 0.06, -2.40);

        const aftPipeL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 16), this.pipeMat);
        aftPipeL1.position.set(0, 0.20, -0.60);
        evacValveGroup.add(aftPipeL1);

        const aftPipeL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.40, 16), this.pipeMat);
        aftPipeL2.rotateX(Math.PI / 2);
        aftPipeL2.position.set(0, -0.01, 0.0);
        evacValveGroup.add(aftPipeL2);

        const aftPipeL3 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 16), this.pipeMat);
        aftPipeL3.position.set(0, 0.18, 0.65);
        evacValveGroup.add(aftPipeL3);

        const aftWheel = new THREE.Mesh(wheelGeo, this.valveRedMat);
        aftWheel.position.set(0.16, -0.01, 0.0);
        evacValveGroup.add(aftWheel);

        const aftStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), this.detailMat);
        aftStem.rotation.z = Math.PI / 2;
        aftStem.position.set(0.08, -0.01, 0.0);
        evacValveGroup.add(aftStem);

        this.ventralGroup.add(evacValveGroup);

        this.hullGroup.add(this.ventralGroup);
    }

    /**
     * Adornos de anillos y pernos en los mamparos estancos
     */
    buildBulkheadTrim(bulkheadMesh, radius, portalRadius) {
        const ringGeo = new THREE.TorusGeometry(portalRadius, 0.035, 12, 32);
        const ring = new THREE.Mesh(ringGeo, this.detailMat);
        bulkheadMesh.add(ring);

        const outerRingGeo = new THREE.TorusGeometry(radius * 0.98, 0.025, 10, 36);
        const outerRing = new THREE.Mesh(outerRingGeo, this.detailMat);
        bulkheadMesh.add(outerRing);
    }

    /**
     * 5. Tanques de Lastre Principal a Sección Completa (Proa y Popa)
     * En la referencia UTP, el agua ocupa la sección completa del casco cilíndrico
     * entre la proa y el mamparo proel (+Z), y entre el mamparo popel y la popa (-Z).
     */
    buildBallastTanks(R, L) {
        this.tankRadius = R * 0.965; // Ocupa toda la sección útil del acrílico
        const rEff = this.tankRadius * 0.99;

        // Longitud del compartimento de tanques (entre mamparo y bridas extremas)
        const tankLength = 3.50;
        this.tankLength = tankLength;
        const fwdZ = 3.20;
        const aftZ = -3.20;

        // Malla de fluido cilíndrica de Proa
        const fwdWaterGeo = new THREE.CylinderGeometry(rEff, rEff, tankLength, 48);
        fwdWaterGeo.rotateX(Math.PI / 2);

        this.fwdWaterMesh = new THREE.Mesh(fwdWaterGeo, this.fwdWaterMat);
        this.fwdWaterMesh.renderOrder = 2;
        this.fwdWaterMesh.position.set(0, 0, fwdZ);
        this.internalGroup.add(this.fwdWaterMesh);

        // Malla de fluido cilíndrica de Popa
        const aftWaterGeo = new THREE.CylinderGeometry(rEff, rEff, tankLength, 48);
        aftWaterGeo.rotateX(Math.PI / 2);

        this.aftWaterMesh = new THREE.Mesh(aftWaterGeo, this.aftWaterMat);
        this.aftWaterMesh.renderOrder = 2;
        this.aftWaterMesh.position.set(0, 0, aftZ);
        this.internalGroup.add(this.aftWaterMesh);

        // Superficie líquida horizontal (Menisco dinámico transversal a sección completa)
        const surfGeo1 = new THREE.PlaneGeometry(rEff * 2.0, tankLength, 24, 24);
        surfGeo1.rotateX(-Math.PI / 2);

        this.fwdWaterSurface = new THREE.Mesh(surfGeo1, this.waterSurfaceMat);
        this.fwdWaterSurface.renderOrder = 3;
        this.fwdWaterSurface.position.set(0, 0, fwdZ);
        this.internalGroup.add(this.fwdWaterSurface);

        const surfGeo2 = new THREE.PlaneGeometry(rEff * 2.0, tankLength, 24, 24);
        surfGeo2.rotateX(-Math.PI / 2);

        this.aftWaterSurface = new THREE.Mesh(surfGeo2, this.waterSurfaceMat);
        this.aftWaterSurface.renderOrder = 3;
        this.aftWaterSurface.position.set(0, 0, aftZ);
        this.internalGroup.add(this.aftWaterSurface);
    }

    /**
     * Partículas dinámicas de aeración y turbulencia dentro de los tanques de lastre
     */
    initInternalTankAeration() {
        const count = 120;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const offsets = new Float32Array(count * 3);

        const R = this.SUB_RADIUS;
        const tankL = this.tankLength || 3.50;

        for (let i = 0; i < count; i++) {
            const isFwd = i < count / 2;
            const zBase = isFwd ? 3.20 : -3.20;

            const rx = (Math.random() - 0.5) * (R * 1.4);
            const ry = -R * 0.4 + (Math.random() - 0.5) * (R * 0.8);
            const rz = zBase + (Math.random() - 0.5) * (tankL * 0.85);

            positions[i * 3] = rx;
            positions[i * 3 + 1] = ry;
            positions[i * 3 + 2] = rz;

            offsets[i * 3] = rx;
            offsets[i * 3 + 1] = ry;
            offsets[i * 3 + 2] = rz;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 14);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        g.addColorStop(0.4, 'rgba(100, 235, 255, 0.7)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
        const tex = new THREE.CanvasTexture(canvas);

        this.internalAerationMat = new THREE.PointsMaterial({
            size: 0.22,
            map: tex,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.internalAerationPoints = new THREE.Points(geom, this.internalAerationMat);
        this.internalAerationPoints.renderOrder = 4;
        this.internalAerationOffsets = offsets;
        this.internalGroup.add(this.internalAerationPoints);
    }

    /**
     * Construcción de Etiquetas Técnicas 3D y Líneas de Guía Coincidentes con la Referencia UTP
     */
    buildCalloutLabels() {
        this.calloutsGroup.clear();
        const R = this.SUB_RADIUS;

        // 8 Etiquetas técnicas exactas con líneas de guía coincidentes con el diagrama técnico UTP
        // Coordenadas calibradas para vista isométrica y lateral desde el cuadrante del usuario (+X)
        const annotations = [
            {
                text: 'Válvula de Purga de Aire (Venteo)',
                target: new THREE.Vector3(0, R + 0.28, 3.45),
                pos: new THREE.Vector3(1.8, R + 1.25, 3.6)
            },
            {
                text: 'Tanque de Proa',
                target: new THREE.Vector3(R * 0.7, 0.35, 3.2),
                pos: new THREE.Vector3(3.2, 0.75, 3.8)
            },
            {
                text: 'Tanque de Lastre de Inundación y Venteo',
                target: new THREE.Vector3(R * 0.75, -0.45, 3.2),
                pos: new THREE.Vector3(3.2, -R - 0.85, 3.4)
            },
            {
                text: 'VALVULA DE INUNDACIÓN (1)',
                target: new THREE.Vector3(0.35, -R - 0.24, 2.4),
                pos: new THREE.Vector3(1.6, -R - 0.95, 2.0)
            },
            {
                text: 'Depósito de Aire Comprimido (Soplado)',
                target: new THREE.Vector3(0, R * 0.46 + 0.16, -0.25),
                pos: new THREE.Vector3(0.8, R + 1.85, -0.2)
            },
            {
                text: 'Mamparos y Pasamuros Estancos',
                target: new THREE.Vector3(0.6, -0.2, 1.40),
                pos: new THREE.Vector3(1.6, -R - 0.85, 0.6)
            },
            {
                text: 'Tanque de Popa',
                target: new THREE.Vector3(0.5, 0.6, -3.2),
                pos: new THREE.Vector3(1.4, R + 1.65, -3.4)
            },
            {
                text: 'VALVULA DE EVACUACIÓN (2)',
                target: new THREE.Vector3(0.35, -R - 0.24, -2.4),
                pos: new THREE.Vector3(1.4, -R - 0.95, -2.6)
            }
        ];

        const dotGeo = new THREE.SphereGeometry(0.045, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

        for (const a of annotations) {
            const sprite = this.createCalloutSprite(a.text);
            sprite.position.copy(a.pos);
            this.calloutsGroup.add(sprite);

            const lineGeom = new THREE.BufferGeometry().setFromPoints([a.target, a.pos]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.75,
                depthTest: false,
            });
            const line = new THREE.Line(lineGeom, lineMat);
            this.calloutsGroup.add(line);

            // Pin de localización en el componente técnico
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.copy(a.target);
            this.calloutsGroup.add(dot);
        }

        // Visible de forma predeterminada
        this.calloutsGroup.visible = true;
    }

    toggleCallouts(forceState) {
        const nextState = (forceState !== undefined) ? forceState : ((this.state?.showCallouts !== false) ? false : true);
        if (this.state) {
            this.state.showCallouts = nextState;
        }
        this.calloutsGroup.visible = nextState;
        return nextState;
    }

    createCalloutSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(10, 20, 34, 0.72)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3.4, 0.55, 1.0);
        return sprite;
    }

    /**
     * Construcción de Vectores 3D de Fuerza (Empuje verde y Peso rojo)
     */
    buildForceVectors() {
        const R = this.SUB_RADIUS;

        this.buoyancyArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, R + 1.8, 0),
            5.5,
            0x00e676,
            1.8,
            0.9
        );

        this.weightArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, -R - 0.4, 0),
            5.5,
            0xff1744,
            1.8,
            0.9
        );

        this.vectorsGroup.add(this.buoyancyArrow);
        this.vectorsGroup.add(this.weightArrow);

        this.buoyancyLabel = this.createVectorSprite('Empuje (E)', '#00e676');
        this.weightLabel = this.createVectorSprite('Peso (W)', '#ff1744');

        this.buoyancyLabel.position.set(-3.2, 8.5, 0);
        this.weightLabel.position.set(3.2, -8.5, 0);

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
            this.hullMat.opacity = 0.65;
            this.hullMat.transmission = 0.45;
        } else {
            this.hullMat.opacity = 0.32;
            this.hullMat.transmission = 0.92;
        }
    }

    /**
     * Bucle de Actualización Gráfica y Cinemática
     */
    update(dt) {
        const posY = Number.isFinite(this.state.y) ? this.state.y : -0.2;
        const pitchAngle = Number.isFinite(this.state.pitch) ? this.state.pitch : 0.0;

        // Mantener el submarino centrado en el visor en Z y X y actualizar matrices de transformación
        this.rootGroup.position.set(0, posY, 0);
        this.rootGroup.rotation.x = -pitchAngle;
        this.rootGroup.updateMatrixWorld(true);

        const deltaT = Number.isFinite(dt) ? dt : 0.016;

        // --- DINÁMICA DE CONTRACCIÓN POR PRESIÓN HIDROSTÁTICA E IMPLOSIÓN ---
        const depth = Math.max(0, -posY);
        const crushDepth = SUBMARINE_CONSTANTS.CRUSH_DEPTH || 24.0;
        const testDepth = SUBMARINE_CONSTANTS.TEST_DEPTH || 19.0;
        const depthRatio = Math.min(1.0, depth / crushDepth);
        const elasticComp = 1.0 - (depthRatio * 0.10); // Contracción radial elástica progresiva (Hooke)
        const R = this.SUB_RADIUS;
        const L = this.hullCylLen;
        const T = this.tailLen;

        if (!this.state.isImploded) {
            this.implosionT = 0.0;
            // Estado de compresión elástica estructural progresiva
            let jitterX = 0;
            let jitterY = 0;
            if (depth > testDepth) {
                // Vibración de tensión crítica por esfuerzo estructural previo al colapso (Hoop Stress Flutter)
                const stressFactor = Math.min(1.0, (depth - testDepth) / Math.max(1.0, crushDepth - testDepth));
                const freq = (this.state.simTime || 0) * 45.0;
                jitterX = Math.sin(freq) * 0.016 * stressFactor;
                jitterY = Math.cos(freq * 1.3) * 0.016 * stressFactor;
            }

            const scaleRadial = elasticComp + jitterX;
            const scaleVertical = elasticComp + jitterY;

            if (this.mainHull) {
                this.mainHull.scale.set(scaleRadial, 1.0, scaleVertical);
                this.mainHull.position.set(0, 0, 0);
                this.mainHull.rotation.set(Math.PI / 2, 0, 0);
            }
            if (this.nose) {
                this.nose.position.set(0, 0, L / 2);
                this.nose.rotation.set(Math.PI / 2, 0, 0);
                this.nose.scale.set(1.0, 1.0, 1.0);
            }
            if (this.tail) {
                this.tail.position.set(0, 0, -(L / 2 + T / 2));
                this.tail.rotation.set(Math.PI / 2, 0, 0);
                this.tail.scale.set(1.0, 1.0, 1.0);
            }
            if (this.shaftCasing) {
                this.shaftCasing.position.set(0, 0, -(L / 2 + T + 0.17));
            }
            if (this.propellerGroup) {
                this.propellerGroup.position.set(0, 0, -(L / 2 + T + 0.35));
                this.propellerGroup.rotation.x = 0;
            }
            if (this.fwdFlange) {
                this.fwdFlange.scale.set(scaleRadial, scaleVertical, 1.0);
                this.fwdFlange.position.set(0, 0, L / 2);
                this.fwdFlange.rotation.set(0, 0, 0);
            }
            if (this.aftFlange) {
                this.aftFlange.scale.set(scaleRadial, scaleVertical, 1.0);
                this.aftFlange.position.set(0, 0, -L / 2);
                this.aftFlange.rotation.set(0, 0, 0);
            }
            if (this.internalGroup) {
                this.internalGroup.scale.set(scaleRadial * 0.98, scaleVertical * 0.98, 1.0);
                this.internalGroup.position.set(0, 0, 0);
                this.internalGroup.rotation.set(0, 0, 0);
            }

            // Ajustar posición vertical de la vela y quilla para seguir la superficie del cilindro elástico
            if (this.sailGroup) {
                this.sailGroup.position.set(0, (R * 0.70) * scaleVertical, 0.65);
                this.sailGroup.rotation.set(0, 0, 0);
            }
            if (this.ventralGroup) {
                this.ventralGroup.position.set(0, (1.0 - scaleVertical) * R * 0.92, 0);
                this.ventralGroup.scale.set(1.0, 1.0, 1.0);
            }
        } else {
            // Estado de Implosión Catastrófica por Aplastamiento Hidrostático (Basado en la arquitectura técnica UTP)
            this.implosionT = Math.min(1.0, (this.implosionT || 0) + deltaT * 4.5);
            const impT = this.implosionT;

            // 1. Pandeo Inelástico Asimétrico Multilobular (Modo Windenburg-Trilling n=2/3)
            const collapseRad = THREE.MathUtils.lerp(0.90, 0.40, impT);
            const buckleSine = Math.sin(impT * Math.PI * 3.5) * 0.08 * (1.0 - impT);
            const buckleCos = Math.cos(impT * Math.PI * 3.5) * 0.08 * (1.0 - impT);

            const crushWidth = (collapseRad * 0.75) + buckleSine;
            const crushHeight = (collapseRad * 1.25) + buckleCos;

            // 2. Desplazamiento axial hacia el centro por diferencial de vacío interno (ΔZ)
            // La enorme presión hidrostática externa succiona las tapas rígidas (proa y popa) hacia adentro
            const inwardPull = impT * 0.75; // 75 cm de retracción axial violenta

            if (this.mainHull) {
                this.mainHull.scale.set(crushWidth, 1.0 - (0.15 * impT), crushHeight);
                this.mainHull.position.set(buckleSine * 0.20, -0.22 * impT, 0);
            }

            // Succión axial de la Proa Hemisférica en titanio (+Z hacia adentro)
            if (this.nose) {
                this.nose.position.set(buckleSine * 0.1, -0.10 * impT, (L / 2) - inwardPull);
                this.nose.rotation.set((Math.PI / 2) + (0.12 * impT), 0, buckleSine * 0.1);
            }

            // Succión axial de la Popa Cónica en acero (-Z hacia adentro)
            if (this.tail) {
                this.tail.position.set(-buckleSine * 0.1, -0.12 * impT, -(L / 2 + T / 2) + inwardPull);
                this.tail.rotation.set((Math.PI / 2) - (0.15 * impT), 0, -buckleSine * 0.08);
            }

            // El eje de propulsión y hélice se trasladan solidariamente con la popa colapsada
            if (this.shaftCasing) {
                this.shaftCasing.position.set(-buckleSine * 0.1, -0.12 * impT, -(L / 2 + T + 0.17) + inwardPull);
            }
            if (this.propellerGroup) {
                this.propellerGroup.position.set(-buckleSine * 0.1, -0.12 * impT, -(L / 2 + T + 0.35) + inwardPull);
                this.propellerGroup.rotation.x = 0.32 * impT;
            }

            // 3. Descalce, deformación y torsión de las bridas de unión de titanio
            if (this.fwdFlange) {
                this.fwdFlange.position.set(buckleSine * 0.15, -0.18 * impT, (L / 2) - inwardPull);
                this.fwdFlange.scale.set(crushWidth, crushHeight, 1.0);
                this.fwdFlange.rotation.z = 0.24 * impT;
                this.fwdFlange.rotation.y = 0.12 * impT;
            }
            if (this.aftFlange) {
                this.aftFlange.position.set(-buckleSine * 0.15, -0.18 * impT, -L / 2 + (inwardPull * 0.85));
                this.aftFlange.scale.set(crushWidth, crushHeight, 1.0);
                this.aftFlange.rotation.z = -0.20 * impT;
                this.aftFlange.rotation.y = -0.10 * impT;
            }

            // 4. Colapso del ecosistema mecánico interno (Mamparos, rack de baterías, depósito aire y bomba)
            if (this.internalGroup) {
                this.internalGroup.scale.set(crushWidth * 0.94, crushHeight * 0.94, 1.0 - (0.15 * impT));
                this.internalGroup.position.set(buckleSine * 0.20, -0.22 * impT, 0);
                this.internalGroup.rotation.z = 0.09 * impT;
                this.internalGroup.rotation.x = -0.06 * impT;
            }

            // 5. Hundimiento y caída con alabeo de la vela hidrodinámica
            if (this.sailGroup) {
                const sailDropY = (R * 0.70) * crushHeight - (0.30 * impT);
                this.sailGroup.position.set(buckleSine * 0.15, sailDropY, 0.65 - (inwardPull * 0.2));
                this.sailGroup.rotation.z = 0.45 * impT;
                this.sailGroup.rotation.x = -0.20 * impT;
            }

            // 6. Colapso de válvulas ventrales
            if (this.ventralGroup) {
                this.ventralGroup.position.set(buckleSine * 0.1, (1.0 - crushHeight) * R * 0.92 - (0.22 * impT), 0);
                this.ventralGroup.scale.set(crushWidth, 1.0, 1.0 - (0.15 * impT));
            }

            // 7. Colapso de las columnas de agua en los tanques
            if (this.fwdWaterMesh) this.fwdWaterMesh.scale.set(crushWidth, crushHeight, 1.0);
            if (this.aftWaterMesh) this.aftWaterMesh.scale.set(crushWidth, crushHeight, 1.0);
            if (this.fwdWaterSurface) this.fwdWaterSurface.visible = false;
            if (this.aftWaterSurface) this.aftWaterSurface.visible = false;

            // 8. Crazing, microfisuración catastrófica y pérdida de transparencia del acrílico marino
            if (this.hullMat) {
                this.hullMat.color.lerp(new THREE.Color(0xdce7f0), deltaT * 14.0);
                this.hullMat.roughness = THREE.MathUtils.lerp(this.hullMat.roughness, 0.68, deltaT * 14.0);
                this.hullMat.transmission = THREE.MathUtils.lerp(this.hullMat.transmission, 0.03, deltaT * 14.0);
                this.hullMat.opacity = THREE.MathUtils.lerp(this.hullMat.opacity, 0.92, deltaT * 14.0);
                this.hullMat.clearcoat = THREE.MathUtils.lerp(this.hullMat.clearcoat, 0.12, deltaT * 14.0);
            }
        }

        // Expansión de onda de choque expansiva subacuática
        if (this.shockwaveMesh && this.shockwaveMesh.visible) {
            this.shockwaveProgress = (this.shockwaveProgress || 0) + deltaT * 2.2;
            if (this.shockwaveProgress <= 1.0) {
                const s = 1.0 + Math.pow(this.shockwaveProgress, 0.55) * 35.0;
                this.shockwaveMesh.scale.set(s, s, s);
                this.shockwaveMat.opacity = Math.sin(this.shockwaveProgress * Math.PI) * 0.85;
            } else {
                this.shockwaveMesh.visible = false;
            }
        }

        // Rotación de la hélice propulsora de 7 palas según RPM
        const rpm = (this.state.isImploded ? 0.0 : (Number.isFinite(this.state.propellerRPM) ? this.state.propellerRPM : 0.0));
        const rps = rpm / 60.0;
        this.propellerGroup.rotation.z += rps * Math.PI * 2 * deltaT;

        // Inclinación hidrodinámica de los timones de inmersión en la vela
        const diveAngle = Number.isFinite(this.state.divePlanesAngle) ? this.state.divePlanesAngle : 0.0;
        const planeRad = (diveAngle * Math.PI) / 180.0;
        this.fairwaterPlanesGroup.rotation.x = planeRad;

        // Dinámica de llenado físico de agua en los tanques
        const fwdRaw = Number.isFinite(this.state.fwdBallastPct) ? this.state.fwdBallastPct : 0.0;
        const aftRaw = Number.isFinite(this.state.aftBallastPct) ? this.state.aftBallastPct : 0.0;
        const fwdFrac = Math.max(0.0, Math.min(1.0, fwdRaw / 100.0));
        const aftFrac = Math.max(0.0, Math.min(1.0, aftRaw / 100.0));

        const rEff = (this.tankRadius || R * 0.965) * 0.99;
        const fwdZ = 3.20;
        const aftZ = -3.20;

        // Perturbación ondulatoria del menisco durante llenado o soplado activo
        const isAgitated = this.state.isFilling || this.state.isBlowing;
        const waveJitter = isAgitated ? Math.sin(this.state.simTime * 14.0) * 0.012 : 0.0;

        const downLocal = new THREE.Vector3(0, -1, 0);
        const downWorld = downLocal.clone().transformDirection(this.internalGroup.matrixWorld);

        // --- 1. TANQUE DE PROA (FWD: +Z) ---
        if (this.fwdWaterMesh) {
            if (fwdRaw <= 0.5) {
                this.fwdWaterMesh.visible = false;
                this.fwdWaterSurface.visible = false;
                this.fwdClipPlane.constant = -999999;
            } else if (fwdRaw >= 99.5) {
                this.fwdWaterMesh.visible = true;
                this.fwdWaterSurface.visible = false;
                this.fwdClipPlane.constant = 999999;
            } else {
                this.fwdWaterMesh.visible = true;
                this.fwdWaterSurface.visible = true;

                // Nivel vertical en el cilindro horizontal: de -rEff (fondo) a +rEff (techo)
                const yLocal = -rEff + (2.0 * rEff * fwdFrac);

                // Ancho de cuerda transversal: x = sqrt(R^2 - y^2)
                const chordHalf = Math.sqrt(Math.max(0.005, (rEff * rEff) - (yLocal * yLocal)));
                const scaleX = chordHalf / rEff;

                this.fwdWaterSurface.position.set(0, yLocal + waveJitter, fwdZ);
                this.fwdWaterSurface.scale.set(scaleX, 1.0, 1.0);

                const localMeniscus = new THREE.Vector3(0, yLocal + waveJitter, fwdZ);
                const worldMeniscus = localMeniscus.applyMatrix4(this.internalGroup.matrixWorld);

                this.fwdClipPlane.setFromNormalAndCoplanarPoint(downWorld, worldMeniscus);
            }
        }

        // --- 2. TANQUE DE POPA (AFT: -Z) ---
        if (this.aftWaterMesh) {
            if (aftRaw <= 0.5) {
                this.aftWaterMesh.visible = false;
                this.aftWaterSurface.visible = false;
                this.aftClipPlane.constant = -999999;
            } else if (aftRaw >= 99.5) {
                this.aftWaterMesh.visible = true;
                this.aftWaterSurface.visible = false;
                this.aftClipPlane.constant = 999999;
            } else {
                this.aftWaterMesh.visible = true;
                this.aftWaterSurface.visible = true;

                const yLocal = -rEff + (2.0 * rEff * aftFrac);
                const chordHalf = Math.sqrt(Math.max(0.005, (rEff * rEff) - (yLocal * yLocal)));
                const scaleX = chordHalf / rEff;

                this.aftWaterSurface.position.set(0, yLocal + waveJitter, aftZ);
                this.aftWaterSurface.scale.set(scaleX, 1.0, 1.0);

                const localMeniscus = new THREE.Vector3(0, yLocal + waveJitter, aftZ);
                const worldMeniscus = localMeniscus.applyMatrix4(this.internalGroup.matrixWorld);

                this.aftClipPlane.setFromNormalAndCoplanarPoint(downWorld, worldMeniscus);
            }
        }

        // --- 3. AERACIÓN Y BURBUJAS INTERNAS EN LOS TANQUES ---
        if (this.internalAerationPoints) {
            const targetOpacity = this.state.isBlowing ? 0.85 : (this.state.isFilling ? 0.45 : 0.0);
            this.internalAerationMat.opacity += (targetOpacity - this.internalAerationMat.opacity) * Math.min(1.0, deltaT * 5.0);

            if (this.internalAerationMat.opacity > 0.02) {
                const pos = this.internalAerationPoints.geometry.attributes.position;
                const off = this.internalAerationOffsets;
                const time = this.state.simTime * 9.0;

                for (let i = 0; i < pos.count; i++) {
                    const isFwd = i < pos.count / 2;
                    const frac = isFwd ? fwdFrac : aftFrac;
                    const yLevel = -rEff + (2.0 * rEff * frac);

                    const px = off[i * 3] + Math.sin(time + i * 1.3) * 0.06;
                    const py = yLevel - (Math.abs(Math.sin(time * 0.6 + i * 0.7)) * (rEff * 0.45));
                    const pz = off[i * 3 + 2] + Math.cos(time + i * 1.3) * 0.06;
                    pos.setXYZ(i, px, py, pz);
                }
                pos.needsUpdate = true;
            }
        }

        // --- 4. VECTORES DE FUERZA (EMPUJE E Y PESO W) ---
        this.vectorsGroup.visible = !!this.state.showForceVectors;
        if (this.vectorsGroup.visible) {
            const forceScale = 1.0 / 1200000.0;
            const minLen = 3.5;

            const bForce = Number.isFinite(this.state.buoyancyForce) ? this.state.buoyancyForce : 8.1e6;
            const wForce = Number.isFinite(this.state.weightForce) ? this.state.weightForce : 7.9e6;

            const eLen = Math.max(minLen, Math.min(18.0, bForce * forceScale));
            this.buoyancyArrow.setLength(eLen, Math.min(1.8, eLen * 0.25), 0.8);
            this.buoyancyLabel.position.set(-3.2, eLen + 3.0, 0);

            const wLen = Math.max(minLen, Math.min(18.0, wForce * forceScale));
            this.weightArrow.setLength(wLen, Math.min(1.8, wLen * 0.25), 0.8);
            this.weightLabel.position.set(3.2, -(wLen + 3.0), 0);
        }

        // --- 5. ETIQUETAS TÉCNICAS UTP ---
        if (this.calloutsGroup) {
            // Ocultar etiquetas automáticamente durante la implosión para evitar solapamiento visual con los restos
            this.calloutsGroup.visible = !this.state.isImploded && (this.state.showCallouts !== false);
        }
    }
}
