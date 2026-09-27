/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * ParticleSystems.js - Sistemas de partículas de alto rendimiento con GPU:
 * Nieve marina suspendida, burbujas de venteo de lastre, cavitación helicoidal de hélice,
 * polvo de colisión con el fondo e implosión violenta por colapso estructural.
 */

import * as THREE from 'three';

export class ParticleSystems {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.initMarineSnow();
        this.initBallastBubbles();
        this.initCavitationVortices();
        this.initImplosionBurst();
    }

    /**
     * 1. Nieve Marina (Marine Snow): Partículas orgánicas en suspensión abisal con deriva
     */
    initMarineSnow() {
        const count = 3000;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);

        const rangeX = 140;
        const rangeY = 120;
        const rangeZ = 140;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * rangeX;
            positions[i3 + 1] = (Math.random() - 0.5) * rangeY;
            positions[i3 + 2] = (Math.random() - 0.5) * rangeZ;

            velocities[i3] = (Math.random() - 0.5) * 0.15;
            velocities[i3 + 1] = -0.05 - Math.random() * 0.1; // Descenso suave
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.15;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Textura suave circular para cada partícula
        const snowTex = this.createParticleTexture(0.9, 0.95, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.45,
            map: snowTex,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.snowPoints = new THREE.Points(geom, mat);
        this.snowVelocities = velocities;
        this.snowRange = { x: rangeX, y: rangeY, z: rangeZ };
        this.scene.add(this.snowPoints);
    }

    /**
     * 2. Burbujas de tanques de lastre (Venteo superior e inyección de aire comprimido)
     */
    initBallastBubbles() {
        this.maxBubbles = 1500;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxBubbles * 3);
        const velocities = new Float32Array(this.maxBubbles * 3);
        const lifetimes = new Float32Array(this.maxBubbles);

        // Inicializar ocultas bajo el lecho
        for (let i = 0; i < this.maxBubbles; i++) {
            positions[i * 3 + 1] = -9999;
            lifetimes[i] = 0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

        const bubbleTex = this.createParticleTexture(0.7, 0.9, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.55,
            map: bubbleTex,
            transparent: true,
            opacity: 0.75,
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
     * 3. Vórtices de cavitación en las puntas de la hélice propulsora de 7 palas
     */
    initCavitationVortices() {
        this.maxCavitation = 800;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxCavitation * 3);
        const velocities = new Float32Array(this.maxCavitation * 3);
        const lifetimes = new Float32Array(this.maxCavitation);

        for (let i = 0; i < this.maxCavitation; i++) {
            positions[i * 3 + 1] = -9999;
            lifetimes[i] = 0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const cavTex = this.createParticleTexture(0.5, 0.85, 1.0);
        const mat = new THREE.PointsMaterial({
            size: 0.38,
            map: cavTex,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.cavitationPoints = new THREE.Points(geom, mat);
        this.cavVelocities = velocities;
        this.cavLifetimes = lifetimes;
        this.cavCursor = 0;
        this.scene.add(this.cavitationPoints);
    }

    /**
     * 4. Detonación de implosión por presión crítica (Colapso violento)
     */
    initImplosionBurst() {
        this.implosionCount = 2500;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(this.implosionCount * 3);
        const velocities = new Float32Array(this.implosionCount * 3);

        for (let i = 0; i < this.implosionCount; i++) {
            positions[i * 3 + 1] = -9999;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const burstTex = this.createParticleTexture(1.0, 0.95, 0.9);
        const mat = new THREE.PointsMaterial({
            size: 1.2,
            map: burstTex,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.implosionPoints = new THREE.Points(geom, mat);
        this.implosionVelocities = velocities;
        this.implosionActive = false;
        this.implosionTimer = 0.0;
        this.scene.add(this.implosionPoints);

        // Suscribirse al evento de implosión de State
        this.state.on('implosion', () => {
            this.triggerImplosion();
        });
    }

    /**
     * Genera dinámicamente un mapa circular suave con Canvas 2D
     */
    createParticleTexture(r, g, b) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0.0, `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, 1.0)`);
        grad.addColorStop(0.4, `rgba(${Math.floor(r * 200)}, ${Math.floor(g * 220)}, 255, 0.6)`);
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    /**
     * Dispara la detonación de implosión en la posición actual del submarino
     */
    triggerImplosion() {
        this.implosionActive = true;
        this.implosionTimer = 0.0;
        const posAttr = this.implosionPoints.geometry.attributes.position;
        const subX = this.state.x;
        const subY = this.state.y;

        for (let i = 0; i < this.implosionCount; i++) {
            const i3 = i * 3;
            // Punto de origen centrado en el casco
            posAttr.setXYZ(i, subX + (Math.random() - 0.5) * 8.0, subY + (Math.random() - 0.5) * 4.0, (Math.random() - 0.5) * 4.0);

            // Explosión radial y vórtice
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI;
            const speed = 12.0 + Math.random() * 25.0;

            this.implosionVelocities[i3] = Math.cos(phi) * Math.cos(theta) * speed;
            this.implosionVelocities[i3 + 1] = Math.sin(phi) * speed + 3.0; // Empuje ascendente
            this.implosionVelocities[i3 + 2] = Math.cos(phi) * Math.sin(theta) * speed;
        }

        posAttr.needsUpdate = true;
        this.implosionPoints.material.opacity = 0.95;
    }

    /**
     * Emite una burbuja desde una posición dada
     */
    emitBubble(x, y, z, vx, vy, vz, size) {
        const i = this.bubbleCursor;
        this.bubbleCursor = (this.bubbleCursor + 1) % this.maxBubbles;

        const posAttr = this.bubblePoints.geometry.attributes.position;
        posAttr.setXYZ(i, x, y, z);

        const i3 = i * 3;
        this.bubbleVelocities[i3] = vx + (Math.random() - 0.5) * 0.4;
        this.bubbleVelocities[i3 + 1] = Math.max(1.2, vy + Math.random() * 2.0); // Flotabilidad de burbuja hacia arriba
        this.bubbleVelocities[i3 + 2] = vz + (Math.random() - 0.5) * 0.4;
        this.bubbleLifetimes[i] = 1.0; // Vida útil
    }

    /**
     * Emite partícula de cavitación de hélice
     */
    emitCavitation(x, y, z, vx, vy, vz) {
        const i = this.cavCursor;
        this.cavCursor = (this.cavCursor + 1) % this.maxCavitation;

        const posAttr = this.cavitationPoints.geometry.attributes.position;
        posAttr.setXYZ(i, x, y, z);

        const i3 = i * 3;
        this.cavVelocities[i3] = vx;
        this.cavVelocities[i3 + 1] = vy;
        this.cavVelocities[i3 + 2] = vz;
        this.cavLifetimes[i] = 1.0;
    }

    /**
     * Ciclo de actualización de todas las partículas
     * @param {number} dt - Delta time
     */
    update(dt) {
        const subX = this.state.x;
        const subY = this.state.y;

        // 1. Actualizar Nieve Marina (Envoltura toroidal centrada en el submarino)
        const snowPos = this.snowPoints.geometry.attributes.position;
        const rX = this.snowRange.x;
        const rY = this.snowRange.y;
        const rZ = this.snowRange.z;

        for (let i = 0; i < snowPos.count; i++) {
            const i3 = i * 3;
            let px = snowPos.getX(i) + this.snowVelocities[i3] * dt * 2.0;
            let py = snowPos.getY(i) + this.snowVelocities[i3 + 1] * dt * 2.0;
            let pz = snowPos.getZ(i) + this.snowVelocities[i3 + 2] * dt * 2.0;

            // Envolver respecto al submarino para dar continuidad infinita
            if (px < subX - rX / 2) px += rX;
            if (px > subX + rX / 2) px -= rX;
            if (py < subY - rY / 2) py += rY;
            if (py > subY + rY / 2) py -= rY;
            if (pz < -rZ / 2) pz += rZ;
            if (pz > rZ / 2) pz -= rZ;

            snowPos.setXYZ(i, px, py, pz);
        }
        snowPos.needsUpdate = true;

        // 2. Generar burbujas de venteo según estado de válvulas
        const v = this.state.valves;
        const isFlooding = v.fwdFlood || v.aftFlood;
        const isBlowing = v.fwdBlow || v.aftBlow || v.emergencyBlow;

        if (isFlooding && Math.random() < 0.85) {
            // Venteo superior de tanques de proa y popa (expulsa aire para admitir agua)
            if (v.fwdFlood) {
                this.emitBubble(subX + 3.2, subY + 2.6, (Math.random() - 0.5) * 2.0, -0.4, 2.8, 0, 0.4);
            }
            if (v.aftFlood) {
                this.emitBubble(subX - 3.2, subY + 2.6, (Math.random() - 0.5) * 2.0, -0.4, 2.8, 0, 0.4);
            }
        }

        if (isBlowing) {
            const count = v.emergencyBlow ? 6 : 2;
            for (let k = 0; k < count; k++) {
                // Descarga inferior de agua desplazada por aire comprimido
                this.emitBubble(subX + (Math.random() - 0.5) * 8.0, subY - 2.5, (Math.random() - 0.5) * 2.2, -0.8, 3.5, 0, 0.6);
            }
        }

        // Actualizar burbujas vivas
        const bubblePos = this.bubblePoints.geometry.attributes.position;
        for (let i = 0; i < this.maxBubbles; i++) {
            if (this.bubbleLifetimes[i] > 0) {
                const i3 = i * 3;
                let px = bubblePos.getX(i) + this.bubbleVelocities[i3] * dt;
                let py = bubblePos.getY(i) + this.bubbleVelocities[i3 + 1] * dt;
                let pz = bubblePos.getZ(i) + this.bubbleVelocities[i3 + 2] * dt;

                // Las burbujas se desvanecen al llegar a la superficie del mar (y = 0)
                if (py >= 0.0) {
                    this.bubbleLifetimes[i] = 0;
                    py = -9999;
                } else {
                    this.bubbleLifetimes[i] -= dt * 0.35;
                }

                bubblePos.setXYZ(i, px, py, pz);
            }
        }
        bubblePos.needsUpdate = true;

        // 3. Generar vórtices helicoidales de cavitación en la hélice
        const rpm = Math.abs(this.state.propellerRPM);
        if (rpm > 25.0 && Math.random() < 0.65) {
            const propX = subX - 21.2;
            const propY = subY;
            const cavAngle = Math.random() * Math.PI * 2;
            const cavRadius = 2.1;

            const tipY = propY + Math.sin(cavAngle) * cavRadius;
            const tipZ = Math.cos(cavAngle) * cavRadius;

            // Velocidad de vórtice arrastrada hacia popa
            const slipStreamVx = -Math.sign(this.state.propellerRPM) * (rpm / 60.0) * 8.5;
            this.emitCavitation(propX, tipY, tipZ, slipStreamVx, 0.4, 0);
        }

        // Actualizar partículas de cavitación
        const cavPos = this.cavitationPoints.geometry.attributes.position;
        for (let i = 0; i < this.maxCavitation; i++) {
            if (this.cavLifetimes[i] > 0) {
                const i3 = i * 3;
                let px = cavPos.getX(i) + this.cavVelocities[i3] * dt;
                let py = cavPos.getY(i) + this.cavVelocities[i3 + 1] * dt;
                let pz = cavPos.getZ(i) + this.cavVelocities[i3 + 2] * dt;

                this.cavLifetimes[i] -= dt * 1.2;
                if (this.cavLifetimes[i] <= 0) {
                    py = -9999;
                }
                cavPos.setXYZ(i, px, py, pz);
            }
        }
        cavPos.needsUpdate = true;

        // 4. Actualizar nube de implosión si está activa
        if (this.implosionActive) {
            this.implosionTimer += dt;
            const impPos = this.implosionPoints.geometry.attributes.position;

            for (let i = 0; i < this.implosionCount; i++) {
                const i3 = i * 3;
                let px = impPos.getX(i) + this.implosionVelocities[i3] * dt;
                let py = impPos.getY(i) + this.implosionVelocities[i3 + 1] * dt;
                let pz = impPos.getZ(i) + this.implosionVelocities[i3 + 2] * dt;

                // Freno hidrodinámico en la nube expansiva
                this.implosionVelocities[i3] *= 0.94;
                this.implosionVelocities[i3 + 1] = this.implosionVelocities[i3 + 1] * 0.94 + 1.2 * dt; // Flotabilidad
                this.implosionVelocities[i3 + 2] *= 0.94;

                impPos.setXYZ(i, px, py, pz);
            }
            impPos.needsUpdate = true;

            // Atenuación gradual de la nube
            this.implosionPoints.material.opacity = Math.max(0.0, 0.95 - this.implosionTimer * 0.22);
            if (this.implosionTimer > 4.5) {
                this.implosionActive = false;
            }
        }
    }
}
