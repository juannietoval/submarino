/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * SubmarineModel.js - Modelo 3D de Ingeniería Naval de Alta Fidelidad
 * Casco Translúcido, Ecosistema Didáctico de Lastre (Botellones HP a 200 bar, Tuberías y Válvulas),
 * Vela Hidrodinámica Albacore, Hélice Skewed de 7 Palas, Quilla Ventral, Rejillas Kingston,
 * Quillas de Balance, Compuertas de Torpedos y Planos de Corte Coplanar con Menisco Estable.
 */

import * as THREE from 'three';

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

    /**
     * Inicialización de Materiales PBR Navales
     */
    initMaterials() {
        // 1. Acero naval oscuro satinado (Proa, popa, vela, timones, quilla)
        this.steelDarkMat = new THREE.MeshStandardMaterial({
            color: 0x243038,
            metalness: 0.78,
            roughness: 0.32,
        });

        // 2. Acero / Titanio claro (Cuadernas de refuerzo, bridas, vigas, herrajes)
        this.detailMat = new THREE.MeshStandardMaterial({
            color: 0xcfd8dc,
            metalness: 0.75,
            roughness: 0.26,
        });

        // 3. Bronce naval pulido (Hélice propulsora de 7 palas, casquillos, válvulas)
        this.bronzeMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.90,
            roughness: 0.20,
        });

        // 4. Cobre / Latón neumático (Tuberías de soplado de aire de alta presión a 200 bar)
        this.copperPipeMat = new THREE.MeshStandardMaterial({
            color: 0xc87d46,
            metalness: 0.84,
            roughness: 0.22,
        });

        // 5. Botellones de aire comprimido (Acero templado a presión de 200 bar)
        this.airFlaskMat = new THREE.MeshStandardMaterial({
            color: 0x3e505c,
            metalness: 0.80,
            roughness: 0.24,
        });

        // 6. Casco Cilíndrico Translúcido (Acrílico marino limpio con brillo de superficie)
        this.hullMat = new THREE.MeshPhysicalMaterial({
            color: 0xd0d8df,
            metalness: 0.25,
            roughness: 0.08,
            transmission: 0.28,
            thickness: 1.6,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            clearcoat: 1.0,
            clearcoatRoughness: 0.06,
            depthWrite: false,
        });

        // 7. Contenedor de tanques de lastre (cilindro translúcido sutil)
        this.tankShellMat = new THREE.MeshStandardMaterial({
            color: 0x88ccdd,
            transparent: true,
            opacity: 0.14,
            roughness: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        // 8. Fluido de agua de lastre viva (Azul cian nítido y luminoso)
        this.waterFillMat = new THREE.MeshStandardMaterial({
            color: 0x00bfff,
            emissive: 0x004466,
            emissiveIntensity: 0.32,
            transparent: true,
            opacity: 0.86,
            roughness: 0.10,
            metalness: 0.15,
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
            color: 0x66e5ff,
            emissive: 0x005577,
            emissiveIntensity: 0.42,
            transparent: true,
            opacity: 0.92,
            roughness: 0.04,
            side: THREE.DoubleSide,
        });

        // Luces de Navegación y Señalización Náutica
        this.portNavMat = new THREE.MeshStandardMaterial({
            color: 0xff1744,
            emissive: 0xff1744,
            emissiveIntensity: 1.0,
            roughness: 0.1,
        });

        this.starboardNavMat = new THREE.MeshStandardMaterial({
            color: 0x00e676,
            emissive: 0x00e676,
            emissiveIntensity: 1.0,
            roughness: 0.1,
        });

        // Tira de iluminación LED interior
        this.interiorLedMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00c8e0,
            emissiveIntensity: 0.65,
            roughness: 0.2,
        });

        // Rejilla de piso antideslizante interior
        this.walkwayMat = new THREE.MeshStandardMaterial({
            color: 0x546e7a,
            metalness: 0.60,
            roughness: 0.45,
        });
    }

    /**
     * Construcción de la Arquitectura Completa del Submarino
     */
    buildSubmarine() {
        const R = this.SUB_RADIUS;
        const L = this.hullCylLen;
        const T = this.tailLen;

        // 1. Estructura exterior (Casco transparente, juntas, proa y popa)
        this.buildOuterHull(R, L, T);

        // 2. Vela hidrodinámica Albacore y planos de inmersión en la vela
        this.buildHydrodynamicSail(R, L);

        // 3. Propulsión y empenaje de popa (Hélice 7 palas y timones en cruz)
        this.buildSternPropulsionAndEmpennage(R, L, T);

        // 4. Quilla ventral, tomas de mar Kingston y quillas de balance (Vistas inferiores)
        this.buildVentralKeelAndIntakes(R, L);

        // 5. Ecosistema mecánico interior (Cuadernas, vigas, botellones, tuberías, mamparos y tanques)
        this.buildInternalFrameworkAndMechanisms(R, L);
    }

    /**
     * 1. Casco Exterior con Anillos de Unión Estancos y Proa con Compuertas de Torpedos
     */
    buildOuterHull(R, L, T) {
        // A. Casco Central Cilíndrico Translúcido
        const mainHullGeo = new THREE.CylinderGeometry(R, R, L, 40);
        this.mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
        this.mainHull.rotation.x = Math.PI / 2;
        this.hullGroup.add(this.mainHull);

        // B. Anillos de Brida Reforzada (Juntas estancas entre acrílico y acero)
        const flangeGeo = new THREE.TorusGeometry(R * 1.018, 0.055, 16, 40);
        const fwdFlange = new THREE.Mesh(flangeGeo, this.detailMat);
        fwdFlange.position.z = L / 2;
        this.hullGroup.add(fwdFlange);

        const aftFlange = new THREE.Mesh(flangeGeo, this.detailMat);
        aftFlange.position.z = -L / 2;
        this.hullGroup.add(aftFlange);

        // C. Proa Hemisférica en Acero Naval (+Z)
        const noseGeo = new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
        this.nose = new THREE.Mesh(noseGeo, this.steelDarkMat);
        this.nose.rotation.x = Math.PI / 2;
        this.nose.position.z = L / 2;
        this.hullGroup.add(this.nose);

        // Cúpula frontal de sonar pasivo en la proa
        const sonarCapGeo = new THREE.SphereGeometry(R * 0.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const sonarCap = new THREE.Mesh(sonarCapGeo, this.detailMat);
        sonarCap.rotation.x = Math.PI / 2;
        sonarCap.position.z = L / 2 + R * 0.90;
        this.hullGroup.add(sonarCap);

        // Compuertas exteriores de tubos lanzatorpedos (matriz 2x2 en la proa de acero)
        const torpedoPositions = [
            [-0.42, 0.32],
            [0.42, 0.32],
            [-0.42, -0.32],
            [0.42, -0.32]
        ];
        const doorGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.04, 20);
        doorGeo.rotateX(Math.PI / 2);
        const doorRimGeo = new THREE.TorusGeometry(0.19, 0.025, 10, 24);

        for (const [tx, ty] of torpedoPositions) {
            const doorGroup = new THREE.Group();
            doorGroup.position.set(tx, ty, L / 2 + R * 0.76);

            const doorCap = new THREE.Mesh(doorGeo, this.steelDarkMat);
            const doorRim = new THREE.Mesh(doorRimGeo, this.detailMat);
            const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.05), this.detailMat);
            hinge.position.set(-0.20, 0, 0.02);

            doorGroup.add(doorCap);
            doorGroup.add(doorRim);
            doorGroup.add(hinge);
            this.hullGroup.add(doorGroup);
        }

        // Domo de sonar de barbilla (Chin Sonar Array) en la curvatura inferior de proa
        const chinSonarGeo = new THREE.SphereGeometry(0.40, 20, 12);
        chinSonarGeo.scale(0.85, 0.55, 1.3);
        const chinSonar = new THREE.Mesh(chinSonarGeo, this.steelDarkMat);
        chinSonar.position.set(0, -R * 0.72, L / 2 + R * 0.45);
        this.hullGroup.add(chinSonar);

        // D. Popa Cónica Hidrodinámica en Acero (-Z)
        const tailGeo = new THREE.CylinderGeometry(R, R * 0.28, T, 40);
        this.tail = new THREE.Mesh(tailGeo, this.steelDarkMat);
        this.tail.rotation.x = Math.PI / 2;
        this.tail.position.z = -(L / 2 + T / 2);
        this.hullGroup.add(this.tail);

        // Casquillo de bocina del eje de la hélice
        const shaftCasingGeo = new THREE.CylinderGeometry(R * 0.28, R * 0.26, 0.35, 24);
        const shaftCasing = new THREE.Mesh(shaftCasingGeo, this.detailMat);
        shaftCasing.rotation.x = Math.PI / 2;
        shaftCasing.position.z = -(L / 2 + T + 0.17);
        this.hullGroup.add(shaftCasing);
    }

    /**
     * 2. Quilla Ventral, Tomas de Mar Kingston y Quillas de Balance (Vistas Inferiores)
     */
    buildVentralKeelAndIntakes(R, L) {
        const ventralGroup = new THREE.Group();

        // A. Quilla Externa Longitudinal de Protección Naval
        const keelBarGeo = new THREE.BoxGeometry(0.18, 0.10, L * 0.98);
        const keelBar = new THREE.Mesh(keelBarGeo, this.steelDarkMat);
        keelBar.position.set(0, -R - 0.05, 0);
        ventralGroup.add(keelBar);

        // B. Rejillas de Inundación de Válvulas Kingston (Bajo tanques proel y popel)
        const tankZs = [L * 0.25, -L * 0.25];
        const grateWidth = 0.55;
        const grateLength = 1.35;

        for (const tz of tankZs) {
            const grateFrameGroup = new THREE.Group();
            grateFrameGroup.position.set(0, -R - 0.02, tz);

            // Marco perimetral de acero
            const frameGeo = new THREE.BoxGeometry(grateWidth, 0.06, grateLength);
            const frameMesh = new THREE.Mesh(frameGeo, this.steelDarkMat);
            grateFrameGroup.add(frameMesh);

            // 8 ranuras transversales de aspiración de agua
            const numBars = 8;
            const barSpacing = (grateLength * 0.85) / numBars;
            const barGeo = new THREE.BoxGeometry(grateWidth * 0.90, 0.04, 0.035);

            for (let b = 0; b < numBars; b++) {
                const barMesh = new THREE.Mesh(barGeo, this.detailMat);
                const bz = -grateLength * 0.42 + (b * barSpacing) + barSpacing / 2;
                barMesh.position.set(0, -0.02, bz);
                grateFrameGroup.add(barMesh);
            }

            ventralGroup.add(grateFrameGroup);
        }

        // C. Quillas de Balance Laterales (Bilge Keels) para amortiguamiento de rolido
        const bkLength = L * 0.65;
        const bkWidth = 0.22;
        const bkThick = 0.035;
        const bkAngle = Math.PI / 4; // 45 grados en pantoque

        const bkGeo = new THREE.BoxGeometry(bkWidth, bkThick, bkLength);

        // Quilla de balance babor (izquierda: -X)
        const bkPort = new THREE.Mesh(bkGeo, this.steelDarkMat);
        bkPort.position.set(-R * Math.cos(bkAngle) - 0.06, -R * Math.sin(bkAngle) - 0.06, 0);
        bkPort.rotation.z = -bkAngle;
        ventralGroup.add(bkPort);

        // Quilla de balance estribor (derecha: +X)
        const bkStarboard = new THREE.Mesh(bkGeo, this.steelDarkMat);
        bkStarboard.position.set(R * Math.cos(bkAngle) + 0.06, -R * Math.sin(bkAngle) - 0.06, 0);
        bkStarboard.rotation.z = bkAngle;
        ventralGroup.add(bkStarboard);

        this.hullGroup.add(ventralGroup);
    }

    /**
     * 3. Vela Hidrodinámica Albacore y Planos de Inmersión NACA
     */
    buildHydrodynamicSail(R, L) {
        const sailGroup = new THREE.Group();
        sailGroup.position.set(0, R * 0.70, L * 0.20);

        const sailWidth = R * 0.65;
        const sailLength = R * 1.85;
        const sailHeight = R * 1.45;

        // Geometría extrusionada con perfil hidrodinámico teardrop (borde ataque curvo, borde fuga afilado)
        const sailShape = new THREE.Shape();
        const halfW = sailWidth / 2;
        const halfL = sailLength / 2;

        sailShape.moveTo(0, halfL);
        sailShape.bezierCurveTo(halfW, halfL, halfW, halfL * 0.35, halfW, 0);
        sailShape.bezierCurveTo(halfW, -halfL * 0.45, halfW * 0.25, -halfL * 0.85, 0, -halfL);
        sailShape.bezierCurveTo(-halfW * 0.25, -halfL * 0.85, -halfW, -halfL * 0.45, -halfW, 0);
        sailShape.bezierCurveTo(-halfW, halfL * 0.35, -halfW, halfL, 0, halfL);

        const extrudeSettings = {
            steps: 1,
            depth: sailHeight,
            bevelEnabled: true,
            bevelThickness: 0.09,
            bevelSize: 0.06,
            bevelSegments: 4,
        };

        const sailGeo = new THREE.ExtrudeGeometry(sailShape, extrudeSettings);
        sailGeo.rotateX(Math.PI / 2);
        sailGeo.center();

        const sailMesh = new THREE.Mesh(sailGeo, this.steelDarkMat);
        sailMesh.position.y = sailHeight / 2;
        sailGroup.add(sailMesh);

        // Cúpula superior de observación / puente de mando
        const bridgeGeo = new THREE.SphereGeometry(halfW * 0.90, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const bridgeMesh = new THREE.Mesh(bridgeGeo, this.detailMat);
        bridgeMesh.position.set(0, sailHeight + 0.04, halfL * 0.25);
        bridgeMesh.scale.set(1.0, 0.45, 1.4);
        sailGroup.add(bridgeMesh);

        // Timones de Inmersión en la Vela con perfil hidroala NACA (Fairwater Planes)
        const planeSpan = 1.35;
        const planeChord = 0.65;
        const planeThick = 0.12; // Perfil con volumen aerodinámico real

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

        // Plano babor (izquierda)
        const planeLeft = new THREE.Mesh(planeGeo, this.steelDarkMat);
        planeLeft.position.set(halfW + planeSpan / 2 + 0.02, sailHeight * 0.60, 0);

        // Luz de navegación babor (rojo)
        const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), this.portNavMat);
        navRed.position.set(planeSpan / 2, 0, 0);
        planeLeft.add(navRed);
        this.fairwaterPlanesGroup.add(planeLeft);

        // Plano estribor (derecha)
        const planeRight = new THREE.Mesh(planeGeo, this.steelDarkMat);
        planeRight.position.set(-(halfW + planeSpan / 2 + 0.02), sailHeight * 0.60, 0);

        // Luz de navegación estribor (verde)
        const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), this.starboardNavMat);
        navGreen.position.set(-planeSpan / 2, 0, 0);
        planeRight.add(navGreen);
        this.fairwaterPlanesGroup.add(planeRight);

        // Eje pasante del timón de inmersión con bridas de pivote hidráulico
        const planeShaftGeo = new THREE.CylinderGeometry(0.055, 0.055, halfW * 2 + 0.14, 16);
        const planeShaft = new THREE.Mesh(planeShaftGeo, this.detailMat);
        planeShaft.rotation.z = Math.PI / 2;
        planeShaft.position.set(0, sailHeight * 0.60, 0);
        this.fairwaterPlanesGroup.add(planeShaft);

        sailGroup.add(this.fairwaterPlanesGroup);

        // Mástiles Retráctiles Detallados (Periscopios, radar y snorkel)
        // 1. Periscopio de ataque (esbelto con cabezal óptico y prisma de bronce)
        const mast1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.30, 16), this.detailMat);
        mast1.position.set(0.14, sailHeight + 0.65, halfL * 0.10);
        const opticHead1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.18, 16), this.bronzeMat);
        opticHead1.position.set(0.14, sailHeight + 1.28, halfL * 0.10);
        sailGroup.add(mast1);
        sailGroup.add(opticHead1);

        // 2. Periscopio de búsqueda y satélite con radomo
        const mast2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.00, 16), this.detailMat);
        mast2.position.set(-0.14, sailHeight + 0.50, -halfL * 0.15);
        const opticHead2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), this.steelDarkMat);
        opticHead2.position.set(-0.14, sailHeight + 0.98, -halfL * 0.15);
        sailGroup.add(mast2);
        sailGroup.add(opticHead2);

        // 3. Mástil Snorkel de inducción con válvula de flotador
        const mast3 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.75, 16), this.steelDarkMat);
        mast3.position.set(0, sailHeight + 0.36, -halfL * 0.45);
        const snorkelHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.15, 16), this.detailMat);
        snorkelHead.position.set(0, sailHeight + 0.72, -halfL * 0.45);
        sailGroup.add(mast3);
        sailGroup.add(snorkelHead);

        this.hullGroup.add(sailGroup);
    }

    /**
     * 4. Hélice Naval Skewed de 7 Palas y Empenaje Cruciforme
     */
    buildSternPropulsionAndEmpennage(R, L, T) {
        // A. Timones Cruciformes (Estabilizadores de popa)
        const finZ = -(L / 2 + T * 0.50);
        const finHeight = R * 0.95;
        const finLength = T * 0.65;

        // Aleta vertical superior
        const vFinGeo = new THREE.BoxGeometry(0.09, finHeight, finLength);
        const vFinTop = new THREE.Mesh(vFinGeo, this.steelDarkMat);
        vFinTop.position.set(0, R * 0.65, finZ);
        this.hullGroup.add(vFinTop);

        // Aleta vertical inferior (patín de quilla)
        const vFinBot = new THREE.Mesh(vFinGeo, this.steelDarkMat);
        vFinBot.position.set(0, -R * 0.65, finZ);
        this.hullGroup.add(vFinBot);

        // Aletas horizontales (timones de profundidad popel)
        const hFinGeo = new THREE.BoxGeometry(finHeight * 1.90, 0.09, finLength);
        const hFin = new THREE.Mesh(hFinGeo, this.steelDarkMat);
        hFin.position.set(0, 0, finZ);
        this.hullGroup.add(hFin);

        // Tapas de extremo de estabilizador
        const capGeo = new THREE.CylinderGeometry(0.07, 0.07, finLength, 12);
        capGeo.rotateX(Math.PI / 2);

        const capTop = new THREE.Mesh(capGeo, this.detailMat);
        capTop.position.set(0, R * 0.65 + finHeight / 2, finZ);
        this.hullGroup.add(capTop);

        const capBot = new THREE.Mesh(capGeo, this.detailMat);
        capBot.position.set(0, -(R * 0.65 + finHeight / 2), finZ);
        this.hullGroup.add(capBot);

        // B. Hélice Naval Skewed de 7 Palas de Alta Eficiencia
        const propZ = -(L / 2 + T + 0.35);
        this.propellerGroup.position.set(0, 0, propZ);

        // Cono de ojiva de hélice en bronce
        const hubGeo = new THREE.ConeGeometry(R * 0.24, 0.60, 24);
        hubGeo.rotateX(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, this.bronzeMat);
        this.propellerGroup.add(hub);

        // Anillo de fijación del cubo
        const hubRingGeo = new THREE.CylinderGeometry(R * 0.24, R * 0.24, 0.12, 24);
        hubRingGeo.rotateX(Math.PI / 2);
        const hubRing = new THREE.Mesh(hubRingGeo, this.detailMat);
        hubRing.position.z = 0.20;
        this.propellerGroup.add(hubRing);

        // Generación geométrica de las 7 palas alabeadas con curvatura parabólica
        const numBlades = 7;
        const bladeRadius = R * 0.92;
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
            blade.rotation.y = 0.40; // Ángulo de paso hidrodinámico
            blade.rotation.x = 0.14; // Inclinación axial (Rake)
            this.propellerGroup.add(blade);
        }

        this.hullGroup.add(this.propellerGroup);
    }

    /**
     * 5. Ecosistema Mecánico Interior Completo (El Mecanismo de Hundimiento)
     */
    buildInternalFrameworkAndMechanisms(R, L) {
        // A. Cuadernas Anulares Maestras (6 Anillos estructurales de titanio/acero)
        const numRibs = 6;
        const ribGeo = new THREE.TorusGeometry(R * 0.95, 0.048, 16, 40);
        for (let i = 0; i < numRibs; i++) {
            const rib = new THREE.Mesh(ribGeo, this.detailMat);
            const zPos = -L / 2 + (L / (numRibs - 1)) * i;
            rib.position.z = zPos;
            this.internalGroup.add(rib);
        }

        // B. Vigas Longitudinales de Refuerzo Naval (Quilla y Bao Dorsal)
        const stringerLen = L * 0.98;
        const stringerGeo = new THREE.BoxGeometry(0.12, 0.07, stringerLen);

        // Viga de Quilla interna (Keelson - en el fondo del casco)
        const keelBeam = new THREE.Mesh(stringerGeo, this.detailMat);
        keelBeam.position.set(0, -R * 0.91, 0);
        this.internalGroup.add(keelBeam);

        // Larguero dorsal (Spine stringer - en la parte superior)
        const spineBeam = new THREE.Mesh(stringerGeo, this.detailMat);
        spineBeam.position.set(0, R * 0.91, 0);
        this.internalGroup.add(spineBeam);

        // Tira de iluminación LED técnica dorsal (Luz cian que baña la maquinaria interna)
        const ledStripGeo = new THREE.BoxGeometry(0.04, 0.02, L * 0.94);
        const ledStrip = new THREE.Mesh(ledStripGeo, this.interiorLedMat);
        ledStrip.position.set(0, R * 0.88, 0);
        this.internalGroup.add(ledStrip);

        // C. Piso de Rejilla Metálica Antideslizante (Deck Walkway Grating)
        const deckGeo = new THREE.BoxGeometry(R * 0.82, 0.03, L * 0.92);
        const deckMesh = new THREE.Mesh(deckGeo, this.walkwayMat);
        deckMesh.position.set(0, -R * 0.62, 0);
        this.internalGroup.add(deckMesh);

        // D. Mamparos Estancos con Portal Central Abierto (Visión Longitudinal Axial Completa)
        const bulkheadRadius = R * 0.93;
        const portalRadius = bulkheadRadius * 0.46; // Diámetro de paso de 1.4m

        // Geometría anular con agujero central para que nunca bloquee la vista entre compartimentos
        const bulkheadShape = new THREE.Shape();
        bulkheadShape.absarc(0, 0, bulkheadRadius, 0, Math.PI * 2, false);
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, portalRadius, 0, Math.PI * 2, true);
        bulkheadShape.holes.push(holePath);

        const bulkheadExtrude = {
            steps: 1,
            depth: 0.07,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.01,
            bevelSegments: 2,
        };
        const bulkheadGeo = new THREE.ExtrudeGeometry(bulkheadShape, bulkheadExtrude);
        bulkheadGeo.center();

        // Mamparo estanco proel (Z = +1.15)
        const fwdBulkhead = new THREE.Mesh(bulkheadGeo, this.steelDarkMat);
        fwdBulkhead.position.z = 1.15;
        this.buildBulkheadDetails(fwdBulkhead, bulkheadRadius, portalRadius);
        this.internalGroup.add(fwdBulkhead);

        // Mamparo estanco popel (Z = -1.15)
        const aftBulkhead = new THREE.Mesh(bulkheadGeo, this.steelDarkMat);
        aftBulkhead.position.z = -1.15;
        this.buildBulkheadDetails(aftBulkhead, bulkheadRadius, portalRadius);
        this.internalGroup.add(aftBulkhead);

        // E. Banco de 6 Botellones de Aire Comprimido (HP Air Flasks a 200 bar) con Cunas
        this.buildHighPressureAirBank(R);

        // F. Tuberías Neumáticas de Soplado de Alta Presión (Cobre / Latón)
        this.buildPneumaticAirLines(R, L);

        // G. Tanques de Lastre MBT (Proa y Popa) con Colectores de Inundación de Quilla
        this.buildBallastTanks(R, L);

        // H. Partículas de Agitación y Aeración Interna en los Tanques
        this.initInternalTankAeration();
    }

    /**
     * Detalles del Mamparo Estanco: Marco de escotilla tubular, nervaduras y trincas de bronce
     */
    buildBulkheadDetails(bulkheadMesh, radius, portalRadius) {
        // Marco toroidal reforzado de la escotilla estanca
        const hatchRingGeo = new THREE.TorusGeometry(portalRadius, 0.045, 12, 32);
        const hatchRing = new THREE.Mesh(hatchRingGeo, this.detailMat);
        bulkheadMesh.add(hatchRing);

        // 8 Nervaduras radiales de refuerzo entre el marco central y el perímetro
        const numSpokes = 8;
        const spokeLen = radius - portalRadius;
        const spokeGeo = new THREE.BoxGeometry(0.04, spokeLen, 0.035);

        for (let j = 0; j < numSpokes; j++) {
            const spoke = new THREE.Mesh(spokeGeo, this.detailMat);
            const ang = (Math.PI * 2 / numSpokes) * j;
            const midR = portalRadius + spokeLen / 2;
            spoke.position.set(Math.cos(ang) * midR, Math.sin(ang) * midR, 0.02);
            spoke.rotation.z = ang - Math.PI / 2;
            bulkheadMesh.add(spoke);
        }

        // 6 Trincas de bronce de cierre de alta presión alrededor de la escotilla
        const dogGeo = new THREE.BoxGeometry(0.03, 0.06, 0.04);
        for (let d = 0; d < 6; d++) {
            const dog = new THREE.Mesh(dogGeo, this.bronzeMat);
            const dAng = (Math.PI * 2 / 6) * d;
            dog.position.set(Math.cos(dAng) * (portalRadius * 1.05), Math.sin(dAng) * (portalRadius * 1.05), 0.04);
            dog.rotation.z = dAng;
            bulkheadMesh.add(dog);
        }
    }

    /**
     * Banco Central de 6 Botellones de Aire de Alta Presión (200 bar) con Cunas y Manómetros
     */
    buildHighPressureAirBank(R) {
        const airBankGroup = new THREE.Group();
        airBankGroup.position.set(0, -R * 0.22, 0);

        const flaskRadius = 0.125;
        const flaskLength = 1.60;

        const flaskCylGeo = new THREE.CylinderGeometry(flaskRadius, flaskRadius, flaskLength, 20);
        flaskCylGeo.rotateX(Math.PI / 2);
        const flaskCapGeo = new THREE.SphereGeometry(flaskRadius, 16, 12);

        // Cunas transversales de acero que fijan los botellones a la estructura
        const cradleGeo = new THREE.BoxGeometry(0.95, 0.06, 0.08);
        const cradle1 = new THREE.Mesh(cradleGeo, this.steelDarkMat);
        cradle1.position.set(0, -0.22, 0.45);
        airBankGroup.add(cradle1);

        const cradle2 = new THREE.Mesh(cradleGeo, this.steelDarkMat);
        cradle2.position.set(0, -0.22, -0.45);
        airBankGroup.add(cradle2);

        // 6 botellones de aire comprimido dispuestos en matriz simétrica 2 x 3
        const flaskPositions = [
            [-0.34, -0.12], [0, -0.12], [0.34, -0.12],
            [-0.34, 0.16], [0, 0.16], [0.34, 0.16]
        ];

        for (const [fx, fy] of flaskPositions) {
            const flaskMesh = new THREE.Mesh(flaskCylGeo, this.airFlaskMat);
            flaskMesh.position.set(fx, fy, 0);

            // Tapas semiesféricas de alta presión
            const capFwd = new THREE.Mesh(flaskCapGeo, this.airFlaskMat);
            capFwd.position.z = flaskLength / 2;
            flaskMesh.add(capFwd);

            const capAft = new THREE.Mesh(flaskCapGeo, this.airFlaskMat);
            capAft.position.z = -flaskLength / 2;
            flaskMesh.add(capAft);

            // Válvula de corte de bronce en el cabezal frontal
            const valveGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.10, 12);
            valveGeo.rotateX(Math.PI / 2);
            const valve = new THREE.Mesh(valveGeo, this.bronzeMat);
            valve.position.z = flaskLength / 2 + 0.14;
            flaskMesh.add(valve);

            // Abrazaderas metálicas reflectivas
            const clampGeo = new THREE.TorusGeometry(flaskRadius * 1.05, 0.015, 8, 20);
            const clamp1 = new THREE.Mesh(clampGeo, this.detailMat);
            clamp1.position.z = flaskLength * 0.28;
            flaskMesh.add(clamp1);
            const clamp2 = new THREE.Mesh(clampGeo, this.detailMat);
            clamp2.position.z = -flaskLength * 0.28;
            flaskMesh.add(clamp2);

            airBankGroup.add(flaskMesh);
        }

        // Manómetro analógico de aguja indicador de presión a 200 bar
        const gaugeGroup = new THREE.Group();
        gaugeGroup.position.set(0.48, 0.15, 0.65);

        const gaugeBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 20), this.bronzeMat);
        gaugeBezel.rotateX(Math.PI / 2);
        gaugeGroup.add(gaugeBezel);

        const gaugeDial = new THREE.Mesh(new THREE.CircleGeometry(0.088, 20), this.detailMat);
        gaugeDial.position.z = 0.022;
        gaugeGroup.add(gaugeDial);

        const gaugeNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.005), this.portNavMat);
        gaugeNeedle.position.set(0.02, 0.02, 0.025);
        gaugeNeedle.rotation.z = -Math.PI / 4;
        gaugeGroup.add(gaugeNeedle);

        airBankGroup.add(gaugeGroup);

        this.internalGroup.add(airBankGroup);
    }

    /**
     * Red de Tuberías Neumáticas de Distribución de Aire (Manifold)
     */
    buildPneumaticAirLines(R, L) {
        const pipeRadius = 0.035;

        // Colector principal horizontal superior (Corre a lo largo del techo entre mamparos)
        const spinePipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, L * 0.55, 16);
        spinePipeGeo.rotateX(Math.PI / 2);
        const spinePipe = new THREE.Mesh(spinePipeGeo, this.copperPipeMat);
        spinePipe.position.set(0, R * 0.72, 0);
        this.internalGroup.add(spinePipe);

        // Válvulas reguladoras de soplado a los tanques de proa y popa
        const regValveGeo = new THREE.BoxGeometry(0.14, 0.14, 0.18);

        const fwdReg = new THREE.Mesh(regValveGeo, this.bronzeMat);
        fwdReg.position.set(0, R * 0.72, L * 0.25);
        this.internalGroup.add(fwdReg);

        const aftReg = new THREE.Mesh(regValveGeo, this.bronzeMat);
        aftReg.position.set(0, R * 0.72, -L * 0.25);
        this.internalGroup.add(aftReg);

        // Bajantes verticales de aire comprimido a la cúspide de cada tanque
        const dropPipeGeo = new THREE.CylinderGeometry(pipeRadius * 0.85, pipeRadius * 0.85, R * 0.25, 12);

        const fwdDrop = new THREE.Mesh(dropPipeGeo, this.copperPipeMat);
        fwdDrop.position.set(0, R * 0.58, L * 0.25);
        this.internalGroup.add(fwdDrop);

        const aftDrop = new THREE.Mesh(dropPipeGeo, this.copperPipeMat);
        aftDrop.position.set(0, R * 0.58, -L * 0.25);
        this.internalGroup.add(aftDrop);
    }

    /**
     * Tanques de Lastre Principal (MBT) y Tuberías de Inundación de Quilla
     */
    buildBallastTanks(R, L) {
        this.tankRadius = R * 0.60;
        this.tankLength = L * 0.28;

        const rEff = this.tankRadius * 0.98;
        const lEff = this.tankLength * 0.98;

        // Cilíndros translúcidos estructurales de tanque
        const tankVisGeo = new THREE.CylinderGeometry(this.tankRadius, this.tankRadius, this.tankLength, 28);
        tankVisGeo.rotateX(Math.PI / 2);

        const tankFront = new THREE.Mesh(tankVisGeo, this.tankShellMat);
        tankFront.position.set(0, 0, L * 0.25);
        this.internalGroup.add(tankFront);

        const tankBack = new THREE.Mesh(tankVisGeo, this.tankShellMat);
        tankBack.position.set(0, 0, -L * 0.25);
        this.internalGroup.add(tankBack);

        // Anillos metálicos de mamparo en los extremos de los tanques
        const bulkheadGeo = new THREE.TorusGeometry(this.tankRadius, 0.038, 12, 36);
        const fwdTankZ = L * 0.25;
        const aftTankZ = -L * 0.25;

        const bhFwd1 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhFwd1.position.z = fwdTankZ + this.tankLength / 2;
        this.internalGroup.add(bhFwd1);

        const bhFwd2 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhFwd2.position.z = fwdTankZ - this.tankLength / 2;
        this.internalGroup.add(bhFwd2);

        const bhAft1 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhAft1.position.z = aftTankZ + this.tankLength / 2;
        this.internalGroup.add(bhAft1);

        const bhAft2 = new THREE.Mesh(bulkheadGeo, this.detailMat);
        bhAft2.position.z = aftTankZ - this.tankLength / 2;
        this.internalGroup.add(bhAft2);

        // Colectores de Inundación de Fondo (Válvulas Kingston hacia la quilla)
        const floodPipeGeo = new THREE.CylinderGeometry(0.065, 0.065, R * 0.40, 16);
        const kingstonBoxGeo = new THREE.BoxGeometry(0.24, 0.12, 0.35);

        const fwdFloodPipe = new THREE.Mesh(floodPipeGeo, this.steelDarkMat);
        fwdFloodPipe.position.set(0, -this.tankRadius - 0.15, fwdTankZ);
        this.internalGroup.add(fwdFloodPipe);

        const fwdKingston = new THREE.Mesh(kingstonBoxGeo, this.detailMat);
        fwdKingston.position.set(0, -R * 0.90, fwdTankZ);
        this.internalGroup.add(fwdKingston);

        const aftFloodPipe = new THREE.Mesh(floodPipeGeo, this.steelDarkMat);
        aftFloodPipe.position.set(0, -this.tankRadius - 0.15, aftTankZ);
        this.internalGroup.add(aftFloodPipe);

        const aftKingston = new THREE.Mesh(kingstonBoxGeo, this.detailMat);
        aftKingston.position.set(0, -R * 0.90, aftTankZ);
        this.internalGroup.add(aftKingston);

        // Mallas de volumen de agua viva dentro de los tanques
        const waterGeo = new THREE.CylinderGeometry(rEff, rEff, lEff, 36);
        waterGeo.rotateX(Math.PI / 2);

        this.fwdWaterMesh = new THREE.Mesh(waterGeo, this.fwdWaterMat);
        this.fwdWaterMesh.position.set(0, 0, fwdTankZ);
        this.internalGroup.add(this.fwdWaterMesh);

        this.aftWaterMesh = new THREE.Mesh(waterGeo, this.aftWaterMat);
        this.aftWaterMesh.position.set(0, 0, aftTankZ);
        this.internalGroup.add(this.aftWaterMesh);

        // Superficies de nivel líquido horizontales (Meniscos dinámicos)
        const surfGeo = new THREE.PlaneGeometry(rEff * 2.0, lEff, 16, 16);
        surfGeo.rotateX(-Math.PI / 2);

        this.fwdWaterSurface = new THREE.Mesh(surfGeo, this.waterSurfaceMat.clone());
        this.fwdWaterSurface.position.set(0, 0, fwdTankZ);
        this.internalGroup.add(this.fwdWaterSurface);

        this.aftWaterSurface = new THREE.Mesh(surfGeo, this.waterSurfaceMat.clone());
        this.aftWaterSurface.position.set(0, 0, aftTankZ);
        this.internalGroup.add(this.aftWaterSurface);
    }

    /**
     * Sistema de aeración interna y micro-burbujas dentro de los tanques
     */
    initInternalTankAeration() {
        const count = 140;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const offsets = new Float32Array(count * 3);

        const L = this.hullCylLen;
        const rEff = this.tankRadius * 0.85;

        for (let i = 0; i < count; i++) {
            const isFwd = i < count / 2;
            const zCenter = isFwd ? (L * 0.25) : (-L * 0.25);

            const rx = (Math.random() - 0.5) * (rEff * 1.6);
            const ry = (Math.random() - 0.5) * (rEff * 0.6);
            const rz = zCenter + (Math.random() - 0.5) * (this.tankLength * 0.85);

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
            size: 0.20,
            map: tex,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.internalAerationPoints = new THREE.Points(geom, this.internalAerationMat);
        this.internalAerationOffsets = offsets;
        this.internalGroup.add(this.internalAerationPoints);
    }

    /**
     * Construcción de Vectores 3D de Fuerza (Empuje verde y Peso rojo)
     * Desplazamiento longitudinal sutil para evitar oclusión perfecta en vista cenital/nadir
     */
    buildForceVectors() {
        const R = this.SUB_RADIUS;

        // Flecha de Empuje (E): Inicia sobre la cumbre de la vela y apunta al cenit
        this.buoyancyArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, R + 1.8, 0),
            5.5,
            0x00e676,
            1.8,
            0.9
        );

        // Flecha de Peso (W): Inicia bajo la quilla y apunta al lecho marino
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

        // Desplazamiento lateral (eje X) para Empuje y Peso
        // Esto sitúa los rótulos en agua abierta a ambos lados del casco en vista cenital y nadir
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
            this.hullMat.opacity = 0.72;
            this.hullMat.transmission = 0.28;
        } else {
            this.hullMat.opacity = 0.95;
            this.hullMat.transmission = 0.05;
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

        // Rotación de la hélice propulsora de 7 palas según RPM
        const rpm = Number.isFinite(this.state.propellerRPM) ? this.state.propellerRPM : 0.0;
        const rps = rpm / 60.0;
        const deltaT = Number.isFinite(dt) ? dt : 0.016;
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

        const rEff = this.tankRadius * 0.98;
        const L = this.hullCylLen;

        // Perturbación ondulatoria del menisco durante llenado o soplado activo
        const isAgitated = this.state.isFilling || this.state.isBlowing;
        const waveJitter = isAgitated ? Math.sin(this.state.simTime * 14.0) * 0.012 : 0.0;

        // Vector normal local del tanque hacia abajo (0, -1, 0) transformado a coordenadas de mundo
        // Esto garantiza que el plano de corte siga exactamente la orientación del cilindro ante cabeceo
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

                this.fwdWaterSurface.position.set(0, yLocal + waveJitter, L * 0.25);
                this.fwdWaterSurface.scale.set(scaleX, 1.0, 1.0);

                // Transformar posición del menisco a coordenadas de mundo y fijar plano coplanar
                const localMeniscus = new THREE.Vector3(0, yLocal + waveJitter, L * 0.25);
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

                this.aftWaterSurface.position.set(0, yLocal + waveJitter, -L * 0.25);
                this.aftWaterSurface.scale.set(scaleX, 1.0, 1.0);

                const localMeniscus = new THREE.Vector3(0, yLocal + waveJitter, -L * 0.25);
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
    }
}
