/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * ParticleEffects.js - Efectos de partículas en suspensión y dinámica de fluidos:
 * Nieve marina orgánica, burbujas de purga de lastre, cavitación helicoidal y soplado de emergencia.
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
     * 1. Nieve Marina (Partículas orgánicas en suspensión abisal con deriva)
     */
    initMarineSnow() {
        const count = 2000;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        const rangeX = 160;
        const rangeY = 120;
        const rangeZ = 160;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * rangeX;
            positions[i3 + 1] = (Math.random() - 0.5) * rangeY;
            positions[i3 + 2] = (Math.random() - 0.5) * rangeZ;

            velocities[i3] = (Math.random() - 0.5) * 0.12;
            velocities[i3 + 1] = -0.04 - Math.random() * 0.08;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.12;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const tex = this.createCircleTexture(0.85, 0.95, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.35,
            map: tex,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.snowPoints = new THREE.Points(geom, mat);
        this.snowVelocities = velocities;
        this.snowRange = { x: rangeX, y: rangeY, z: rangeZ };
        this.scene.add(this.snowPoints);
    }

    /**
     * 2. Burbujas de venteo de tanques de lastre y soplado de aire
     */
    initBallastBubbles() {
        this.maxBubbles = 1200;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxBubbles * 3);
        const velocities = new Float32Array(this.maxBubbles * 3);
        const lifetimes = new Float32Array(this.maxBubbles);

        for (let i = 0; i < this.maxBubbles; i++) {
            positions[i * 3 + 1] = -9999;
            lifetimes[i] = 0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const tex = this.createCircleTexture(0.7, 0.9, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.45,
            map: tex,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.bubblePoints = new THREE.Points(geom, mat);
        this.bubbleVelocities = velocities;
        this.bubbleLifetimes = lifetimes;
        this.bubbleCursor = 0;
        this.scene.add(this.bubblePoints);
    }

    /**
     * 3. Vórtices de cavitación en la hélice de 7 palas
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
            size: 0.32,
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

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0.0, `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, 1.0)`);
        grad.addColorStop(0.5, `rgba(${Math.floor(r * 200)}, ${Math.floor(g * 220)}, 255, 0.45)`);
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
        this.bubbleVelocities[i3] = vx + (Math.random() - 0.5) * 0.3;
        this.bubbleVelocities[i3 + 1] = vy + Math.random() * 1.5;
        this.bubbleVelocities[i3 + 2] = vz + (Math.random() - 0.5) * 0.3;
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
        const subX = this.state.x;
        const subY = this.state.y;

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

            if (px < subX - rX / 2) px += rX;
            if (px > subX + rX / 2) px -= rX;
            if (py < subY - rY / 2) py += rY;
            if (py > subY + rY / 2) py -= rY;
            if (pz < -rZ / 2) pz += rZ;
            if (pz > rZ / 2) pz -= rZ;

            snowPos.setXYZ(i, px, py, pz);
        }
        snowPos.needsUpdate = true;

        // 2. Generación de burbujas según estado de válvulas y soplado
        const v = this.state.valves;
        if ((v.fwdFlood || v.aftFlood) && Math.random() < 0.7) {
            if (v.fwdFlood) this.emitBubble(subX + 3.0, subY + 2.5, (Math.random() - 0.5) * 1.5, -0.3, 2.4, 0);
            if (v.aftFlood) this.emitBubble(subX - 3.0, subY + 2.5, (Math.random() - 0.5) * 1.5, -0.3, 2.4, 0);
        }

        if (v.emergencyBlow || v.fwdBlow || v.aftBlow) {
            const count = v.emergencyBlow ? 5 : 2;
            for (let k = 0; k < count; k++) {
                this.emitBubble(subX + (Math.random() - 0.5) * 7.0, subY - 2.2, (Math.random() - 0.5) * 2.0, -0.5, 3.2, 0);
            }
        }

        // Actualizar burbujas activas
        const bPos = this.bubblePoints.geometry.attributes.position;
        for (let i = 0; i < this.maxBubbles; i++) {
            if (this.bubbleLifetimes[i] > 0) {
                const i3 = i * 3;
                let px = bPos.getX(i) + this.bubbleVelocities[i3] * dt;
                let py = bPos.getY(i) + this.bubbleVelocities[i3 + 1] * dt;
                let pz = bPos.getZ(i) + this.bubbleVelocities[i3 + 2] * dt;

                if (py >= 0.0) {
                    this.bubbleLifetimes[i] = 0;
                    py = -9999;
                } else {
                    this.bubbleLifetimes[i] -= dt * 0.4;
                }
                bPos.setXYZ(i, px, py, pz);
            }
        }
        bPos.needsUpdate = true;

        // 3. Cavitación de la hélice
        const rpm = Math.abs(this.state.propellerRPM);
        if (rpm > 30.0 && Math.random() < 0.6) {
            const propX = subX - 21.0;
            const cavAngle = Math.random() * Math.PI * 2;
            const tipY = subY + Math.sin(cavAngle) * 2.0;
            const tipZ = Math.cos(cavAngle) * 2.0;
            const slipVx = -Math.sign(this.state.propellerRPM) * (rpm / 60.0) * 8.0;
            this.emitCavitation(propX, tipY, tipZ, slipVx, 0.3, 0);
        }

        const cPos = this.cavPoints.geometry.attributes.position;
        for (let i = 0; i < this.maxCav; i++) {
            if (this.cavLifetimes[i] > 0) {
                const i3 = i * 3;
                let px = cPos.getX(i) + this.cavVelocities[i3] * dt;
                let py = cPos.getY(i) + this.cavVelocities[i3 + 1] * dt;
                let pz = cPos.getZ(i) + this.cavVelocities[i3 + 2] * dt;

                this.cavLifetimes[i] -= dt * 1.3;
                if (this.cavLifetimes[i] <= 0) py = -9999;
                cPos.setXYZ(i, px, py, pz);
            }
        }
        cPos.needsUpdate = true;
    }
}
