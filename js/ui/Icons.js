/**
 * Laboratorio Virtual de Dinámica Submarina (Física I - UTP)
 * Icons.js - Catálogo centralizado de iconos vectoriales SVG de alta precisión.
 * Estándar: Lucide / Feather Icons (viewBox 0 0 24 24, stroke-width 1.8, currentColor).
 * ESTRICTAMENTE LIBRE DE EMOJIS Y SÍMBOLOS INFORMALES.
 */

export const Icons = {
    // 1. Fundamentos Matemáticos y EDOs (Brújula / Compás técnico)
    math: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="m19 19-4-4"/>
            <path d="M2 19V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/>
            <path d="M7 10h4"/>
            <path d="M9 8v4"/>
            <path d="M14 8h3"/>
            <path d="M14 12h3"/>
        </svg>
    `,

    // 2. Modo Rayos X / Vista Translúcida (Capas superpuestas)
    xray: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
            <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
        </svg>
    `,

    // 3. Linterna Táctica Dirigible (Flashlight móvil)
    flashlight: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M18 6c0 2-2 4-2 4l-4 4-2-2 4-4s2-2 4-2Z"/>
            <path d="m6 16 2 2"/>
            <path d="M11 13 8 16a2.83 2.83 0 0 1-4-4l3-3"/>
            <path d="M18 2h4v4"/>
            <path d="M2 22l6-6"/>
            <path d="M14 10l-2-2"/>
        </svg>
    `,

    // 4. Reiniciar Simulación (Giro antihorario)
    rotateCcw: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
        </svg>
    `,

    // 5. Advertencia / Soplado de Emergencia
    alertTriangle: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
        </svg>
    `,

    // 6. Colapsar Panel (Signo menos)
    minus: `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M5 12h14"/>
        </svg>
    `,

    // 7. Expandir Panel (Signo más)
    plus: `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
        </svg>
    `,

    // 8. Flecha Acordeón (Chevron Abajo)
    chevronDown: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon chevron-icon">
            <path d="m6 9 6 6 6-6"/>
        </svg>
    `,

    // 9. Flecha Acordeón (Chevron Arriba)
    chevronUp: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon chevron-icon">
            <path d="m18 15-6-6-6 6"/>
        </svg>
    `,

    // 10. Cerrar Ventana / Modal (Cruz)
    close: `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
        </svg>
    `,

    // 11. Presets de Cámara (Cámara / Enfoque técnico)
    camera: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
        </svg>
    `,

    // 12. Pausa / Play
    pause: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <rect width="4" height="16" x="6" y="4"/>
            <rect width="4" height="16" x="14" y="4"/>
        </svg>
    `,
    play: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <polygon points="6 3 20 12 6 21 6 3"/>
        </svg>
    `,

    // 13. Soplado / Flujo de Aire (Wind)
    wind: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
        </svg>
    `,

    // 14. Inundación / Agua
    droplet: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
        </svg>
    `,

    // 15. Vista / Etiquetas Técnicas
    eye: `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    `
};
