/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * PhysicsEngine.js - Solucionador numérico Runge-Kutta 4 (RK4) con sub-stepping
 * Cálculo riguroso de Empuje Arquímedes, Peso Dinámico, Compresibilidad y Arrastre Cuadrático
 */

import { PHYSICS_CONSTANTS, SUBMARINE_CONSTANTS, ENVIRONMENT_CONSTANTS } from '../config/constants.js';

export class PhysicsEngine {
    constructor(state) {
        this.state = state;
    }

    /**
     * Calcula la fracción de volumen sumergido eta(y) de forma suave (C1 continua)
     * para evitar discontinuidades numéricas en el integrador RK4.
     * @param {number} y - Posición vertical del eje central del submarino (m)
     * @returns {number} eta entre 0.0 (totalmente fuera del agua) y 1.0 (totalmente sumergido)
     */
    calculateSubmersionRatio(y) {
        // En y = 0.0 (superficie del mar), el casco cilíndrico está sumergido en un 90%
        // con reserva de flotabilidad del 10% (densidad en seco ~923 kg/m3).
        if (y <= -0.4) {
            return 1.0; // Casco y vela totalmente sumergidos
        }
        if (y >= 1.8) {
            return 0.0; // Completamente fuera del agua
        }

        // Interpolación suave y físicamente consistente:
        // A y = 0.2 (flotando en superficie), eta ~ 0.92, logrando E > W (Emergiendo)
        const t = (1.8 - y) / 2.2;
        const clampedT = Math.max(0.0, Math.min(1.0, t));
        return Math.min(1.0, Math.pow(clampedT, 0.45));
    }

    /**
     * Calcula el volumen actual del casco considerando la compresibilidad elástica
     * bajo presión hidrostática (Ley de Hooke volumétrica: Delta_V = -V0 * beta * P_gauge)
     * @param {number} depth - Profundidad en metros (h = -y)
     * @returns {number} Volumen comprimido en m^3
     */
    calculateCompressedVolume(depth) {
        if (depth <= 0) return SUBMARINE_CONSTANTS.BASELINE_VOLUME;

        // Si ya ocurrió la implosión, el volumen colapsa al 38%
        if (this.state.isImploded) {
            const p = this.state.implosionProgress;
            const collapseFactor = 0.88 - (0.50 * p); // De 88% a 38%
            return SUBMARINE_CONSTANTS.BASELINE_VOLUME * collapseFactor;
        }

        const beta = SUBMARINE_CONSTANTS.HULL_COMPRESSIBILITY_BETA * this.state.compressibilityMultiplier;
        const pGauge = this.state.waterDensity * this.state.gravity * depth;
        const volumetricStrain = beta * pGauge; // Deformación volumétrica adimensional
        
        // El volumen disminuye a mayor profundidad: V(h) = V0 * (1 - beta * rho * g * h)
        return SUBMARINE_CONSTANTS.BASELINE_VOLUME * Math.max(0.60, (1.0 - volumetricStrain));
    }

    /**
     * Evalúa las fuerzas verticales instantáneas en un estado hipotético dado
     * Función vectorial f(t, s) para el resolvedor RK4
     * @param {number} y - Posición vertical
     * @param {number} vy - Velocidad vertical
     * @param {number} mass - Masa total actual (casco + lastre)
     * @returns {Object} Desglose de fuerzas { E, W, Fd, Fbed, netForce, ay }
     */
    evaluateVerticalForces(y, vy, mass) {
        const depth = Math.max(0, -y);
        const eta = this.calculateSubmersionRatio(y);
        const volume = this.calculateCompressedVolume(depth);

        // 1. Empuje Hidrostático de Arquímedes con compresibilidad y sumersión:
        // E(y) = rho_agua * V(y) * g * eta(y)
        const density = this.state.waterDensity;
        const g = this.state.gravity;
        const E = density * volume * g * eta;

        // 2. Peso Dinámico total: W(t) = m_total(t) * g
        const W = mass * g;

        // 3. Arrastre Hidrodinámico Cuadrático (Morison / Ecuación de arrastre de Navier-Stokes):
        // Fd(vy) = 0.5 * Cd * A * rho_eff * vy * |vy|
        // Para movimiento vertical el área de sección en planta es dominante
        const Cd = SUBMARINE_CONSTANTS.CD_VERTICAL * this.state.dragMultiplier;
        const planformArea = SUBMARINE_CONSTANTS.AREA_PLANFORM;
        
        // Densidad efectiva depende del grado de sumersión
        const rhoEff = (density * eta) + (PHYSICS_CONSTANTS.DENSITY_AIR * (1.0 - eta));
        const Fd = 0.5 * Cd * planformArea * rhoEff * vy * Math.abs(vy);

        // 4. Interacción con el fondo marino (Lecho oceánico):
        // Modelo viscoelástico tipo Kelvin-Voigt (resorte + amortiguador) para prevenir penetración
        let Fbed = 0.0;
        const hullKeelY = y - (SUBMARINE_CONSTANTS.HULL_DIAMETER / 2.0);
        const seabedY = -ENVIRONMENT_CONSTANTS.SEABED_DEPTH;

        if (hullKeelY < seabedY) {
            const penetration = seabedY - hullKeelY;
            const springForce = ENVIRONMENT_CONSTANTS.SEABED_SPRING_K * penetration;
            const dampingForce = -ENVIRONMENT_CONSTANTS.SEABED_DAMPING_C * vy;
            Fbed = Math.max(0.0, springForce + dampingForce);
        }

        // Sumatoria de fuerzas verticales (Eje Y positivo hacia arriba):
        // m * ay = E - W - Fd + Fbed
        const netForce = E - W - Fd + Fbed;
        const ay = netForce / Math.max(1000.0, mass);

        return { E, W, Fd, Fbed, netForce, ay, eta, volume };
    }

    /**
     * Paso de integración numérica Runge-Kutta de 4to orden (RK4) para el estado vertical
     * [y, vy]' = [vy, ay(y, vy, m)]
     * @param {number} dt - Intervalo de tiempo del sub-paso (segundos)
     * @param {number} currentMass - Masa en el sub-paso
     */
    rk4StepVertical(dt, currentMass) {
        const y0 = this.state.y;
        const v0 = this.state.vy;

        // k1: Derivadas al inicio del intervalo
        const f1 = this.evaluateVerticalForces(y0, v0, currentMass);
        const dy1 = v0;
        const dv1 = f1.ay;

        // k2: Derivadas en el punto medio con pendientes k1
        const y1 = y0 + 0.5 * dt * dy1;
        const v1 = v0 + 0.5 * dt * dv1;
        const f2 = this.evaluateVerticalForces(y1, v1, currentMass);
        const dy2 = v1;
        const dv2 = f2.ay;

        // k3: Derivadas en el punto medio con pendientes k2
        const y2 = y0 + 0.5 * dt * dy2;
        const v2 = v0 + 0.5 * dt * dv2;
        const f3 = this.evaluateVerticalForces(y2, v2, currentMass);
        const dy3 = v2;
        const dv3 = f3.ay;

        // k4: Derivadas al final del intervalo con pendientes k3
        const y3 = y0 + dt * dy3;
        const v3 = v0 + dt * dv3;
        const f4 = this.evaluateVerticalForces(y3, v3, currentMass);
        const dy4 = v3;
        const dv4 = f4.ay;

        // Promedio ponderado de Simpson para RK4: s_next = s + dt/6 * (k1 + 2k2 + 2k3 + k4)
        const nextY = y0 + (dt / 6.0) * (dy1 + 2.0 * dy2 + 2.0 * dy3 + dy4);
        const nextVy = v0 + (dt / 6.0) * (dv1 + 2.0 * dv2 + 2.0 * dv3 + dv4);

        // Guardar valores integrados
        this.state.y = nextY;
        this.state.vy = nextVy;

        // Calcular fuerzas diagnósticas al final del paso
        const finalForces = this.evaluateVerticalForces(nextY, nextVy, currentMass);
        this.state.ay = finalForces.ay;
        this.state.buoyancyForce = finalForces.E;
        this.state.weightForce = finalForces.W;
        this.state.dragForceY = finalForces.Fd;
        this.state.seabedContactForce = finalForces.Fbed;
        this.state.netForceY = finalForces.netForce;
        this.state.submersionRatio = finalForces.eta;
        this.state.currentHullVolume = finalForces.volume;
    }

    /**
     * Dinámica de tanques de lastre (Inundación y Soplado de aire)
     * dm/dt = rho * (dV_in/dt - dV_out/dt)
     * @param {number} dt - Paso de tiempo
     */
    updateBallastTanks(dt) {
        const v = this.state.valves;
        let fwdRate = 0.0;
        let aftRate = 0.0;

        // 1. Inundación (Flood)
        if (v.fwdFlood) fwdRate += SUBMARINE_CONSTANTS.FLOOD_RATE_NORMAL;
        if (v.aftFlood) aftRate += SUBMARINE_CONSTANTS.FLOOD_RATE_NORMAL;

        // 2. Soplado estándar (Blow)
        if (v.fwdBlow) fwdRate -= SUBMARINE_CONSTANTS.BLOW_RATE_NORMAL;
        if (v.aftBlow) aftRate -= SUBMARINE_CONSTANTS.BLOW_RATE_NORMAL;

        // 3. Soplado de Emergencia (Emergency Blow: expulsa ambos tanques a máxima tasa)
        if (v.emergencyBlow) {
            fwdRate -= SUBMARINE_CONSTANTS.BLOW_RATE_EMERGENCY;
            aftRate -= SUBMARINE_CONSTANTS.BLOW_RATE_EMERGENCY;
            
            // Si ambos tanques están completamente vacíos, apagar soplado de emergencia automáticamente
            if (this.state.fwdBallastVolume <= 0.01 && this.state.aftBallastVolume <= 0.01) {
                v.emergencyBlow = false;
            }
        }

        // Integración de volumen de lastre con límites de capacidad
        this.state.fwdBallastVolume = Math.max(
            0.0,
            Math.min(SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_FWD, this.state.fwdBallastVolume + fwdRate * dt)
        );

        this.state.aftBallastVolume = Math.max(
            0.0,
            Math.min(SUBMARINE_CONSTANTS.BALLAST_MAX_VOLUME_AFT, this.state.aftBallastVolume + aftRate * dt)
        );

        // Actualizar temporizadores y estados de animación
        if (this.state.fillingTimer > 0) {
            this.state.fillingTimer -= dt;
            this.state.isFilling = (this.state.fillingTimer > 0);
        } else {
            this.state.isFilling = (v.fwdFlood || v.aftFlood);
        }

        if (this.state.blowingTimer > 0) {
            this.state.blowingTimer -= dt;
            this.state.isBlowing = (this.state.blowingTimer > 0) || v.emergencyBlow;
        } else {
            this.state.isBlowing = (v.emergencyBlow || v.fwdBlow || v.aftBlow);
        }
    }

    /**
     * Dinámica de propulsión horizontal y momento de cabeceo (Pitch)
     * @param {number} dt - Paso de tiempo
     */
    updateHorizontalAndPitch(dt) {
        // Actualizar RPM según acelerador
        const targetRPM = this.state.throttle * SUBMARINE_CONSTANTS.MAX_PROPELLER_RPM;
        this.state.propellerRPM += (targetRPM - this.state.propellerRPM) * Math.min(1.0, dt * 2.5);

        // Empuje del propulsor proporcional al cuadrado de RPM
        const rpmNorm = this.state.propellerRPM / SUBMARINE_CONSTANTS.MAX_PROPELLER_RPM;
        const thrust = Math.sign(rpmNorm) * Math.pow(rpmNorm, 2) * SUBMARINE_CONSTANTS.MAX_THRUST * this.state.submersionRatio;

        // Arrastre longitudinal frontal: Fd_x = 0.5 * Cd_x * A_front * rho * vx * |vx|
        const Cd_front = SUBMARINE_CONSTANTS.CD_FORWARD * this.state.dragMultiplier;
        const Fd_x = 0.5 * Cd_front * SUBMARINE_CONSTANTS.AREA_FRONTAL * this.state.waterDensity * this.state.vx * Math.abs(this.state.vx);

        this.state.ax = (thrust - Fd_x) / this.state.totalMass;
        this.state.vx += this.state.ax * dt;
        this.state.x += this.state.vx * dt;

        // Dinámica de cabeceo:
        // 1. Momento por diferencial de lastre (si proa tiene más agua, cabeceo a picar negativo)
        const ballastDiff = this.state.fwdBallastVolume - this.state.aftBallastVolume;
        const mBallast = -ballastDiff * this.state.waterDensity * this.state.gravity * 8.0; // Brazo de palanca ~8m

        // 2. Momento restaurador hidrostático (Altura metacéntrica BG > 0 garantiza estabilidad pasiva)
        // M_restoring = -W * BG * sin(pitch)
        const BG = 0.65; // metros de separación entre CB y CG
        const mRestoring = -this.state.totalMass * this.state.gravity * BG * Math.sin(this.state.pitch);

        // 3. Momento hidrodinámico por planos de inmersión dependiente de velocidad de avance
        const planeRad = (this.state.divePlanesAngle * Math.PI) / 180.0;
        const mPlanes = 0.5 * this.state.waterDensity * Math.pow(this.state.vx, 2) * 12.0 * Math.sin(planeRad) * 14.0;

        // Amortiguamiento angular hidrodinámico
        const mDamping = -3500000.0 * this.state.pitchRate;

        // Momento total de inercia aproximado: I_zz ~ 1/12 * M * L^2
        const Izz = (1.0 / 12.0) * this.state.totalMass * Math.pow(SUBMARINE_CONSTANTS.HULL_LENGTH, 2);
        const pitchAccel = (mBallast + mRestoring + mPlanes + mDamping) / Izz;

        this.state.pitchRate += pitchAccel * dt;
        this.state.pitch += this.state.pitchRate * dt;

        // Límite de cabeceo para evitar giros irreales
        this.state.pitch = Math.max(-0.6, Math.min(0.6, this.state.pitch));
    }

    /**
     * Monitorea la integridad estructural y simula la implosión por presión crítica
     * @param {number} dt - Paso de tiempo
     */
    updateStructuralIntegrity(dt) {
        const depth = Math.max(0, -this.state.y);

        if (depth >= SUBMARINE_CONSTANTS.CRUSH_DEPTH) {
            // Se sobrepasó la profundidad de colapso: la presión supera el límite elástico
            const excess = depth - SUBMARINE_CONSTANTS.CRUSH_DEPTH;
            const decayRate = 50.0 + excess * 10.0; // Colapso catastrófico en menos de 0.6s
            this.state.structuralIntegrity = Math.max(0.0, this.state.structuralIntegrity - decayRate * dt);

            if (this.state.structuralIntegrity <= 0.0 && !this.state.isImploded) {
                this.state.isImploded = true;
                this.state.implosionTriggered = true;
                this.state.emit('implosion', { depth, pressure: this.state.hydrostaticPressure });
            }
        } else if (depth > SUBMARINE_CONSTANTS.TEST_DEPTH) {
            // Zona de advertencia: fatiga estructural acelerada
            const fatigue = (depth - SUBMARINE_CONSTANTS.TEST_DEPTH) * 2.5;
            this.state.structuralIntegrity = Math.max(25.0, this.state.structuralIntegrity - fatigue * dt);
        } else if (depth > SUBMARINE_CONSTANTS.MAX_OPERATING_DEPTH) {
            // Zona operativa límite
            const fatigue = (depth - SUBMARINE_CONSTANTS.MAX_OPERATING_DEPTH) * 0.8;
            this.state.structuralIntegrity = Math.max(65.0, this.state.structuralIntegrity - fatigue * dt);
        } else {
            // Zona segura: recuperación elástica gradual si asciende
            this.state.structuralIntegrity = Math.min(100.0, this.state.structuralIntegrity + dt * 10.0);
        }

        if (this.state.isImploded) {
            this.state.implosionProgress = Math.min(1.0, this.state.implosionProgress + dt * 1.6);
        }
    }

    /**
     * Ciclo maestro de física ejecutado por frame con técnica de sub-stepping para máxima estabilidad
     * @param {number} rawDeltaTime - Delta time del render loop (segundos)
     */
    step(rawDeltaTime) {
        if (!this.state.isRunning) return;

        // Clamp delta time para evitar saltos numéricos si la pestaña pierde foco
        const clampedDt = Math.min(0.05, Math.max(0.001, rawDeltaTime)) * this.state.timeScale;
        const subSteps = this.state.subSteps;
        const subDt = clampedDt / subSteps;

        for (let i = 0; i < subSteps; i++) {
            // 1. Dinámica de tanques
            this.updateBallastTanks(subDt);

            // 2. Recalcular masa y propiedades derivadas
            this.state.updateDerivedValues();

            // 3. Integración RK4 vertical
            this.rk4StepVertical(subDt, this.state.totalMass);

            // 4. Movimiento horizontal y cabeceo
            this.updateHorizontalAndPitch(subDt);

            // 5. Monitoreo de integridad estructural y colapso
            this.updateStructuralIntegrity(subDt);

            this.state.simTime += subDt;
        }

        // Registrar telemetría para las gráficas
        this.state.recordTelemetry();
    }
}
