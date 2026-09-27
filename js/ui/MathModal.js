/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * MathModal.js - Modal de Acordeón Pedagógico y Matemático:
 * Secciones plegables con indicadores vectoriales SVG, renderizado KaTeX,
 * Diagrama de Cuerpo Libre (DCL) y Espacio de Fases (vy vs y).
 */

import { Icons } from './Icons.js';
import { SUBMARINE_CONSTANTS } from '../config/constants.js';

export class MathModal {
    constructor(state) {
        this.state = state;
        this.isOpen = false;

        this.initDOM();
        this.setupAccordion();
        this.renderKaTeXFormulas();
    }

    initDOM() {
        // Contenedor del modal
        const modalContainer = document.getElementById('modal-layer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div id="math-modal-overlay" class="modal-backdrop">
                <div class="modal-card">
                    <div class="modal-header">
                        <div class="modal-title-group">
                            ${Icons.math}
                            <h2 class="modal-title">Fundamentos Físicos y Ecuaciones Diferenciales</h2>
                        </div>
                        <button id="btn-close-modal" class="modal-close-btn" title="Cerrar ventana">
                            ${Icons.close}
                        </button>
                    </div>

                    <div class="modal-body-accordion">
                        <!-- SECCIÓN 1: DEDUCCIÓN DE LA EDO -->
                        <div class="accordion-item active">
                            <button class="accordion-trigger">
                                <span>1. Deducción de la EDO (Segunda Ley de Newton y Arrastre)</span>
                                ${Icons.chevronDown}
                            </button>
                            <div class="accordion-content">
                                <p class="desc">
                                    El movimiento vertical del submarino en el eje $y$ (con origen $y=0$ en superficie del agua y sentido positivo hacia arriba)
                                    se deriva del balance de fuerzas externas:
                                </p>
                                <div id="katex-eq-newton" class="katex-block"></div>
                                <p class="desc">
                                    Para resolver numéricamente mediante Runge-Kutta 4 (RK4), se transforma en el siguiente sistema de EDOs de primer orden:
                                </p>
                                <div id="katex-eq-system" class="katex-block"></div>
                            </div>
                        </div>

                        <!-- SECCIÓN 2: COMPRESIÓN ESTRUCTURAL E IMPLOSIÓN -->
                        <div class="accordion-item">
                            <button class="accordion-trigger">
                                <span>2. Compresibilidad del Casco (Ley de Hooke Volumétrica)</span>
                                ${Icons.chevronDown}
                            </button>
                            <div class="accordion-content">
                                <p class="desc">
                                    Bajo la enorme presión hidrostática del océano $P(y) = \rho g |y|$, el casco metálico experimenta deformación elástica volumétrica:
                                </p>
                                <div id="katex-eq-hooke" class="katex-block"></div>
                                <p class="desc">
                                    <strong>Consecuencia Didáctica:</strong> Al reducirse el volumen desplazado $V(y)$, el empuje $E(y)$ decae progresivamente.
                                    Si el submarino supera la profundidad de equilibrio sin soplar lastre, la aceleración negativa se incrementa
                                    hasta alcanzar la cota crítica de colapso por pandeo del casco (implosión).
                                </p>
                            </div>
                        </div>

                        <!-- SECCIÓN 3: DIAGRAMA DE CUERPO LIBRE (DCL) EN TIEMPO REAL -->
                        <div class="accordion-item">
                            <button class="accordion-trigger">
                                <span>3. Diagrama de Cuerpo Libre (DCL) en Tiempo Real</span>
                                ${Icons.chevronDown}
                            </button>
                            <div class="accordion-content">
                                <div class="dcl-canvas-container">
                                    <canvas id="dcl-canvas" width="560" height="240"></canvas>
                                </div>
                                <div class="dcl-legend">
                                    <span style="color: #00ffaa">● Empuje E(y) [Centro de Boyantez CB]</span>
                                    <span style="color: #ff6688">● Peso W(t) [Centro de Gravedad CG]</span>
                                    <span style="color: #ffcc00">● Arrastre F_drag(v)</span>
                                </div>
                            </div>
                        </div>

                        <!-- SECCIÓN 4: ESPACIO DE FASES Y CINEMÁTICA -->
                        <div class="accordion-item">
                            <button class="accordion-trigger">
                                <span>4. Espacio de Fases (Velocidad vs Profundidad)</span>
                                ${Icons.chevronDown}
                            </button>
                            <div class="accordion-content">
                                <div class="phase-canvas-container">
                                    <canvas id="phase-canvas" width="560" height="200"></canvas>
                                </div>
                                <p class="desc" style="margin-top: 8px;">
                                    Trayectoria en el espacio de estados $(y, v_y)$. Ilustra la aproximación asintótica hacia la velocidad terminal de hundimiento o emersión.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.overlay = document.getElementById('math-modal-overlay');
        this.closeBtn = document.getElementById('btn-close-modal');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
        }

        // Canvas DCL y Fase
        this.dclCanvas = document.getElementById('dcl-canvas');
        if (this.dclCanvas) this.dclCtx = this.dclCanvas.getContext('2d');

        this.phaseCanvas = document.getElementById('phase-canvas');
        if (this.phaseCanvas) this.phaseCtx = this.phaseCanvas.getContext('2d');
    }

    /**
     * Comportamiento interactivo del acordeón
     */
    setupAccordion() {
        const triggers = document.querySelectorAll('.accordion-trigger');
        triggers.forEach(trig => {
            trig.addEventListener('click', () => {
                const item = trig.closest('.accordion-item');
                const wasActive = item.classList.contains('active');

                // Cerrar los demás para mantener diseño limpio
                document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));

                if (!wasActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    open() {
        this.isOpen = true;
        if (this.overlay) this.overlay.classList.add('open');
        this.renderKaTeXFormulas();
    }

    close() {
        this.isOpen = false;
        if (this.overlay) this.overlay.classList.remove('open');
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    renderKaTeXFormulas() {
        if (typeof window.katex === 'undefined') {
            setTimeout(() => this.renderKaTeXFormulas(), 250);
            return;
        }

        const equations = [
            {
                id: 'katex-eq-newton',
                tex: `m(t) \\cdot \\frac{d^2 y}{dt^2} = E(y) - W(t) - F_{\\text{drag}}\\left(\\frac{dy}{dt}\\right)`
            },
            {
                id: 'katex-eq-system',
                tex: `\\begin{cases} 
\\dfrac{dy}{dt} = v_y \\\\[8pt]
\\dfrac{dv_y}{dt} = \\dfrac{\\rho_{\\text{agua}} V(y) g \\eta(y) - \\big[m_{\\text{seco}} + \\rho_{\\text{agua}} V_{\\text{lastre}}(t)\\big]g - \\frac{1}{2} C_d A \\rho_{\\text{agua}} v_y |v_y|}{m(t)}
\\end{cases}`
            },
            {
                id: 'katex-eq-hooke',
                tex: `V(y) = V_0 \\cdot \\Big(1 - \\beta \\cdot \\rho_{\\text{agua}} g |y|\\Big)`
            }
        ];

        equations.forEach(({ id, tex }) => {
            const el = document.getElementById(id);
            if (el) {
                try {
                    window.katex.render(tex, el, { displayMode: true, throwOnError: false });
                } catch (e) {
                    el.textContent = tex;
                }
            }
        });
    }

    /**
     * Dibuja el Diagrama de Cuerpo Libre en tiempo real
     */
    drawDCL() {
        if (!this.dclCtx || !this.dclCanvas || !this.isOpen) return;
        const ctx = this.dclCtx;
        const w = this.dclCanvas.width;
        const h = this.dclCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const cx = w * 0.5;
        const cy = h * 0.52;
        const s = this.state;

        // Cuadrícula sutil
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Silueta técnica del submarino
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-s.pitch);

        ctx.fillStyle = 'rgba(27, 38, 49, 0.9)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(80, 0, 40, 22, 0, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-80, 22);
        ctx.lineTo(-110, 0);
        ctx.lineTo(-80, -22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vela
        ctx.strokeRect(10, -42, 28, 20);

        // Centro de Boyantez (CB) y Centro de Gravedad (CG)
        ctx.fillStyle = '#00ffaa';
        ctx.beginPath();
        ctx.arc(0, -6, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff6688';
        ctx.beginPath();
        ctx.arc(0, 6, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Vectores de fuerza
        const scale = 0.000018;

        // Empuje (E) hacia arriba
        const eLen = Math.max(20, s.buoyancyForce * scale);
        this.drawArrow(ctx, cx, cy - 6, cx, cy - 6 - eLen, '#00ffaa', `E = ${(s.buoyancyForce / 1000000).toFixed(2)} MN`);

        // Peso (W) hacia abajo
        const wLen = Math.max(20, s.weightForce * scale);
        this.drawArrow(ctx, cx, cy + 6, cx, cy + 6 + wLen, '#ff6688', `W = ${(s.weightForce / 1000000).toFixed(2)} MN`);
    }

    drawArrow(ctx, x1, y1, x2, y2, color, label) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.font = '600 11px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x2 + 10, y2);
    }

    /**
     * Dibuja el espacio de fases (vy vs y)
     */
    drawPhaseSpace() {
        if (!this.phaseCtx || !this.phaseCanvas || !this.isOpen) return;
        const ctx = this.phaseCtx;
        const w = this.phaseCanvas.width;
        const h = this.phaseCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const hist = this.state.history;
        if (hist.depth.length < 2) return;

        // Marco
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(40, 20, w - 60, h - 40);

        // Eje cero de velocidad
        const midY = 20 + (h - 40) * 0.5;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(40, midY);
        ctx.lineTo(w - 20, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Título de ejes
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText('v_y (m/s)', 42, 16);
        ctx.fillText('Profundidad h (m)', w - 105, h - 8);

        // Trazado de trayectoria
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const n = hist.depth.length;
        const plotW = w - 60;
        const plotH = h - 40;

        for (let i = 0; i < n; i++) {
            const normX = hist.depth[i] / SUBMARINE_CONSTANTS.CRUSH_DEPTH;
            const normY = (hist.vy[i] + 6.0) / 12.0; // [-6, +6] m/s
            const px = 40 + Math.max(0, Math.min(1, normX)) * plotW;
            const py = 20 + (1.0 - Math.max(0, Math.min(1, normY))) * plotH;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    update() {
        if (!this.isOpen) return;
        this.drawDCL();
        this.drawPhaseSpace();
    }
}
