/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * ParticleEffects.js - Dinámica de fluidos y partículas físicas:
 * 1. Nieve marina orgánica en suspensión abisal con deriva marina
 * 2. Pluma de soplado de aire de alta presión (Expulsión de burbujas en soplado de emergencia)
 * 3. Vórtices de cavitación en la hélice propulsora
 */

import * as THREE from 'three';

export class ParticleEffects {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.initMarineSnow();
        this.initBallastBubbles();
        this.initCavitationTrails();
    }

    /**
     * 1. Nieve Marina (Partículas orgánicas en suspensión abisal)
     */
    initMarineSnow() {
        const count = 1800;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        const rangeX = 140;
        const rangeY = 100;
        const rangeZ = 140;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * rangeX;
            positions[i3 + 1] = (Math.random() - 0.5) * rangeY;
            positions[i3 + 2] = (Math.random() - 0.5) * rangeZ;

            velocities[i3] = (Math.random() - 0.5) * 0.08;
            velocities[i3 + 1] = -0.03 - Math.random() * 0.05;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.08;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const tex = this.createCircleTexture(0.85, 0.95, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.32,
            map: tex,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.snowPoints = new THREE.Points(geom, mat);
        this.snowVelocities = velocities;
        this.snowRange = { x: rangeX, y: rangeY, z: rangeZ };
        this.scene.add(this.snowPoints);
    }

    /**
     * 2. Pluma de Burbujas de Alta Presión (Purga y Soplado de Lastre)
     */
    initBallastBubbles() {
        this.maxBubbles = 2400;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxBubbles * 3);
        const velocities = new Float32Array(this.maxBubbles * 3);
        const scales = new Float32Array(this.maxBubbles);
        const lifetimes = new Float32Array(this.maxBubbles);

        for (let i = 0; i < this.maxBubbles; i++) {
            positions[i * 3 + 1] = -9999;
            lifetimes[i] = 0;
            scales[i] = 1.0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const tex = this.createCircleTexture(0.75, 0.92, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.48,
            map: tex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.bubblePoints = new THREE.Points(geom, mat);
        this.bubbleVelocities = velocities;
        this.bubbleLifetimes = lifetimes;
        this.bubbleScales = scales;
        this.bubbleCursor = 0;
        this.scene.add(this.bubblePoints);
    }

    /**
     * 3. Vórtices de cavitación en la hélice propulsora
     */
    initCavitationTrails() {
        this.maxCav = 600;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxCav * 3);
        const velocities = new Float32Array(this.maxCav * 3);
        const lifetimes = new Float32Array(this.maxCav);

        for (let i = 0; i < this.maxCav; i++) {
            positions[i * 3 + 1] = -9999;
            lifetimes[i] = 0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const tex = this.createCircleTexture(0.5, 0.85, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.30,
            map: tex,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.cavPoints = new THREE.Points(geom, mat);
        this.cavVelocities = velocities;
        this.cavLifetimes = lifetimes;
        this.cavCursor = 0;
        this.scene.add(this.cavPoints);
    }

    createCircleTexture(r, g, b) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
        grad.addColorStop(0.0, `rgba(255, 255, 255, 1.0)`);
        grad.addColorStop(0.35, `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, 0.85)`);
        grad.addColorStop(0.70, `rgba(${Math.floor(r * 180)}, ${Math.floor(g * 220)}, 255, 0.40)`);
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

    emitBubble(x, y, z, vx, vy, vz) {
        const i = this.bubbleCursor;
        this.bubbleCursor = (this.bubbleCursor + 1) % this.maxBubbles;

        const pos = this.bubblePoints.geometry.attributes.position;
        pos.setXYZ(i, x, y, z);

        const i3 = i * 3;
        this.bubbleVelocities[i3] = vx + (Math.random() - 0.5) * 0.4;
        this.bubbleVelocities[i3 + 1] = vy + Math.random() * 1.2;
        this.bubbleVelocities[i3 + 2] = vz + (Math.random() - 0.5) * 0.4;
        this.bubbleLifetimes[i] = 1.0;
    }

    emitCavitation(x, y, z, vx, vy, vz) {
        const i = this.cavCursor;
        this.cavCursor = (this.cavCursor + 1) % this.maxCav;

        const pos = this.cavPoints.geometry.attributes.position;
        pos.setXYZ(i, x, y, z);

        const i3 = i * 3;
        this.cavVelocities[i3] = vx;
        this.cavVelocities[i3 + 1] = vy;
        this.cavVelocities[i3 + 2] = vz;
        this.cavLifetimes[i] = 1.0;
    }

    update(dt) {
        const subY = Number.isFinite(this.state.y) ? this.state.y : 0.0;

        // 1. Nieve Marina
        const snowPos = this.snowPoints.geometry.attributes.position;
        const rX = this.snowRange.x;
        const rY = this.snowRange.y;
        const rZ = this.snowRange.z;

        for (let i = 0; i < snowPos.count; i++) {
            const i3 = i * 3;
            let px = snowPos.getX(i) + this.snowVelocities[i3] * dt * 2.0;
            let py = snowPos.getY(i) + this.snowVelocities[i3 + 1] * dt * 2.0;
            let pz = snowPos.getZ(i) + this.snowVelocities[i3 + 2] * dt * 2.0;

            if (px < -rX / 2) px += rX;
            if (px > rX / 2) px -= rX;
            if (py < subY - rY / 2) py += rY;
            if (py > subY + rY / 2) py -= rY;
            if (pz < -rZ / 2) pz += rZ;
            if (pz > rZ / 2) pz -= rZ;

            snowPos.setXYZ(i, px, py, pz);
        }
        snowPos.needsUpdate = true;

        // 2. Generación Física de Burbujas de Purga y Soplado de Lastre (Aire Comprimido)
        const v = this.state.valves;
        const isBlowing = v.emergencyBlow || v.fwdBlow || v.aftBlow || this.state.isBlowing;
        const isFilling = this.state.isFilling;
        const pitch = Number.isFinite(this.state.pitch) ? this.state.pitch : 0.0;
        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);

        // A. Soplado de Aire Comprimido (Expulsión violenta de agua por toberas de inundación de quilla)
        if (isBlowing) {
            // Emisión de alto caudal: 20 paquetes en emergencia, 6 en soplado estándar
            const bubbleBatches = v.emergencyBlow ? 20 : 6;

            for (let k = 0; k < bubbleBatches; k++) {
                // Toberas de Tanque de Proa (alrededor de Z local = +2.38 m)
                const fwdLocalZ = 2.38 + (Math.random() - 0.5) * 1.6;
                const fwdX = (Math.random() - 0.5) * 1.2;
                const fwdY = subY - (1.45 * cosP) + (fwdLocalZ * sinP);
                const fwdZ = (fwdLocalZ * cosP) + (1.45 * sinP);

                // Chorro descendente inicial expulsado a alta presion que luego asciende por boyancia
                const blastVx = (Math.random() - 0.5) * 1.6;
                const blastVy = -0.5 - Math.random() * 1.2; // Sale hacia abajo
                const blastVz = (Math.random() - 0.5) * 1.2;
                this.emitBubble(fwdX, fwdY, fwdZ, blastVx, blastVy, blastVz);

                // Toberas de Tanque de Popa (alrededor de Z local = -2.38 m)
                const aftLocalZ = -2.38 + (Math.random() - 0.5) * 1.6;
                const aftX = (Math.random() - 0.5) * 1.2;
                const aftY = subY - (1.45 * cosP) + (aftLocalZ * sinP);
                const aftZ = (aftLocalZ * cosP) + (1.45 * sinP);
                this.emitBubble(aftX, aftY, aftZ, blastVx, blastVy, blastVz);

                // Chorro de escape lateral de aire en sobrepresión
                if (Math.random() < 0.35) {
                    const sideX = (Math.random() > 0.5 ? 1.4 : -1.4);
                    const ventY = subY + (0.2 * cosP);
                    this.emitBubble(sideX, ventY, fwdZ, sideX * 1.2, 1.5, 0);
                    this.emitBubble(sideX, ventY, aftZ, sideX * 1.2, 1.5, 0);
                }
            }
        } else if (isFilling && Math.random() < 0.6) {
            // Venteo de aire en la parte superior del casco cuando el agua inunda los tanques
            const topY = subY + (1.45 * cosP);
            const sideX = (Math.random() > 0.5 ? 0.35 : -0.35);
            const fwdZ = 2.38 + (Math.random() - 0.5) * 1.2;
            const aftZ = -2.38 + (Math.random() - 0.5) * 1.2;
            this.emitBubble(sideX, topY, fwdZ, sideX * 0.2, 2.0, 0);
            this.emitBubble(sideX, topY, aftZ, sideX * 0.2, 2.0, 0);
        }

        // Actualizar dinámica de ascenso boyante de las burbujas
        const bPos = this.bubblePoints.geometry.attributes.position;
        for (let i = 0; i < this.maxBubbles; i++) {
            if (this.bubbleLifetimes[i] > 0) {
                const i3 = i * 3;
                // Aceleración vertical por empuje boyante de Arquímedes sobre el aire
                this.bubbleVelocities[i3 + 1] += 3.8 * dt;
                // Deriva turbulenta y dispersión convectiva
                this.bubbleVelocities[i3] += (Math.random() - 0.5) * 0.35;
                this.bubbleVelocities[i3 + 2] += (Math.random() - 0.5) * 0.35;

                let px = bPos.getX(i) + this.bubbleVelocities[i3] * dt;
                let py = bPos.getY(i) + this.bubbleVelocities[i3 + 1] * dt;
                let pz = bPos.getZ(i) + this.bubbleVelocities[i3 + 2] * dt;

                // Las burbujas se desvanecen y revientan al llegar a la superficie marina (y = 0.0)
                if (py >= 0.0) {
                    this.bubbleLifetimes[i] = 0;
                    py = -9999;
                } else {
                    this.bubbleLifetimes[i] -= dt * 0.28;
                    if (this.bubbleLifetimes[i] <= 0) py = -9999;
                }
                bPos.setXYZ(i, px, py, pz);
            }
        }
        bPos.needsUpdate = true;

        // 3. Cavitación de la hélice propulsora (en la popa del submarino Z = -6.6)
        const rpm = Math.abs(this.state.propellerRPM);
        if (rpm > 30.0 && Math.random() < 0.65) {
            const propZ = -6.6; // En el extremo de popa (-Z)
            const cavAngle = Math.random() * Math.PI * 2;
            const tipX = Math.cos(cavAngle) * 0.65;
            const tipY = subY + Math.sin(cavAngle) * 0.65;
            const slipVz = Math.sign(this.state.propellerRPM) * (rpm / 60.0) * 4.0;
            this.emitCavitation(tipX, tipY, propZ, 0, 0.4, slipVz);
        }

        const cPos = this.cavPoints.geometry.attributes.position;
        for (let i = 0; i < this.maxCav; i++) {
            if (this.cavLifetimes[i] > 0) {
                const i3 = i * 3;
                let px = cPos.getX(i) + this.cavVelocities[i3] * dt;
                let py = cPos.getY(i) + this.cavVelocities[i3 + 1] * dt;
                let pz = cPos.getZ(i) + this.cavVelocities[i3 + 2] * dt;

                this.cavLifetimes[i] -= dt * 1.5;
                if (this.cavLifetimes[i] <= 0) py = -9999;
                cPos.setXYZ(i, px, py, pz);
            }
        }
        cPos.needsUpdate = true;

        // 4. Pluma de escape de aire residual continuo tras la implosión
        if (this.state.isImploded && Math.random() < 0.6) {
            const rx = (Math.random() - 0.5) * 1.2;
            const rz = (Math.random() - 0.5) * 5.0;
            this.emitBubble(rx, subY + 0.5, rz, (Math.random() - 0.5) * 0.4, 2.8, (Math.random() - 0.5) * 0.4);
        }
    }

    /**
     * Ráfaga masiva de cavitación y burbujas de aire a alta velocidad por implosión catastrófica
     */
    triggerImplosionBurst(subX = 0, subY = -35.0, subZ = 0) {
        const count = 450;
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = 4.0 + Math.random() * 9.5;

            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.sin(phi) * Math.sin(theta) * speed + 2.0;
            const vz = Math.cos(phi) * speed;

            const oz = (Math.random() - 0.5) * 7.5;
            const ox = (Math.random() - 0.5) * 1.6;
            const oy = (Math.random() - 0.5) * 1.6;

            this.emitBubble(subX + ox, subY + oy, subZ + oz, vx, vy, vz);
        }
    }
}
