/**
 * Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino
 * MathPanel.js - Panel teórico pedagógico con pestañas:
 * 1. Diagrama de Cuerpo Libre (DCL) en tiempo real (Canvas 2D)
 * 2. Formulación matemática formal con KaTeX (EDOs, Arquímedes, Hooke, RK4)
 * 3. Gráficas cinemáticas en tiempo real y Espacio de Fases (vy vs y)
 */

import { SUBMARINE_CONSTANTS } from '../config/constants.js';

export class MathPanel {
    constructor(state) {
        this.state = state;
        this.isOpen = false;
        this.activeTab = 'dcl'; // 'dcl', 'formulas', 'charts'

        this.initDOM();
        this.renderKaTeXFormulas();
        this.setupEventListeners();
    }

    /**
     * Vincula elementos del DOM
     */
    initDOM() {
        this.panelEl = document.getElementById('math-panel');
        this.toggleBtn = document.getElementById('toggle-math-btn');
        this.closeBtn = document.getElementById('close-math-btn');
        this.tabBtns = document.querySelectorAll('.math-tab-btn');
        this.tabPanes = document.querySelectorAll('.math-tab-pane');

        // Canvas para el Diagrama de Cuerpo Libre (DCL)
        this.dclCanvas = document.getElementById('dcl-canvas');
        if (this.dclCanvas) {
            this.dclCtx = this.dclCanvas.getContext('2d');
        }

        // Canvas para gráficas en tiempo real
        this.chartCanvasDepth = document.getElementById('chart-canvas-depth');
        if (this.chartCanvasDepth) {
            this.depthCtx = this.chartCanvasDepth.getContext('2d');
        }

        this.chartCanvasVelocity = document.getElementById('chart-canvas-velocity');
        if (this.chartCanvasVelocity) {
            this.velCtx = this.chartCanvasVelocity.getContext('2d');
        }

        this.chartCanvasPhase = document.getElementById('chart-canvas-phase');
        if (this.chartCanvasPhase) {
            this.phaseCtx = this.chartCanvasPhase.getContext('2d');
        }
    }

    /**
     * Configura oyentes de eventos para apertura, cierre y cambio de pestañas
     */
    setupEventListeners() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.setActiveTab(tab);
            });
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.panelEl.classList.add('open');
        this.toggleBtn.classList.add('active');
        this.renderKaTeXFormulas(); // Asegurar renderizado
    }

    close() {
        this.isOpen = false;
        this.panelEl.classList.remove('open');
        this.toggleBtn.classList.remove('active');
    }

    setActiveTab(tabName) {
        this.activeTab = tabName;
        this.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
        this.tabPanes.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    }

    /**
     * Renderiza las ecuaciones matemáticas con KaTeX en los contenedores designados
     */
    renderKaTeXFormulas() {
        if (typeof window.katex === 'undefined') {
            // KaTeX aún no se carga, reintentar en 300ms
            setTimeout(() => this.renderKaTeXFormulas(), 300);
            return;
        }

        const equations = [
            {
                id: 'eq-newton',
                tex: `m(t) \\cdot \\frac{d^2 y}{dt^2} = E(y) - W(t) - F_d\\left(\\frac{dy}{dt}\\right)`
            },
            {
                id: 'eq-weight',
                tex: `W(t) = \\Big[ m_{\\text{casco}} + m_{\\text{lastre}}(t) \\Big] \\cdot g = \\Big[ m_{\\text{casco}} + \\rho_{\\text{agua}} \\cdot V_{\\text{lastre}}(t) \\Big] \\cdot g`
            },
            {
                id: 'eq-buoyancy',
                tex: `E(y) = \\rho_{\\text{agua}} \\cdot V(y) \\cdot g \\cdot \\eta_{\\text{sumergido}}(y)`
            },
            {
                id: 'eq-compressibility',
                tex: `V(y) = V_0 \\cdot \\Big(1 - \\beta \\cdot \\rho_{\\text{agua}} \\cdot g \\cdot |y|\\Big)`
            },
            {
                id: 'eq-drag',
                tex: `F_d(v) = \\frac{1}{2} C_d \\cdot A \\cdot \\rho_{\\text{agua}} \\cdot v \\cdot |v|`
            },
            {
                id: 'eq-equilibrium',
                tex: `\\sum F_y = 0 \\iff E(y_{\\text{eq}}) = W(t) \\implies \\rho_{\\text{agua}} \\cdot V_0 (1 - \\beta \\rho g |y_{\\text{eq}}|) = m_{\\text{total}}`
            },
            {
                id: 'eq-rk4',
                tex: `\\mathbf{s}_{t+\\Delta t} = \\mathbf{s}_t + \\frac{\\Delta t}{6}(k_1 + 2k_2 + 2k_3 + k_4), \\quad \\text{donde } \\mathbf{s} = \\begin{bmatrix} y \\\\ v_y \\end{bmatrix}`
            }
        ];

        equations.forEach(({ id, tex }) => {
            const el = document.getElementById(id);
            if (el) {
                try {
                    window.katex.render(tex, el, {
                        displayMode: true,
                        throwOnError: false
                    });
                } catch (err) {
                    el.textContent = tex;
                }
            }
        });
    }

    /**
     * Dibuja el Diagrama de Cuerpo Libre (DCL) en tiempo real en el Canvas 2D
     */
    drawDCL() {
        if (!this.dclCtx || !this.dclCanvas) return;
        const ctx = this.dclCtx;
        const w = this.dclCanvas.width = this.dclCanvas.clientWidth * (window.devicePixelRatio || 1);
        const h = this.dclCanvas.height = this.dclCanvas.clientHeight * (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        const centerX = w * 0.48;
        const centerY = h * 0.50;
        const s = this.state;

        // Cuadrícula técnica de fondo
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // 1. Silueta esquemática del submarino Albacore en vista de perfil
        const subLength = w * 0.58;
        const subHeight = h * 0.22;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-s.pitch); // Invertir para visualización de cabeceo

        // Casco
        ctx.fillStyle = 'rgba(27, 36, 46, 0.85)';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        // Proa redondeada (derecha)
        ctx.ellipse(subLength * 0.42, 0, subHeight * 0.8, subHeight * 0.5, 0, -Math.PI / 2, Math.PI / 2);
        // Cuerpo inferior
        ctx.lineTo(-subLength * 0.35, subHeight * 0.5);
        // Popa ahusada (izquierda)
        ctx.lineTo(-subLength * 0.48, 0);
        // Cuerpo superior
        ctx.lineTo(-subLength * 0.35, -subHeight * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vela (Conning tower)
        ctx.beginPath();
        ctx.roundRect(subLength * 0.08, -subHeight * 1.1, subLength * 0.14, subHeight * 0.6, [6, 6, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Tanques de lastre coloreados (Proa y Popa)
        const fwdFill = s.fwdBallastPct / 100;
        const aftFill = s.aftBallastPct / 100;

        // Tanque Proa
        ctx.fillStyle = 'rgba(0, 212, 255, 0.35)';
        ctx.fillRect(subLength * 0.05, -subHeight * 0.4 + subHeight * 0.8 * (1 - fwdFill), subLength * 0.12, subHeight * 0.8 * fwdFill);
        ctx.strokeStyle = '#00ffcc';
        ctx.strokeRect(subLength * 0.05, -subHeight * 0.4, subLength * 0.12, subHeight * 0.8);

        // Tanque Popa
        ctx.fillStyle = 'rgba(0, 212, 255, 0.35)';
        ctx.fillRect(-subLength * 0.22, -subHeight * 0.4 + subHeight * 0.8 * (1 - aftFill), subLength * 0.12, subHeight * 0.8 * aftFill);
        ctx.strokeStyle = '#00ffcc';
        ctx.strokeRect(-subLength * 0.22, -subHeight * 0.4, subLength * 0.12, subHeight * 0.8);

        // Marcador Centro de Boyantez (CB)
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(0, -subHeight * 0.15, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText('CB', 10, -subHeight * 0.15);

        // Marcador Centro de Gravedad (CG)
        ctx.fillStyle = '#ff3355';
        ctx.beginPath();
        ctx.arc(0, subHeight * 0.15, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('CG', 10, subHeight * 0.15 + 4);

        ctx.restore();

        // 2. Dibujar vectores de fuerzas verticales en el DCL
        const forceScale = h * 0.000045; // Escala proporcional visual

        // Vector Empuje E (Verde/Cian, hacia arriba desde CB)
        const eLen = Math.max(25, s.buoyancyForce * forceScale);
        this.drawVectorArrow(ctx, centerX, centerY - 15, centerX, centerY - 15 - eLen, '#00ffcc', `E = ${(s.buoyancyForce / 1000).toFixed(0)} kN`, 'left');

        // Vector Peso W (Rojo/Ámbar, hacia abajo desde CG)
        const wLen = Math.max(25, s.weightForce * forceScale);
        this.drawVectorArrow(ctx, centerX, centerY + 15, centerX, centerY + 15 + wLen, '#ff3355', `W = ${(s.weightForce / 1000).toFixed(0)} kN`, 'left');

        // Vector Arrastre Fd (Amarillo, opuesto a la velocidad)
        const fdMag = Math.abs(s.dragForceY);
        if (fdMag > 4000) {
            const fdLen = Math.max(20, fdMag * forceScale * 1.6);
            const fdDirY = s.vy >= 0 ? 1 : -1; // Si sube (vy>0), arrastre hacia abajo
            this.drawVectorArrow(ctx, centerX - 90, centerY, centerX - 90, centerY + fdDirY * fdLen, '#ffcc00', `Fd = ${(fdMag / 1000).toFixed(0)} kN`, 'right');
        }

        // Vector Fuerza Neta Resultante Fnet (Púrpura)
        const netMag = Math.abs(s.netForceY);
        if (netMag > 10000) {
            const netLen = Math.max(20, netMag * forceScale);
            const netDirY = s.netForceY >= 0 ? -1 : 1;
            this.drawVectorArrow(ctx, centerX + 100, centerY, centerX + 100, centerY + netDirY * netLen, '#b070ff', `Fnet = ${(s.netForceY / 1000).toFixed(0)} kN`, 'right');
        }
    }

    /**
     * Dibuja una flecha estilizada de vector con su etiqueta técnica
     */
    drawVectorArrow(ctx, fromX, fromY, toX, toY, color, label, align = 'left') {
        const headLen = 10;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3.5;

        // Línea principal
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Punta de flecha
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        // Etiqueta
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        const labelX = align === 'left' ? toX - 12 : toX + 12;
        ctx.textAlign = align === 'left' ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        
        // Sombra de fondo para legibilidad
        ctx.fillStyle = 'rgba(7, 13, 24, 0.8)';
        const textMetrics = ctx.measureText(label);
        ctx.fillRect(align === 'left' ? labelX - textMetrics.width - 4 : labelX - 4, toY - 10, textMetrics.width + 8, 20);
        
        ctx.fillStyle = color;
        ctx.fillText(label, labelX, toY);
    }

    /**
     * Dibuja las gráficas cinemáticas en tiempo real en los Canvas 2D
     */
    drawCharts() {
        const hist = this.state.history;
        if (hist.time.length < 2) return;

        // Gráfica 1: Profundidad vs Tiempo
        if (this.depthCtx && this.chartCanvasDepth) {
            this.drawTimeSeriesChart(
                this.depthCtx,
                this.chartCanvasDepth,
                hist.time,
                hist.depth,
                'Profundidad y(t) [m]',
                '#00d4ff',
                0,
                SUBMARINE_CONSTANTS.CRUSH_DEPTH
            );
        }

        // Gráfica 2: Velocidad vertical vs Tiempo
        if (this.velCtx && this.chartCanvasVelocity) {
            this.drawTimeSeriesChart(
                this.velCtx,
                this.chartCanvasVelocity,
                hist.time,
                hist.vy,
                'Velocidad Vertical vy(t) [m/s]',
                '#ffcc00',
                -10,
                10,
                true // Con línea de cero central
            );
        }

        // Gráfica 3: Espacio de Fases (vy vs y)
        if (this.phaseCtx && this.chartCanvasPhase) {
            this.drawPhaseSpaceChart(
                this.phaseCtx,
                this.chartCanvasPhase,
                hist.depth,
                hist.vy,
                'Espacio de Fases: vy vs Profundidad',
                '#ff3366'
            );
        }
    }

    drawTimeSeriesChart(ctx, canvas, xData, yData, title, strokeColor, fixedMin = null, fixedMax = null, zeroLine = false) {
        const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
        const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        const padLeft = 45;
        const padRight = 15;
        const padTop = 25;
        const padBottom = 25;
        const plotW = w - padLeft - padRight;
        const plotH = h - padTop - padBottom;

        // Rango vertical
        let minY = fixedMin !== null ? fixedMin : Math.min(...yData);
        let maxY = fixedMax !== null ? fixedMax : Math.max(...yData);
        if (maxY - minY < 1e-4) { maxY += 1; minY -= 1; }

        // Cuadrícula y ejes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padLeft, padTop, plotW, plotH);

        // Título
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(title, padLeft, 16);

        // Línea de cero opcional
        if (zeroLine && minY < 0 && maxY > 0) {
            const zeroY = padTop + plotH * (1 - (0 - minY) / (maxY - minY));
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padLeft, zeroY);
            ctx.lineTo(padLeft + plotW, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Trazado de datos
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.0;
        ctx.beginPath();

        const n = yData.length;
        for (let i = 0; i < n; i++) {
            const px = padLeft + (i / (n - 1)) * plotW;
            const normY = (yData[i] - minY) / (maxY - minY);
            const py = padTop + plotH * (1.0 - normY);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Valor actual en la esquina
        const lastVal = yData[yData.length - 1];
        ctx.fillStyle = strokeColor;
        ctx.textAlign = 'right';
        ctx.fillText(lastVal.toFixed(2), w - padRight, 16);
    }

    drawPhaseSpaceChart(ctx, canvas, depthData, vyData, title, strokeColor) {
        const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
        const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        const padLeft = 45;
        const padRight = 15;
        const padTop = 25;
        const padBottom = 25;
        const plotW = w - padLeft - padRight;
        const plotH = h - padTop - padBottom;

        // Eje X: Profundidad [0 a CRUSH_DEPTH]
        const minX = 0;
        const maxX = SUBMARINE_CONSTANTS.CRUSH_DEPTH;

        // Eje Y: Velocidad [-8 a +8 m/s]
        const minY = -8;
        const maxY = 8;

        // Marco
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padLeft, padTop, plotW, plotH);

        // Línea central de velocidad cero
        const zeroY = padTop + plotH * 0.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, zeroY);
        ctx.lineTo(padLeft + plotW, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Título
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(title, padLeft, 16);

        // Trayectoria de fase
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.0;
        ctx.beginPath();

        const n = depthData.length;
        for (let i = 0; i < n; i++) {
            const px = padLeft + ((depthData[i] - minX) / (maxX - minX)) * plotW;
            const normY = (vyData[i] - minY) / (maxY - minY);
            const py = padTop + plotH * (1.0 - normY);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Punto actual en el espacio de fases
        if (n > 0) {
            const lastX = padLeft + ((depthData[n - 1] - minX) / (maxX - minX)) * plotW;
            const lastY = padTop + plotH * (1.0 - (vyData[n - 1] - minY) / (maxY - minY));
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Ciclo de actualización visual del panel pedagógico
     */
    update() {
        if (!this.isOpen) return;

        if (this.activeTab === 'dcl') {
            this.drawDCL();
        } else if (this.activeTab === 'charts') {
            this.drawCharts();
        }
    }
}
