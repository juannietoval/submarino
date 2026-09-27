# 🌊 Laboratorio Virtual de Dinámica Submarina e Ingeniería Naval
### *Simulación Numérica RK4 • Ley de Hooke Volumétrica • Principio de Arquímedes • Hidrodinámica No Lineal*

Bienvenido al **Laboratorio Virtual de Dinámica Submarina**, una plataforma web interactiva y modular desarrollada con **Three.js**, **WebGL**, **KaTeX** y simulación numérica basada en **Runge-Kutta de 4to Orden (RK4)**. Diseñada bajo un estilo visual técnico minimalista (Glassmorphism Cyberpunk Sobrio), permite estudiar y experimentar en tiempo real con las leyes físicas y ecuaciones diferenciales que gobiernan la flotabilidad, inmersión, trimado y colapso estructural de un submarino oceánico.

---

## 📐 1. Modelo Físico y Deducción de EDOs

### 1.1 Segunda Ley de Newton para el Movimiento Vertical
El movimiento vertical del submarino en el eje $y$ (con $y=0$ en la superficie del agua y positivo hacia arriba) se rige por:

$$m(t) \cdot \frac{d^2 y}{dt^2} = E(y) - W(t) - F_d\left(\frac{dy}{dt}\right) + F_{\text{suelo}}$$

Despejando la aceleración vertical instantánea $a_y$:

$$\frac{d^2 y}{dt^2} = \frac{E(y) - W(t) - F_d(v_y) + F_{\text{suelo}}}{m(t)}$$

---

### 1.2 Definición Formal de Cada Término

1. **Peso Dinámico Total $W(t)$:**
   $$W(t) = \Big[ m_{\text{casco}} + m_{\text{lastre}}(t) \Big] \cdot g = \Big[ m_{\text{casco}} + \rho_{\text{agua}} \cdot V_{\text{lastre}}(t) \Big] \cdot g$$
   - $m_{\text{casco}} = 720\,000\text{ kg}$ (masa en seco de maquinaria y estructura).
   - $V_{\text{lastre}}(t)$ evoluciona por la ecuación de continuidad de válvulas:
     $$\frac{dV_{\text{lastre}}}{dt} = \dot{V}_{\text{inundación}} - \dot{V}_{\text{soplado}}$$

2. **Empuje Hidrostático de Arquímedes con Compresibilidad $E(y)$:**
   $$E(y) = \rho_{\text{agua}} \cdot V(y) \cdot g \cdot \eta_{\text{sumergido}}(y)$$
   - $\eta_{\text{sumergido}}(y) \in [0, 1]$ es el coeficiente de inmersión volumétrica, formulado como un spline cúbico Hermite $C^1$ continuo para evitar discontinuidades numéricas en las derivadas del RK4.

3. **Compresibilidad Estructural del Casco (Ley de Hooke Volumétrica):**
   $$V(y) = V_0 \cdot \Big(1 - \beta \cdot \rho_{\text{agua}} \cdot g \cdot |y|\Big)$$
   - Conforme el submarino desciende, la presión hidrostática comprime el casco elásticamente. La consiguiente pérdida de volumen desplazado $\Delta V$ disminuye el empuje $E(y)$, generando una inestabilidad natural: **a mayor profundidad, el submarino tiende a hundirse más rápido si no se sopla lastre.**

4. **Arrastre Hidrodinámico Cuadrático No Lineal (Ecuación de Morison):**
   $$F_d(v) = \frac{1}{2} C_d \cdot A_{\text{planta}} \cdot \rho_{\text{eff}} \cdot v_y \cdot |v_y|$$
   - Fuerza puramente disipativa opuesta al vector velocidad vertical que amortigua oscilaciones y establece la velocidad terminal de inmersión o ascenso.

5. **Condición de Flotabilidad Neutra:**
   $$\sum F_y = 0 \iff E(y_{\text{eq}}) = W(t) \implies \rho_{\text{agua}} \cdot V(y_{\text{eq}}) = m_{\text{total}}$$

---

### 1.3 Solucionador Numérico Runge-Kutta 4 (RK4) con Sub-Stepping
El estado cinemático $\mathbf{s} = [y, v_y]^T$ evoluciona resolviendo $\frac{d\mathbf{s}}{dt} = f(t, \mathbf{s})$ mediante:

$$\begin{aligned}
k_1 &= f(t_n, \mathbf{s}_n) \\
k_2 &= f\left(t_n + \frac{\Delta t}{2}, \mathbf{s}_n + \frac{\Delta t}{2} k_1\right) \\
k_3 &= f\left(t_n + \frac{\Delta t}{2}, \mathbf{s}_n + \frac{\Delta t}{2} k_2\right) \\
k_4 &= f\left(t_n + \Delta t, \mathbf{s}_n + \Delta t k_3\right) \\
\mathbf{s}_{n+1} &= \mathbf{s}_n + \frac{\Delta t}{6}(k_1 + 2k_2 + 2k_3 + k_4)
\end{aligned}$$

Se implementa una técnica de **sub-stepping** ($\Delta t_{\text{sub}} = \Delta t / N$ con $N=4$), lo que garantiza estabilidad asintótica incondicional, incluso frente a maniobras violentas de soplado de emergencia o impacto viscoelástico contra el lecho marino.

---

## 🏗️ 2. Arquitectura de Código Limpio (Clean Architecture ES6)

```
submarine-simulator/
├── index.html                   # Entry point, importmaps, estructura semántica KaTeX/Three.js
├── iniciar_simulador.bat        # Lanzador rápido de 1-clic para Windows
├── css/
│   └── styles.css               # Glassmorphism técnico, paleta naval sobria, paneles tácticos
└── js/
    ├── main.js                  # Inicialización del ciclo de vida, render loop de Three.js y cámaras
    ├── config/
    │   └── constants.js         # Constantes físicas (g, rho, Patm, límites operativos y elásticos)
    ├── core/
    │   ├── PhysicsEngine.js     # Solucionador numérico RK4, cálculo de E, W, Fd, Hooke y válvulas
    │   └── State.js             # Estado global reactivo y buffer circular de telemetría histórica
    ├── graphics/
    │   ├── SubmarineModel.js    # Casco Albacore (Lathe), PBR, sección translúcida, tanques y vectores 3D
    │   ├── Environment.js       # Gradiente lumínico Beer-Lambert, niebla abisal, batimetría y lecho
    │   └── ParticleSystems.js   # Nieve marina, burbujas de venteo, cavitación de hélice e implosión
    └── ui/
        ├── TelemetryDashboard.js# Métricas HUD en vivo, balanza E vs W, presión y sonar acústico
        ├── MathPanel.js         # Panel pedagógico con KaTeX, DCL 2D dinámico y espacio de fases
        └── Controls.js          # Consola táctica: válvulas, soplado de emergencia, timones y densidad
```

---

## 🚢 3. Características Gráficas y Visuales

1. **Casco Hidrodinámico Albacore:** Construido procedimentalmente mediante `THREE.LatheGeometry` siguiendo un perfil elíptico continuo en proa y convergencia cúbica hacia la hélice en popa.
2. **Materiales PBR y Sección Translúcida:**
   - Acero naval exterior táctico mate (`MeshPhysicalMaterial`).
   - Sección central de inspección translúcida con refracción (`roughness: 0.12`, `transmission: 0.84`, `ior: 1.33`) que permite ver el casco de presión interior y los tanques de lastre bifásicos.
3. **Tanques de Lastre Bifásicos Animados:** Visualización en tiempo real del nivel de agua y aire en los tanques de proa y popa (FWD y AFT MBT).
4. **Timones en X (X-Rudders) y Hélice Silenciosa de 7 Palas:** Modelado procedimental con palas curvadas tipo *skew* que giran en sincronía con el acelerador del motor y generan estelas de cavitación.
5. **Vectores de Fuerza 3D Autoescalables con Billboards:** Flechas tridimensionales que ilustran el Empuje $E$ (verde/cian), Peso $W$ (rojo), Arrastre $F_d$ (amarillo) y Fuerza Neta $F_{\text{net}}$ (púrpura) con etiquetas HUD flotantes.
6. **Atenuación Lumínica Beer-Lambert:** Gradiente exponencial $I(h) = I_0 \cdot e^{-k h}$ que transforma el agua desde turquesa brillante en superficie hasta azul medianoche y negro absoluto abisal en profundidad.
7. **Efecto de Implosión Catastrófica:** Al sobrepasar la profundidad crítica de colapso ($440\text{ m}$), el casco se deforma plásticamente por sobrepresión y detona una nube violenta de burbujas y choque cavitacional.

---

## 🚀 4. Instrucciones de Ejecución

### Opción A: Lanzador Rápido (Windows)
Haz doble clic en el archivo:
```bash
iniciar_simulador.bat
```
Esto iniciará automáticamente un servidor local y abrirá la aplicación en tu navegador web predeterminado.

### Opción B: Python
En la raíz de la carpeta `submarine-simulator`:
```bash
python -m http.server 8080
```
Luego abre `http://localhost:8080/index.html` en tu navegador.

### Opción C: Node.js / Vite / Live Server
Con cualquier servidor estático moderno:
```bash
npx serve .
# o en VS Code: clic derecho en index.html -> "Open with Live Server"
```

---

## ⌨️ Atajos de Teclado
- **Barra Espaciadora (`Space`):** Disparo de **Soplado de Emergencia (Emergency Blow)**.
- **`P`:** Pausar / Reanudar simulación física.
- **`R`:** Reiniciar submarino a condición de flotabilidad en superficie.
