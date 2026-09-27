# Laboratorio Virtual de Dinámica Submarina

### Departamento de Física - Facultad de Ciencias Básicas
### Universidad Tecnológica de Pereira (UTP)

**Proyecto:** Laboratorio Virtual de Ingeniería y Física: Mecanismo de Hundimiento de un Submarino  
**Autores:** Juan Nieto, Santiago Valencia, Juan Campos, Marlon Buitrago  
**Año:** 2025  
**Tecnologías:** Three.js (WebGL), JavaScript ES6 Modules, KaTeX, HTML5, CSS3 Glassmorphism  
**Acceso en Línea:** [https://juannietoval.github.io/submarino/](https://juannietoval.github.io/submarino/)  
**Repositorio Oficial:** [https://github.com/juannietoval/submarino](https://github.com/juannietoval/submarino)

---

## 1. Descripción General del Proyecto

El **Laboratorio Virtual de Dinámica Submarina** es una plataforma web interactiva de simulación numérica y visualización científica en 3D desarrollada para la cátedra de Física I de la Universidad Tecnológica de Pereira (UTP).

Su propósito pedagógico y formativo es proporcionar un entorno de experimentación riguroso donde los estudiantes y docentes puedan manipular, observar y analizar en tiempo real las variables físicas y las Ecuaciones Diferenciales Ordinarias (EDOs) que gobiernan la flotabilidad, la inmersión, el equilibrio estático y la dinámica vertical de un submarino en un medio acuático real.

La aplicación integra un modelo tridimensional con casco translúcido que permite observar directamente el comportamiento interno de los Tanques de Lastre Principal (*Main Ballast Tanks* - MBT), el nivel dinámico del fluido de agua de mar, las cuadernas estructurales de refuerzo, así como la acción simultánea de los vectores de Empuje ($E$) y Peso ($W$).

---

## 2. Acceso y Ejecución de la Web Funcional

### 2.1 Acceso Directo en Línea (Producción)
La plataforma se encuentra desplegada y disponible para su uso inmediato en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari) a través del siguiente enlace:

* **Aplicación Web Funcional:** [https://juannietoval.github.io/submarino/](https://juannietoval.github.io/submarino/)

### 2.2 Ejecución en Entorno Local (Windows / Linux / macOS)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/juannietoval/submarino.git
   cd submarino
   ```

2. **Lanzador directo en Windows:**
   Hacer doble clic sobre el archivo `iniciar_simulador.bat`.

3. **Ejecución mediante Node.js nativo (sin dependencias externas):**
   ```bash
   node server.js
   ```
   Abrir en el navegador: [http://localhost:3000/index.html](http://localhost:3000/index.html)

4. **Ejecución alternativa con Python:**
   ```bash
   python -m http.server 3000
   ```
   Abrir en el navegador: [http://localhost:3000/index.html](http://localhost:3000/index.html)

---

## 3. Fundamentos Físicos y Formulación Matemática

El movimiento vertical del submarino se rige por la Segunda Ley de Newton para sistemas de masa variable con fuerzas hidrostáticas e hidrodinámicas no lineales acopladas.

### 3.1 Ecuación Diferencial del Movimiento Vertical (Eje $y$)

Definiendo el eje vertical $y$ positivo hacia arriba, con el origen $y = 0$ ubicado en la superficie del agua:

$$m(t) \cdot \frac{d^2 y}{dt^2} = E(y) - W(t) - F_d\left(\frac{dy}{dt}\right) + F_{\text{lecho}}$$

Donde:
* $y(t)$: Posición vertical del centro de flotación del submarino ($\text{m}$). La profundidad es $h = -y$.
* $v_y(t) = \dfrac{dy}{dt}$: Velocidad vertical ($\text{m/s}$).
* $m(t)$: Masa total instantánea del sistema ($\text{kg}$).
* $E(y)$: Empuje hidrostático de Arquímedes ($\text{N}$).
* $W(t)$: Peso dinámico total ($\text{N}$).
* $F_d\left(\dfrac{dy}{dt}\right)$: Fuerza de arrastre hidrodinámico cuadrático ($\text{N}$).
* $F_{\text{lecho}}$: Fuerza viscoelástica de reacción del fondo marino ($\text{N}$).

---

### 3.2 Reducción a Sistema de EDOs de Primer Orden

Para su resolución numérica por computadora, la ecuación diferencial de segundo orden se transforma en un sistema de dos ecuaciones diferenciales ordinarias de primer orden en el espacio de estados:

$$\begin{cases}
\dfrac{dy}{dt} = v_y \\[14pt]
\dfrac{dv_y}{dt} = \dfrac{E(y) - W(t) - F_d(v_y) + F_{\text{lecho}}}{m(t)}
\end{cases}$$

---

### 3.3 Deducción de las Fuerzas Actuantes

#### A. Empuje Hidrostático con Compresibilidad Volumétrica y Fracción de Sumersión

Conforme al Principio de Arquímedes, todo cuerpo sumergido experimenta un empuje vertical ascendente equivalente al peso del volumen del fluido desalojado:

$$E(y) = \rho_{\text{agua}} \cdot V(y) \cdot g \cdot \eta(y)$$

Donde:
* $\rho_{\text{agua}}$: Densidad del agua marina ($1025.0 \text{ kg/m}^3$).
* $g$: Aceleración de la gravedad estándar ($9.80665 \text{ m/s}^2$).
* $\eta(y)$: Fracción adimensional de volumen sumergido, con continuidad $C^1$ para garantizar estabilidad numérica:
  $$\eta(y) = \begin{cases} 
  0.0 & \text{si } y \ge y_{\text{aire}} \\
  \left(\dfrac{y_{\text{aire}} - y}{y_{\text{aire}} - y_{\text{sumergido}}}\right)^\alpha & \text{si } y_{\text{sumergido}} < y < y_{\text{aire}} \\
  1.0 & \text{si } y \le y_{\text{sumergido}}
  \end{cases}$$
* $V(y)$: Volumen real del casco bajo presión hidrostática. Debido a la alta presión a grandes profundidades, el casco sufre una deformación elástica volumétrica regida por la Ley de Hooke tridimensional:
  $$V(y) = V_0 \cdot \Big(1 - \beta \cdot P_{\text{manométrica}}(y)\Big) = V_0 \cdot \Big(1 - \beta \cdot \rho_{\text{agua}} \cdot g \cdot |y|\Big)$$
  Donde:
  * $V_0$: Volumen nominal a nivel de superficie ($880.0 \text{ m}^3$).
  * $\beta$: Coeficiente de compresibilidad elástica volumétrica del acero aleado HY-80 ($2.2 \times 10^{-8} \text{ Pa}^{-1}$).

#### B. Masa Dinámica y Peso Total

El peso del vehículo cambia dinámicamente según la cantidad de agua admitida o expulsada de los tanques de lastre principal:

$$W(t) = m(t) \cdot g = \Big(m_{\text{seco}} + m_{\text{lastre}}(t)\Big) \cdot g$$

La masa de lastre evoluciona según los caudales volumétricos de inundación por gravedad y de soplado por aire comprimido a 200 bar:

$$\frac{dm_{\text{lastre}}}{dt} = \rho_{\text{agua}} \cdot \Big(Q_{\text{inundación}} - Q_{\text{soplado}}\Big)$$

#### C. Arrastre Hidrodinámico Cuadrático (Ecuación de Morison)

El agua ejerce una resistencia al movimiento vertical debida a la viscosidad y a la separación de la capa límite:

$$F_d(v_y) = \frac{1}{2} \cdot C_d \cdot A_{\text{planta}} \cdot \rho_{\text{efectiva}} \cdot v_y \cdot |v_y|$$

Donde:
* $C_d$: Coeficiente de arrastre vertical transversal ($0.85$).
* $A_{\text{planta}}$: Área proyectada en planta del casco ($192.8 \text{ m}^2$).
* $\rho_{\text{efectiva}} = \eta(y) \cdot \rho_{\text{agua}} + (1 - \eta(y)) \cdot \rho_{\text{aire}}$.
* El término $v_y \cdot |v_y|$ asegura que la fuerza de arrastre sea siempre opuesta al vector de velocidad vertical instantánea.

#### D. Presión Hidrostática Total

$$P(h) = P_{\text{atm}} + \rho_{\text{agua}} \cdot g \cdot h$$

Donde $P_{\text{atm}} = 101325 \text{ Pa} = 1.0 \text{ atm}$ y $h = -y$ es la profundidad en metros.

---

### 3.4 Algoritmo de Integración Numérica: Runge-Kutta de 4to Orden (RK4)

Para integrar las ecuaciones diferenciales en tiempo real manteniendo conservación energética y evitando divergencias numéricas, el motor físico ejecuta RK4 con sub-pasos temporales $\Delta t$:

Sea el vector de estado $\mathbf{S} = [y, v_y]^T$ y la derivada $\mathbf{f}(t, \mathbf{S}) = \left[v_y, \dfrac{\Sigma F_y}{m}\right]^T$:

$$\begin{aligned}
\mathbf{k}_1 &= \mathbf{f}\left(t_n, \mathbf{S}_n\right) \\[6pt]
\mathbf{k}_2 &= \mathbf{f}\left(t_n + \frac{\Delta t}{2}, \mathbf{S}_n + \frac{\Delta t}{2}\mathbf{k}_1\right) \\[6pt]
\mathbf{k}_3 &= \mathbf{f}\left(t_n + \frac{\Delta t}{2}, \mathbf{S}_n + \frac{\Delta t}{2}\mathbf{k}_2\right) \\[6pt]
\mathbf{k}_4 &= \mathbf{f}\left(t_n + \Delta t, \mathbf{S}_n + \Delta t \, \mathbf{k}_3\right) \\[10pt]
\mathbf{S}_{n+1} &= \mathbf{S}_n + \frac{\Delta t}{6}\left(\mathbf{k}_1 + 2\mathbf{k}_2 + 2\mathbf{k}_3 + \mathbf{k}_4\right)
\end{aligned}$$

---

## 4. Criterios de Flotabilidad y Estados de Navegación

El simulador evalúa en cada cuadro la relación cuantitativa entre el Empuje ($E$) y el Peso ($W$), actualizando la telemetría en tiempo real:

1. **Régimen de Emersión / Flotabilidad Positiva ($E > W$):**
   * Aceleración neta positiva hacia arriba ($a_y > 0$).
   * Ocurre cuando los tanques de lastre están vacíos ($0\%$) o parcialmente llenos.
   * Indicador en telemetría: `EMERGIENDO (E > W)` en color verde esmeralda.

2. **Régimen de Inmersión / Flotabilidad Negativa ($E < W$):**
   * Aceleración neta negativa hacia abajo ($a_y < 0$).
   * Ocurre al inundar los tanques de lastre por encima del punto crítico de equilibrio.
   * Indicador en telemetría: `HUNDIÉNDOSE (E < W)` en color rojo/rosa coral.

3. **Régimen de Flotabilidad Neutra / Equilibrio Hidrostático ($E \approx W$):**
   * Fuerza neta nula ($\Sigma F_y \approx 0$). El submarino mantiene una profundidad constante sin consumir energía propulsora.
   * Indicador en telemetría: `EQUILIBRIO NEUTRO (E ≈ W)`.

---

## 5. Estructura y Arquitectura del Código Fuente

El proyecto está diseñado bajo el estándar modular **ECMAScript 6 (ES Modules)**, garantizando alta cohesión, desacoplamiento y facilidad de mantenimiento:

```
submarine-simulator/
├── index.html                   # Documento base, importmaps de Three.js y KaTeX
├── iniciar_simulador.bat        # Script de lanzamiento automático para Windows
├── server.js                    # Servidor HTTP nativo en Node.js (puerto 3000)
├── test_stress.html             # Suite de pruebas automatizadas en Chromium WebGL
├── README.md                    # Documentación técnica completa
├── css/
│   └── styles.css               # Estilos glassmorphism cian, tarjetas compactas y HUD
├── assets/
│   └── references/              # Diagramas vectoriales de corte transversal naval
└── js/
    ├── main.js                  # Punto de entrada, bucle de renderizado y OrbitControls
    ├── config/
    │   └── constants.js         # Constantes físicas y parámetros geométricos del casco
    ├── core/
    │   ├── PhysicsEngine.js     # Solucionador RK4, fuerzas hidrostáticas y arrastre
    │   └── State.js             # Estado reactivo del sistema y telemetría histórica
    ├── graphics/
    │   ├── SubmarineModel.js    # Malla 3D del submarino, casco translúcido y vectores
    │   ├── Environment.js       # Plano del océano, cuadrícula espacial y niebla marina
    │   ├── LightingSystem.js    # Iluminación ambiental de escena y foco táctico
    │   └── ParticleEffects.js   # Estela de hélice y partículas de purga
    └── ui/
        ├── HUD.js               # Paneles colapsables de telemetría y controles
        ├── Icons.js             # Catálogo de iconos vectoriales SVG limpios
        └── MathModal.js         # Modal explicativo con renderizado KaTeX
```

---

## 6. Guía de Interacción en el Laboratorio

* **Rotación 3D de Cámara:** Clic izquierdo presionado + arrastrar el ratón.
* **Desplazamiento / Paneo:** Clic derecho presionado + arrastrar el ratón.
* **Acercamiento / Zoom:** Rueda de desplazamiento (*scroll*) del ratón.
* **Control de Inundación de Lastre:** Deslizar la barra `Llenar Tanques (%)` en el Panel de Control para variar el volumen de agua marina de $0\%$ a $100\%$.
* **Soplado de Emergencia:** Pulsar el botón `EMERGENCIA (Aire)` para expulsar inmediatamente el agua de los tanques mediante aire comprimido a 200 bar.
* **Consulta de EDOs y Matemáticas:** Pulsar el botón `Fundamentos EDOs` para desplegar el acordeón pedagógico con las deducciones analíticas completas.
* **Reinicio:** Pulsar `Reiniciar` para devolver el submarino a su estado inicial de flotación en superficie ($h = 0.1\text{ m}$).
* **Vistas Predefinidas:** Conmutar entre `Isométrica`, `Lateral` y `Tanques` para enfocar diferentes perspectivas técnicas del vehículo.

---

## 7. Licencia y Cita Académica

Este proyecto ha sido desarrollado con fines exclusivamente académicos y científicos bajo la licencia MIT.

Para citar este trabajo en informes técnicos o publicaciones universitarias:
```bibtex
@misc{nieto2025submarino,
  author = {Nieto, Juan and Valencia, Santiago and Campos, Juan and Buitrago, Marlon},
  title = {Laboratorio Virtual de Dinámica Submarina e Hidrostática},
  year = {2025},
  publisher = {Universidad Tecnológica de Pereira},
  howpublished = {\url{https://juannietoval.github.io/submarino/}}
}
```
