/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * SubmarineModel.js - Modelo 3D de Ingeniería Naval de Alta Fidelidad
 * Casco Translúcido, Ecosistema Didáctico de Lastre (Botellones HP, Tuberías y Válvulas),
 * Vela Hidrodinámica Albacore, Hélice Skewed de 7 Palas y Planos de Corte Coplanar.
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
        // 1. Acero naval oscuro satinado (Proa, popa, vela, timones)
        this.steelDarkMat = new THREE.MeshStandardMaterial({
            color: 0x27343b,
            metalness: 0.75,
            roughness: 0.35,
        });

        // 2. Acero / Titanio claro (Cuadernas de refuerzo internas, bridas, vigas)
        this.detailMat = new THREE.MeshStandardMaterial({
            color: 0xcfd8dc,
            metalness: 0.75,
            roughness: 0.28,
        });

        // 3. Bronce naval pulido (Hélice propulsora de 7 palas, casquillos de válvulas)
        this.bronzeMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.88,
            roughness: 0.22,
        });

        // 4. Cobre / Latón neumático (Tuberías de soplado de aire de alta presión a 200 bar)
        this.copperPipeMat = new THREE.MeshStandardMaterial({
            color: 0xc87d46,
            metalness: 0.82,
            roughness: 0.25,
        });

        // 5. Botellones de aire comprimido (Acero templado a presión de 200 bar)
        this.airFlaskMat = new THREE.MeshStandardMaterial({
            color: 0x455a64,
            metalness: 0.78,
            roughness: 0.26,
        });

        // 6. Casco Cilíndrico Translúcido (Acrílico marino limpio con brillo de superficie)
        this.hullMat = new THREE.MeshPhysicalMaterial({
            color: 0xd0d0d0,
            metalness: 0.28,
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

        // 7. Contenedor de tanques de lastre (cilindro translúcido sutil)
        this.tankShellMat = new THREE.MeshStandardMaterial({
            color: 0x88ccdd,
            transparent: true,
            opacity: 0.12,
            roughness: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        // 8. Fluido de agua de lastre viva (Azul cian nítido y luminoso)
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
            emissiveIntensity: 0.40,
            transparent: true,
            opacity: 0.90,
            roughness: 0.05,
            side: THREE.DoubleSide,
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

        // 4. Ecosistema mecánico interior (Cuadernas, vigas, botellones, tuberías y tanques)
        this.buildInternalFrameworkAndMechanisms(R, L);
    }

    /**
     * 1. Casco Exterior con Anillos de Unión Estancos
     */
    buildOuterHull(R, L, T) {
        // A. Casco Central Cilíndrico Translúcido
        const mainHullGeo = new THREE.CylinderGeometry(R, R, L, 40);
        this.mainHull = new THREE.Mesh(mainHullGeo, this.hullMat);
        this.mainHull.rotation.x = Math.PI / 2;
        this.hullGroup.add(this.mainHull);

        // B. Anillos de Brida Reforzada (Juntas estancas entre acrílico y acero)
        const flangeGeo = new THREE.TorusGeometry(R * 1.015, 0.05, 16, 40);
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
        const sonarCapGeo = new THREE.SphereGeometry(R * 0.40, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const sonarCap = new THREE.Mesh(sonarCapGeo, this.detailMat);
        sonarCap.rotation.x = Math.PI / 2;
        sonarCap.position.z = L / 2 + R * 0.88;
        this.hullGroup.add(sonarCap);

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
     * 2. Vela Hidrodinámica Albacore y Planos de Inmersión
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

        // Timones de Inmersión en la Vela con perfil alar cónico (Fairwater Planes)
        const planeSpan = 1.35;
        const planeChord = 0.65;
        const planeThick = 0.09;

        const planeShape = new THREE.Shape();
        planeShape.moveTo(0, planeChord * 0.5);
        planeShape.bezierCurveTo(planeThick, planeChord * 0.3, planeThick, 0, 0, -planeChord * 0.5);
        planeShape.bezierCurveTo(-planeThick * 0.5, -planeChord * 0.3, -planeThick * 0.5, planeChord * 0.2, 0, planeChord * 0.5);

        const planeExtrude = {
            steps: 1,
            depth: planeSpan,
            bevelEnabled: true,
            bevelThickness: 0.04,
            bevelSize: 0.03,
            bevelSegments: 2,
        };
        const planeGeo = new THREE.ExtrudeGeometry(planeShape, planeExtrude);
        planeGeo.rotateZ(Math.PI / 2);
        planeGeo.center();

        const planeLeft = new THREE.Mesh(planeGeo, this.steelDarkMat);
        planeLeft.position.set(halfW + planeSpan / 2 + 0.02, sailHeight * 0.60, 0);
        this.fairwaterPlanesGroup.add(planeLeft);

        const planeRight = new THREE.Mesh(planeGeo, this.steelDarkMat);
        planeRight.position.set(-(halfW + planeSpan / 2 + 0.02), sailHeight * 0.60, 0);
        this.fairwaterPlanesGroup.add(planeRight);

        // Eje pasante del timón de inmersión
        const planeShaftGeo = new THREE.CylinderGeometry(0.045, 0.045, halfW * 2 + 0.1, 16);
        const planeShaft = new THREE.Mesh(planeShaftGeo, this.detailMat);
        planeShaft.rotation.z = Math.PI / 2;
        planeShaft.position.set(0, sailHeight * 0.60, 0);
        this.fairwaterPlanesGroup.add(planeShaft);

        sailGroup.add(this.fairwaterPlanesGroup);

        // Mástiles Retráctiles Detallados (Periscopios, radar y snorkel)
        // 1. Periscopio de ataque (esbelto con cabezal óptico)
        const mast1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.25, 16), this.detailMat);
        mast1.position.set(0.14, sailHeight + 0.60, halfL * 0.10);
        const opticHead1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.16, 16), this.bronzeMat);
        opticHead1.position.set(0.14, sailHeight + 1.22, halfL * 0.10);
        sailGroup.add(mast1);
        sailGroup.add(opticHead1);

        // 2. Periscopio de búsqueda y satélite
        const mast2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.95, 16), this.detailMat);
        mast2.position.set(-0.14, sailHeight + 0.45, -halfL * 0.15);
        const opticHead2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), this.steelDarkMat);
        opticHead2.position.set(-0.14, sailHeight + 0.92, -halfL * 0.15);
        sailGroup.add(mast2);
        sailGroup.add(opticHead2);

        // 3. Mástil Snorkel de inducción
        const mast3 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.70, 16), this.steelDarkMat);
        mast3.position.set(0, sailHeight + 0.32, -halfL * 0.45);
        sailGroup.add(mast3);

        this.hullGroup.add(sailGroup);
    }

    /**
     * 3. Hélice Naval Skewed de 7 Palas y Empenaje Cruciforme
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
        const capLeft = new THREE.Mesh(capGeo, this.detailMat);
        capLeft.position.set(finHeight * 0.95, 0, finZ);
        this.hullGroup.add(capLeft);

        const capRight = new THREE.Mesh(capGeo, this.detailMat);
        capRight.position.set(-finHeight * 0.95, 0, finZ);
        this.hullGroup.add(capRight);

        // B. Hélice Propulsora Skewed de 7 Palas en Bronce Naval
        this.propellerGroup.position.set(0, 0, -(L / 2 + T + 0.12));

        // Cubo ojival / spinner de hélice
        const propHubGeo = new THREE.ConeGeometry(0.20, 0.55, 24);
        const propHub = new THREE.Mesh(propHubGeo, this.bronzeMat);
        propHub.rotation.x = -Math.PI / 2;
        this.propellerGroup.add(propHub);

        // 7 palas con curvatura parabólica y alabeo de paso (Pitch / Skew)
        const numBlades = 7;
        const bladeSpan = 0.82;
        const bladeChord = 0.16;

        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.bezierCurveTo(bladeChord * 0.4, bladeSpan * 0.4, bladeChord * 0.6, bladeSpan * 0.8, bladeChord * 0.1, bladeSpan);
        bladeShape.bezierCurveTo(-bladeChord * 0.3, bladeSpan * 0.8, -bladeChord * 0.2, bladeSpan * 0.3, 0, 0);

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
     * 4. Ecosistema Mecánico Interior Completo (El Mecanismo de Hundimiento)
     */
    buildInternalFrameworkAndMechanisms(R, L) {
        // A. Cuadernas Anulares Maestras (6 Anillos estructurales)
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

        // C. Mamparos Estancos Centrales (Delimitación de la sala central de aire)
        const bulkheadRadius = R * 0.93;
        const bulkheadDiscGeo = new THREE.CylinderGeometry(bulkheadRadius, bulkheadRadius, 0.08, 36);
        bulkheadDiscGeo.rotateX(Math.PI / 2);

        // Mamparo estanco proel de la sala de máquinas (Z = +1.15)
        const fwdBulkhead = new THREE.Mesh(bulkheadDiscGeo, this.steelDarkMat);
        fwdBulkhead.position.z = 1.15;
        this.buildBulkheadDetails(fwdBulkhead, bulkheadRadius);
        this.internalGroup.add(fwdBulkhead);

        // Mamparo estanco popel de la sala de máquinas (Z = -1.15)
        const aftBulkhead = new THREE.Mesh(bulkheadDiscGeo, this.steelDarkMat);
        aftBulkhead.position.z = -1.15;
        this.buildBulkheadDetails(aftBulkhead, bulkheadRadius);
        this.internalGroup.add(aftBulkhead);

        // D. Banco de Botellones de Aire Comprimido (HP Air Flasks a 200 bar)
        this.buildHighPressureAirBank(R);

        // E. Tuberías Neumáticas de Soplado de Alta Presión (Cobre / Latón)
        this.buildPneumaticAirLines(R, L);

        // F. Tanques de Lastre MBT (Proa y Popa) con Colectores de Inundación de Quilla
        this.buildBallastTanks(R, L);

        // G. Partículas de Agitación y Aeración Interna en los Tanques
        this.initInternalTankAeration();
    }

    /**
     * Detalles del Mamparo Estanco (Puerta estanca circular y nervaduras radiales)
     */
    buildBulkheadDetails(bulkheadMesh, radius) {
        // Marco de escotilla estanca en el centro
        const hatchRingGeo = new THREE.TorusGeometry(radius * 0.35, 0.035, 12, 28);
        const hatchRing = new THREE.Mesh(hatchRingGeo, this.detailMat);
        bulkheadMesh.add(hatchRing);

        // Nervaduras radiales de refuerzo a presión
        const numSpokes = 8;
        const spokeGeo = new THREE.BoxGeometry(0.04, radius * 0.50, 0.03);
        for (let j = 0; j < numSpokes; j++) {
            const spoke = new THREE.Mesh(spokeGeo, this.detailMat);
            const ang = (Math.PI * 2 / numSpokes) * j;
            spoke.position.set(Math.cos(ang) * (radius * 0.65), Math.sin(ang) * (radius * 0.65), 0.02);
            spoke.rotation.z = ang;
            bulkheadMesh.add(spoke);
        }
    }

    /**
     * Banco Central de Botellones de Aire de Alta Presión (200 bar)
     */
    buildHighPressureAirBank(R) {
        const airBankGroup = new THREE.Group();
        airBankGroup.position.set(0, -R * 0.25, 0);

        const flaskRadius = 0.13;
        const flaskLength = 1.65;
        const flaskCylGeo = new THREE.CylinderGeometry(flaskRadius, flaskRadius, flaskLength, 20);
        flaskCylGeo.rotateX(Math.PI / 2);
        const flaskCapGeo = new THREE.SphereGeometry(flaskRadius, 16, 12);

        // Cuna soporte de los botellones
        const cradleGeo = new THREE.BoxGeometry(R * 1.10, 0.08, flaskLength * 0.85);
        const cradle = new THREE.Mesh(cradleGeo, this.detailMat);
        cradle.position.y = -0.32;
        airBankGroup.add(cradle);

        // 6 botellones de aire comprimido dispuestos en 2 capas de 3
        const flaskPositions = [
            [-0.32, -0.15], [0, -0.15], [0.32, -0.15],
            [-0.18, 0.15], [0.18, 0.15]
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
            valve.position.z = flaskLength / 2 + 0.16;
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

        // Inclinación aerodinámica de los timones de inmersión en la vela
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
            this.buoyancyLabel.position.set(0, eLen + 3.0, 0);

            const wLen = Math.max(minLen, Math.min(18.0, wForce * forceScale));
            this.weightArrow.setLength(wLen, Math.min(1.8, wLen * 0.25), 0.8);
            this.weightLabel.position.set(0, -(wLen + 3.0), 0);
        }
    }
}
