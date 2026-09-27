/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * SubmarineModel.js - Modelo 3D procedural con casco Albacore, materiales PBR,
 * sección transversal translúcida con refracción, tanques de lastre bifásicos animados,
 * timones en X, hélice sesgada de 7 palas y vectores dinámicos de fuerza con billboards HUD.
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

        // Referencias a mallas animables
        this.fwdWaterMesh = null;
        this.aftWaterMesh = null;
        this.translucentHullMesh = null;
        this.solidHullMeshes = [];
        this.propellerBlades = [];

        // Referencias a flechas de vectores y etiquetas
        this.buoyancyArrow = null;
        this.weightArrow = null;
        this.dragArrow = null;
        this.netArrow = null;

        this.buoyancyLabel = null;
        this.weightLabel = null;
        this.dragLabel = null;
        this.netLabel = null;

        this.initMaterials();
        this.buildAlbacoreHull();
        this.buildSailAndPlanes();
        this.buildXRudders();
        this.buildSkewed7BladePropeller();
        this.buildInternalStructureAndBallastTanks();
        this.buildNavigationalSpotlights();
        this.buildForceVectors();

        this.rootGroup.add(this.interiorGroup);
        this.rootGroup.add(this.hullGroup);
        this.rootGroup.add(this.exteriorGroup);
        this.rootGroup.add(this.vectorsGroup);

        this.scene.add(this.rootGroup);
    }

    /**
     * Inicializa materiales PBR realistas (acero naval, acrílico translúcido refractivo, etc.)
     */
    initMaterials() {
        // Generar textura procedural sutil de micro-relieve metálico para el casco
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 256;
        noiseCanvas.height = 256;
        const ctx = noiseCanvas.getContext('2d');
        const imgData = ctx.createImageData(256, 256);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const val = 120 + Math.floor(Math.random() * 25);
            imgData.data[i] = val;
            imgData.data[i + 1] = val + 5;
            imgData.data[i + 2] = val + 10;
            imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        const bumpTex = new THREE.CanvasTexture(noiseCanvas);
        bumpTex.wrapS = THREE.RepeatWrapping;
        bumpTex.wrapT = THREE.RepeatWrapping;
        bumpTex.repeat.set(4, 2);

        // 1. Acero Naval PBR exterior (Color antracita / táctico naval mate)
        this.hullPbrMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1b242e,
            metalness: 0.82,
            roughness: 0.32,
            clearcoat: 0.25,
            clearcoatRoughness: 0.15,
            bumpMap: bumpTex,
            bumpScale: 0.008,
        });

        // 2. Acero de la quilla / lecho inferior
        this.hullKeelMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x11161d,
            metalness: 0.88,
            roughness: 0.40,
        });

        // 3. Sección translúcida de inspección (Glassmorphism técnico con transmisión e IOR de agua marina)
        this.translucentMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            metalness: 0.05,
            roughness: 0.12,
            transmission: 0.84, // Refracción realista tipo cristal blindado
            ior: 1.333,         // Índice de refracción del agua
            thickness: 0.6,
            transparent: true,
            opacity: 0.88,
            specularIntensity: 0.9,
            depthWrite: false,
        });

        // 4. Casco de presión interno (Titanio / aleación HY-100 con mamparos)
        this.pressureHullMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a4454,
            metalness: 0.75,
            roughness: 0.45,
            wireframe: false,
        });

        // 5. Fluido de lastre (Agua marina interna con brillo cian luminoso)
        this.ballastWaterMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x00d4ff,
            emissive: 0x003355,
            emissiveIntensity: 0.4,
            metalness: 0.1,
            roughness: 0.15,
            transmission: 0.7,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
        });

        // 6. Bronce naval para la hélice propulsora de 7 palas
        this.propellerMaterial = new THREE.MeshStandardMaterial({
            color: 0xb58a45,
            metalness: 0.90,
            roughness: 0.28,
        });
    }

    /**
     * Construye el casco hidrodinámico Albacore mediante LatheGeometry
     * con curvatura elíptica en proa y cono estilizado en popa
     */
    buildAlbacoreHull() {
        const length = SUBMARINE_CONSTANTS.HULL_LENGTH;   // 42m (-21m a +21m)
        const maxRadius = SUBMARINE_CONSTANTS.HULL_DIAMETER / 2.0; // 2.8m

        // Generar perfil spline de revolución a lo largo del eje X
        // Proa redondeada (x = +21m), cuerpo cilíndrico central, popa ahusada (x = -21m)
        const profilePoints = [];
        const numSteps = 40;

        for (let i = 0; i <= numSteps; i++) {
            const u = i / numSteps; // 0 (popa) a 1 (proa)
            const x = -length / 2.0 + u * length; // de -21 a +21
            let r = 0;

            if (u >= 0.72) {
                // Proa elíptica convexa suave (Albacore nose)
                const bowU = (u - 0.72) / 0.28; // 0 a 1
                r = maxRadius * Math.sqrt(Math.max(0, 1.0 - Math.pow(1.0 - bowU, 2)));
            } else if (u >= 0.35) {
                // Cuerpo medio casi cilíndrico
                r = maxRadius;
            } else {
                // Popa ahusada cónico-cúbica que converge al cubo de la hélice
                const sternU = u / 0.35; // 0 a 1
                r = 0.65 + (maxRadius - 0.65) * Math.pow(sternU, 1.4);
            }

            profilePoints.push(new THREE.Vector2(r, x));
        }

        // 1. Sección proa sólida (x de +6m a +21m)
        const bowPoints = profilePoints.filter(p => p.y >= 6.0);
        if (bowPoints.length > 1) {
            const bowGeom = new THREE.LatheGeometry(bowPoints, 36);
            bowGeom.rotateZ(-Math.PI / 2); // Alinear eje de revolución con X
            const bowMesh = new THREE.Mesh(bowGeom, this.hullPbrMaterial);
            bowMesh.castShadow = true;
            this.hullGroup.add(bowMesh);
            this.solidHullMeshes.push(bowMesh);
        }

        // 2. Sección media translúcida con refracción para ver el interior (x de -6m a +6m)
        const midPoints = profilePoints.filter(p => p.y >= -6.0 && p.y <= 6.0);
        if (midPoints.length > 1) {
            const midGeom = new THREE.LatheGeometry(midPoints, 36);
            midGeom.rotateZ(-Math.PI / 2);
            this.translucentHullMesh = new THREE.Mesh(midGeom, this.translucentMaterial);
            this.hullGroup.add(this.translucentHullMesh);
        }

        // 3. Sección popa sólida (x de -21m a -6m)
        const sternPoints = profilePoints.filter(p => p.y <= -6.0);
        if (sternPoints.length > 1) {
            const sternGeom = new THREE.LatheGeometry(sternPoints, 36);
            sternGeom.rotateZ(-Math.PI / 2);
            const sternMesh = new THREE.Mesh(sternGeom, this.hullPbrMaterial);
            sternMesh.castShadow = true;
            this.hullGroup.add(sternMesh);
            this.solidHullMeshes.push(sternMesh);
        }
    }

    /**
     * Vela / Torre de Mando (Conning Tower) y planos de inmersión en la vela (Fairwater planes)
     */
    buildSailAndPlanes() {
        const sailGroup = new THREE.Group();
        sailGroup.position.set(4.5, 2.7, 0); // Ubicada hacia proa sobre el lomo

        // Estructura aerodinámica de la vela mediante extrusión con perfil de gota
        const sailShape = new THREE.Shape();
        sailShape.moveTo(-3.0, 0);
        sailShape.quadraticCurveTo(-2.8, 1.2, 0, 1.2);
        sailShape.quadraticCurveTo(2.8, 1.2, 3.2, 0);
        sailShape.quadraticCurveTo(2.8, -1.2, 0, -1.2);
        sailShape.quadraticCurveTo(-2.8, -1.2, -3.0, 0);
        sailShape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: SUBMARINE_CONSTANTS.SAIL_HEIGHT,
            bevelEnabled: true,
            bevelThickness: 0.25,
            bevelSize: 0.2,
            bevelSegments: 4,
        };

        const sailGeom = new THREE.ExtrudeGeometry(sailShape, extrudeSettings);
        sailGeom.rotateX(-Math.PI / 2);
        sailGeom.rotateY(-Math.PI / 2);
        const sailMesh = new THREE.Mesh(sailGeom, this.hullPbrMaterial);
        sailMesh.castShadow = true;
        sailGroup.add(sailMesh);

        // Mástiles, periscopio y antenas en el puente superior
        const mastGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0x444f5a, metalness: 0.9, roughness: 0.2 });

        const periscope1 = new THREE.Mesh(mastGeom, mastMat);
        periscope1.position.set(0.5, SUBMARINE_CONSTANTS.SAIL_HEIGHT + 0.8, 0);
        sailGroup.add(periscope1);

        const radarMast = new THREE.Mesh(mastGeom, mastMat);
        radarMast.position.set(-0.8, SUBMARINE_CONSTANTS.SAIL_HEIGHT + 0.7, 0);
        sailGroup.add(radarMast);

        // Planos de inmersión en la vela (Fairwater dive planes que giran según pitch command)
        this.fairwaterPlanesGroup.position.set(0.8, SUBMARINE_CONSTANTS.SAIL_HEIGHT * 0.55, 0);

        const planeShape = new THREE.Shape();
        planeShape.moveTo(-1.2, -0.1);
        planeShape.lineTo(1.2, -0.05);
        planeShape.lineTo(0.9, 0.1);
        planeShape.lineTo(-1.0, 0.08);
        planeShape.closePath();

        const planeGeom = new THREE.ExtrudeGeometry(planeShape, { depth: 2.2, bevelEnabled: false });
        planeGeom.center();

        // Plano babor (Starboard / Port)
        const leftPlane = new THREE.Mesh(planeGeom, this.hullPbrMaterial);
        leftPlane.position.z = 1.9;
        this.fairwaterPlanesGroup.add(leftPlane);

        const rightPlane = new THREE.Mesh(planeGeom, this.hullPbrMaterial);
        rightPlane.position.z = -1.9;
        this.fairwaterPlanesGroup.add(rightPlane);

        sailGroup.add(this.fairwaterPlanesGroup);
        this.exteriorGroup.add(sailGroup);
    }

    /**
     * Timones de popa en configuración en X (X-Rudders) para máxima maniobrabilidad
     */
    buildXRudders() {
        const rudderGroup = new THREE.Group();
        rudderGroup.position.set(-18.5, 0, 0);

        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(-3.2, 0);
        finShape.lineTo(-2.8, 3.2);
        finShape.lineTo(-0.8, 2.8);
        finShape.closePath();

        const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04 });
        finGeom.center();

        // 4 aletas a 45°, 135°, 225°, 315° (Geometría X-Rudder moderna tipo Gotland / Type 212)
        const angles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
        angles.forEach(ang => {
            const fin = new THREE.Mesh(finGeom, this.hullPbrMaterial);
            fin.rotation.x = ang;
            fin.position.y = Math.sin(ang) * 1.6;
            fin.position.z = Math.cos(ang) * 1.6;
            rudderGroup.add(fin);
        });

        this.exteriorGroup.add(rudderGroup);
    }

    /**
     * Hélice de skew pronunciado (7 palas altamente curvadas y silenciosas)
     */
    buildSkewed7BladePropeller() {
        this.propellerGroup.position.set(-21.2, 0, 0);

        // Cubo / ojiva central de la hélice
        const hubGeom = new THREE.ConeGeometry(0.65, 1.8, 24);
        hubGeom.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeom, this.propellerMaterial);
        this.propellerGroup.add(hub);

        // Geometría curva y sesgada (skewed blade) para cada una de las 7 palas
        const bladeCount = 7;
        const bladeRadius = 2.4;

        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2;
            const bladeGroup = new THREE.Group();
            bladeGroup.rotation.x = angle;

            // Curvatura de pala con perfil aerodinámico arqueado
            const bladeCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.1, 0.4, 0.0),
                new THREE.Vector3(0.0, 1.1, 0.35),
                new THREE.Vector3(-0.25, 1.8, 0.8),
                new THREE.Vector3(-0.4, bladeRadius, 1.1),
            ]);

            const bladeGeom = new THREE.TubeGeometry(bladeCurve, 16, 0.28, 8, false);
            bladeGeom.scale(0.35, 1.0, 2.8); // Aplanar para formar una pala laminar
            const bladeMesh = new THREE.Mesh(bladeGeom, this.propellerMaterial);
            bladeMesh.castShadow = true;

            bladeGroup.add(bladeMesh);
            this.propellerGroup.add(bladeGroup);
            this.propellerBlades.push(bladeMesh);
        }

        this.exteriorGroup.add(this.propellerGroup);
    }

    /**
     * Estructura interna: Casco de presión resistente, mamparos transversales y
     * tanques de lastre proa/popa con visualización animada del volumen bifásico (agua/aire)
     */
    buildInternalStructureAndBallastTanks() {
        // 1. Cilindro del casco de presión resistente con anillos de refuerzo
        const innerRadius = 2.2;
        const innerLength = 28.0;
        const innerGeom = new THREE.CylinderGeometry(innerRadius, innerRadius, innerLength, 24, 8, true);
        innerGeom.rotateZ(Math.PI / 2);
        const innerMesh = new THREE.Mesh(innerGeom, this.pressureHullMaterial);
        this.interiorGroup.add(innerMesh);

        // Mamparos transversales (Bulkheads)
        const bulkheadGeom = new THREE.CylinderGeometry(innerRadius, innerRadius, 0.2, 24);
        bulkheadGeom.rotateZ(Math.PI / 2);

        const bulkheadPositions = [-11, -5.5, 0, 5.5, 11];
        bulkheadPositions.forEach(xPos => {
            const bulkhead = new THREE.Mesh(bulkheadGeom, this.pressureHullMaterial);
            bulkhead.position.x = xPos;
            this.interiorGroup.add(bulkhead);
        });

        // 2. Tanque de Lastre Proa (Forward Main Ballast Tank) ubicado en x: +2.8m
        const tankLength = 4.8;
        const tankRadius = 1.95;

        // Estructura / armazón del tanque de proa
        const fwdTankFrameGeom = new THREE.CylinderGeometry(tankRadius, tankRadius, tankLength, 18, 1, true);
        fwdTankFrameGeom.rotateZ(Math.PI / 2);
        const tankWireMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.25 });
        const fwdTankFrame = new THREE.Mesh(fwdTankFrameGeom, tankWireMat);
        fwdTankFrame.position.set(2.75, 0, 0);
        this.interiorGroup.add(fwdTankFrame);

        // Malla de agua interna animable del tanque proa
        const fwdWaterGeom = new THREE.CylinderGeometry(tankRadius * 0.96, tankRadius * 0.96, tankLength * 0.96, 18);
        fwdWaterGeom.rotateZ(Math.PI / 2);
        this.fwdWaterMesh = new THREE.Mesh(fwdWaterGeom, this.ballastWaterMaterial);
        this.fwdWaterMesh.position.set(2.75, 0, 0);
        this.interiorGroup.add(this.fwdWaterMesh);

        // 3. Tanque de Lastre Popa (Aft Main Ballast Tank) ubicado en x: -2.8m
        const aftTankFrame = new THREE.Mesh(fwdTankFrameGeom, tankWireMat);
        aftTankFrame.position.set(-2.75, 0, 0);
        this.interiorGroup.add(aftTankFrame);

        const aftWaterGeom = new THREE.CylinderGeometry(tankRadius * 0.96, tankRadius * 0.96, tankLength * 0.96, 18);
        aftWaterGeom.rotateZ(Math.PI / 2);
        this.aftWaterMesh = new THREE.Mesh(aftWaterGeom, this.ballastWaterMaterial);
        this.aftWaterMesh.position.set(-2.75, 0, 0);
        this.interiorGroup.add(this.aftWaterMesh);

        // Maquinaria central / reactor / sala de control
        const coreGeom = new THREE.BoxGeometry(3.0, 1.8, 2.5);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9, roughness: 0.3 });
        const coreMesh = new THREE.Mesh(coreGeom, coreMat);
        coreMesh.position.set(0, -0.4, 0);
        this.interiorGroup.add(coreMesh);
    }

    /**
     * Focos submarinos delanteros de alta penetración lumínica en la proa
     */
    buildNavigationalSpotlights() {
        const spotLight = new THREE.SpotLight(0xaae8ff, 3.5);
        spotLight.position.set(19.5, 0.4, 0);
        spotLight.target.position.set(50.0, -5.0, 0);
        spotLight.angle = Math.PI / 6.0;
        spotLight.penumbra = 0.5;
        spotLight.distance = 180;
        spotLight.decay = 1.6;

        this.rootGroup.add(spotLight);
        this.rootGroup.add(spotLight.target);

        // Luces de posición de navegación tácticas
        const portLight = new THREE.PointLight(0xff2222, 1.2, 15); // Babor rojo
        portLight.position.set(4.5, 3.2, 1.8);
        this.rootGroup.add(portLight);

        const stbdLight = new THREE.PointLight(0x22ff44, 1.2, 15); // Estribor verde
        stbdLight.position.set(4.5, 3.2, -1.8);
        this.rootGroup.add(stbdLight);
    }

    /**
     * Construye las flechas 3D dinámicas autoescalables de vectores de fuerza (E, W, Fd, Fnet)
     * acompañadas de etiquetas Billboard HUD renderizadas en Canvas 2D
     */
    buildForceVectors() {
        // Flecha de Empuje Hidrostático E (Cian/Verde brillante, apunta hacia arriba +Y)
        this.buoyancyArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1.5, 0),
            10.0,
            0x00ffcc,
            2.0,
            1.0
        );

        // Flecha de Peso Dinámico W (Rojo/Ámbar, apunta hacia abajo -Y)
        this.weightArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, -1.5, 0),
            10.0,
            0xff3355,
            2.0,
            1.0
        );

        // Flecha de Arrastre Fd (Amarillo brillante, opuesta a vy)
        this.dragArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            5.0,
            0xffcc00,
            1.5,
            0.8
        );

        // Flecha de Fuerza Neta Fnet (Azul eléctrico / Púrpura)
        this.netArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            5.0,
            0x9955ff,
            1.5,
            0.8
        );

        this.vectorsGroup.add(this.buoyancyArrow);
        this.vectorsGroup.add(this.weightArrow);
        this.vectorsGroup.add(this.dragArrow);
        this.vectorsGroup.add(this.netArrow);

        // Crear sprites para texto HUD de cada fuerza
        this.buoyancyLabel = this.createHudLabel('E: 0 kN', '#00ffcc');
        this.weightLabel = this.createHudLabel('W: 0 kN', '#ff3355');
        this.dragLabel = this.createHudLabel('Fd: 0 kN', '#ffcc00');
        this.netLabel = this.createHudLabel('Fnet: 0 kN', '#9955ff');

        this.vectorsGroup.add(this.buoyancyLabel);
        this.vectorsGroup.add(this.weightLabel);
        this.vectorsGroup.add(this.dragLabel);
        this.vectorsGroup.add(this.netLabel);
    }

    /**
     * Genera un Sprite con textura Canvas 2D de alta resolución para anotaciones HUD
     */
    createHudLabel(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(7.5, 1.85, 1);
        sprite.userData = { canvas, ctx, texture, color };

        this.updateHudLabelText(sprite, text);
        return sprite;
    }

    /**
     * Actualiza el contenido gráfico del sprite HUD
     */
    updateHudLabelText(sprite, text) {
        const { canvas, ctx, texture, color } = sprite.userData;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fondo glassmorphism oscuro para la etiqueta
        ctx.fillStyle = 'rgba(7, 13, 24, 0.75)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
        ctx.fill();
        ctx.stroke();

        // Tipografía técnica monospace
        ctx.font = 'bold 24px "JetBrains Mono", "Courier New", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        texture.needsUpdate = true;
    }

    /**
     * Alterna la visibilidad translúcida de inspección interna
     */
    setCutawayMode(enabled) {
        this.state.hullCutaway = enabled;
        if (this.translucentHullMesh) {
            if (enabled) {
                this.translucentHullMesh.material = this.translucentMaterial;
            } else {
                this.translucentHullMesh.material = this.hullPbrMaterial;
            }
        }
    }

    /**
     * Actualiza posiciones, animaciones mecánicas, fluidos y vectores de fuerza
     * @param {number} dt - Delta time
     */
    update(dt) {
        // 1. Sincronizar posición y rotación cinemática del submarino
        this.rootGroup.position.set(this.state.x, this.state.y, 0);
        this.rootGroup.rotation.z = this.state.pitch;

        // 2. Rotación continua de la hélice de 7 palas según RPM
        const rps = this.state.propellerRPM / 60.0;
        this.propellerGroup.rotation.x += rps * Math.PI * 2 * dt;

        // 3. Rotación de los planos de inmersión en la vela según timón
        const planeRad = (this.state.divePlanesAngle * Math.PI) / 180.0;
        this.fairwaterPlanesGroup.rotation.z = -planeRad;

        // 4. Animación del nivel de agua en los tanques de lastre bifásicos
        const fwdFraction = Math.max(0.01, this.state.fwdBallastPct / 100.0);
        const aftFraction = Math.max(0.01, this.state.aftBallastPct / 100.0);

        if (this.fwdWaterMesh) {
            // El cilindro tiene su longitud en X; escalar en Y y Z para reflejar el llenado
            const scaleRad = Math.max(0.05, Math.sqrt(fwdFraction));
            this.fwdWaterMesh.scale.set(1.0, scaleRad, scaleRad);
            this.fwdWaterMesh.position.y = -1.95 * (1.0 - scaleRad) * 0.45;
        }

        if (this.aftWaterMesh) {
            const scaleRad = Math.max(0.05, Math.sqrt(aftFraction));
            this.aftWaterMesh.scale.set(1.0, scaleRad, scaleRad);
            this.aftWaterMesh.position.y = -1.95 * (1.0 - scaleRad) * 0.45;
        }

        // 5. Animación de deformación por implosión si se superó la cota de colapso
        if (this.state.isImploded) {
            const p = this.state.implosionProgress;
            // Aplastamiento brutal por presión hidrostática radial
            const crushScaleY = Math.max(0.18, 1.0 - p * 0.78);
            const crushScaleZ = Math.max(0.22, 1.0 - p * 0.72);
            this.hullGroup.scale.set(1.0 - p * 0.25, crushScaleY, crushScaleZ);
            this.interiorGroup.scale.set(1.0 - p * 0.35, crushScaleY * 0.8, crushScaleZ * 0.8);
        } else {
            // Deformación elástica normal sutil por compresibilidad
            const compFactor = this.state.currentHullVolume / SUBMARINE_CONSTANTS.BASELINE_VOLUME;
            const radialScale = Math.pow(compFactor, 1.0 / 3.0);
            this.hullGroup.scale.set(compFactor, radialScale, radialScale);
        }

        // 6. Actualización de vectores dinámicos de fuerza (autoescalables)
        this.vectorsGroup.visible = this.state.showForceVectors;
        if (this.state.showForceVectors) {
            // Factor de escala visual: 1 metro de flecha = ~400 kN
            const forceScale = 1.0 / 450000.0;
            const minArrowLen = 1.5;

            // Vector Empuje E (apunta hacia arriba)
            const eLen = Math.max(minArrowLen, this.state.buoyancyForce * forceScale);
            this.buoyancyArrow.setLength(eLen, Math.min(2.5, eLen * 0.25), 1.0);
            this.buoyancyLabel.position.set(2.0, eLen + 1.2, 0);
            this.updateHudLabelText(this.buoyancyLabel, `E: ${(this.state.buoyancyForce / 1000).toFixed(0)} kN`);

            // Vector Peso W (apunta hacia abajo)
            const wLen = Math.max(minArrowLen, this.state.weightForce * forceScale);
            this.weightArrow.setLength(wLen, Math.min(2.5, wLen * 0.25), 1.0);
            this.weightLabel.position.set(2.0, -wLen - 1.2, 0);
            this.updateHudLabelText(this.weightLabel, `W: ${(this.state.weightForce / 1000).toFixed(0)} kN`);

            // Vector Arrastre Fd (opuesto a la velocidad vertical)
            const fdMag = Math.abs(this.state.dragForceY);
            if (fdMag > 5000) {
                this.dragArrow.visible = true;
                this.dragLabel.visible = true;
                const fdDir = this.state.vy >= 0 ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 1, 0);
                this.dragArrow.setDirection(fdDir);
                const fdLen = Math.max(minArrowLen, fdMag * forceScale * 1.5);
                this.dragArrow.setLength(fdLen, Math.min(2.0, fdLen * 0.3), 0.8);
                this.dragLabel.position.set(-6.0, fdDir.y * (fdLen + 1.0), 0);
                this.updateHudLabelText(this.dragLabel, `Fd: ${(fdMag / 1000).toFixed(0)} kN`);
            } else {
                this.dragArrow.visible = false;
                this.dragLabel.visible = false;
            }

            // Vector Fuerza Neta Fnet
            const netMag = Math.abs(this.state.netForceY);
            if (netMag > 15000) {
                this.netArrow.visible = true;
                this.netLabel.visible = true;
                const netDir = this.state.netForceY >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
                this.netArrow.setDirection(netDir);
                const netLen = Math.max(minArrowLen, netMag * forceScale);
                this.netArrow.setLength(netLen, Math.min(2.0, netLen * 0.25), 0.9);
                this.netLabel.position.set(7.5, netDir.y * (netLen + 1.2), 0);
                this.updateHudLabelText(this.netLabel, `Fnet: ${(this.state.netForceY / 1000).toFixed(0)} kN`);
            } else {
                this.netArrow.visible = false;
                this.netLabel.visible = false;
            }
        }
    }
}
