# 🌊 Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
### *Versión 2.2 • Especificación y Reingeniería Técnica*
**Autores:** Juan Nieto, Santiago Valencia, Juan Campos, Marlon Buitrago (2025)  
**Facultad:** Universidad Tecnológica de Pereira (UTP) - Departamento de Física

---

## 📋 1. Resumen de la Reingeniería (Versión 2.2)

Esta versión restablece y optimiza la **línea base visual aprobada**, eliminando la saturación visual (*viewport clutter*) para reservar más del **85% de la pantalla para el canvas 3D interactivo**, complementado con:

1. **Manipulación 3D Absoluta e Interacción Orbital:** `OrbitControls` completo con rotación libre de 360°, paneo con clic derecho, zoom progresivo suave y amortiguación inercial (`dampingFactor: 0.05`).
2. **Iconografía SVG Vectorial Profesional:** Catálogo centralizado (`Icons.js`) basado en estándares industriales (Lucide / Feather Icons), **estrictamente libre de emojis, stickers o fuentes degradadas**.
3. **Sistema de Iluminación Dual:** 
   - **Ambiente Naval Base:** Color azul petróleo (`#1b2631`), luz cenital reflectiva, hemisferio naval y atenuación de Beer-Lambert.
   - **Linterna Táctica Dirigible:** Foco cónico móvil (`THREE.SpotLight`) proyectado en tiempo real con `THREE.Raycaster` sincronizado con la posición del cursor sobre el submarino.
4. **Rediseño Fiel del Casco Albacore (Teardrop Hull):**
   - Proa achatada elíptica continua (domo acústico de sonar).
   - Casco cilíndrico central reforzado con costillas anulares exteriores equidistantes (ribs).
   - Sección translúcida de inspección ("Modo Rayos X") con refracción PBR (`transmission: 0.85`, `ior: 1.33`) que permite ver los mamparos y los tanques de lastre proa/popa (FWD y AFT MBT).
   - Timones de popa en X (*X-Rudders*) y hélice silenciosa de 7 palas sesgadas (*skewed propeller*).
   - Flechas vectoriales 3D nítidas y despejadas: **Empuje ($E$)** en verde esmeralda y **Peso ($W$)** en rosa tenue.
5. **Corrección de la Discordancia Teórica:** Sincronización exacta entre las magnitudes vectoriales, la aceleración instantánea y el indicador de estado:
   - $E > W \implies$ `EMERGIENDO (E > W)`
   - $E < W \implies$ `HUNDIÉNDOSE (E < W)`
   - $E \approx W \implies$ `NEUTRO (E ≈ W)`
6. **Modal de Acordeón Pedagógico:** Panel con KaTeX, deducción de EDOs, diagrama DCL y espacio de fases ($v_y$ vs $y$).

---

## 📐 2. Modelo Físico y Ecuaciones Diferenciales Ordinarias (EDOs)

### 2.1 Segunda Ley de Newton para el Descenso/Ascenso Vertical
$$m(t) \cdot \frac{d^2 y}{dt^2} = E(y) - W(t) - F_{\text{drag}}\left(\frac{dy}{dt}\right)$$

Sistema de primer orden implementado en el solucionador **Runge-Kutta 4 (RK4)** con sub-stepping:
$$\begin{cases}
\dfrac{dy}{dt} = v_y \\\\[8pt]
\dfrac{dv_y}{dt} = \dfrac{E(y) - W(t) - \frac{1}{2} C_d A \rho_{\text{agua}} v_y |v_y|}{m(t)}
\end{cases}$$

### 2.2 Variables Físicas Fundamentales
- **Masa Dinámica:** $m(t) = m_{\text{seco}} + \rho_{\text{agua}} \cdot V_{\text{lastre}}(t)$
- **Peso Total:** $W(t) = m(t) \cdot g$
- **Empuje Hidrostático:** $E(y) = \rho_{\text{agua}} \cdot V(y) \cdot g \cdot \eta(y)$
- **Compresibilidad del Casco (Ley de Hooke Volumétrica):**  
  $$V(y) = V_0 \cdot \Big(1 - \beta \cdot \rho_{\text{agua}} g |y|\Big)$$
- **Arrastre Cuadrático No Lineal (Morison):**  
  $$F_{\text{drag}} = \frac{1}{2} C_d A \rho_{\text{agua}} v_y |v_y|$$

---

## 📁 3. Arquitectura Modular del Código (ES6 Modules)

```
submarine-simulator/
├── index.html                   # HTML base, importmaps de Three.js y KaTeX
├── iniciar_simulador.bat        # Lanzador rápido de 1-clic para Windows
├── server.js                    # Servidor local Node.js sin dependencias
├── README.md                    # Documentación técnica V2.2
├── css/
│   └── styles.css               # Estilos glassmorphism cian, top-bar, modales e iconografía SVG
└── js/
    ├── main.js                  # Orquestador del ciclo de vida, render loop y eventos
    ├── config/
    │   └── constants.js         # Parámetros físicos (g, densidades, dimensiones base)
    ├── core/
    │   ├── PhysicsEngine.js     # Solucionador numérico RK4 y cálculo de fuerzas
    │   └── State.js             # Estado reactivo del submarino (lastre, posición, velocidad)
    ├── graphics/
    │   ├── SubmarineModel.js    # Malla procedural completa del submarino, piezas y tanques
    │   ├── LightingSystem.js    # Iluminación dual (ambiente naval + linterna móvil raycaster)
    │   └── Environment.js       # Plano de agua, cuadrícula luminiscente y lecho marino
    │   └── ParticleEffects.js   # Sistema de burbujas de purga y estela de propulsión
    └── ui/
        ├── HUD.js               # Paneles colapsables de telemetría y controles con SVGs
        ├── Icons.js             # Diccionario centralizado de SVGs vectoriales limpios
        └── MathModal.js         # Renderizado de ecuaciones KaTeX y acordeones explicativos
```

---

## 🚀 4. Ejecución del Proyecto

1. **Lanzador de 1-Clic en Windows:**  
   Doble clic en `iniciar_simulador.bat`.
2. **Servidor Node.js Nativo:**  
   ```bash
   node server.js
   ```
   Abre automáticamente `http://localhost:3000/index.html`.
3. **Servidor Python:**  
   ```bash
   python -m http.server 3000
   ```
4. **Live Server:** Clic derecho en `index.html` $\rightarrow$ *Open with Live Server*.
