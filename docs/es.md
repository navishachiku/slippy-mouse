# Slippy Mouse

![Slippy Mouse](./images/banner.png)

Una herramienta de mejora del ratón para reproductores de vídeo online: el reproductor se divide en tres zonas y, dentro de cada zona, basta girar la **rueda** del ratón para ajustar volumen, velocidad de reproducción, avance y más — con total fluidez. Sin atajos que memorizar ni botones que buscar: un giro suave y listo. Un panel de configuración permite personalizar cada acción de rueda y clic.

## ✨ Características Principales

* **Soporte Multi-Sitio**: Funciona tanto en **YouTube** como en **Bilibili** (`www.bilibili.com`), con zonas y acciones idénticas en ambos sitios.

* **Controles Rápidos**: Configura zonas de acción personalizadas en el reproductor que corresponden a acciones del ratón, como clics y desplazamiento de rueda, para ajustar rápidamente el volumen, velocidad, progreso, etc.

* **Zonas de Acción Personalizadas**: Admite ajustes de zona altamente personalizables, permitiéndote ajustar libremente el tamaño y la posición de la zona (la configuración predeterminada incluye las zonas Izquierda, Centro y Derecha).

* **Interacción sin Capas (Zero-Overlay)**: Abandona las capas transparentes tradicionales y utiliza cálculos de coordenadas de alto rendimiento, asegurando que no haya interferencias con los clics de la interfaz nativa.

* **Rueda Adaptativa**: Un clic físico de la rueda o un deslizamiento equivale exactamente a una acción en cualquier dispositivo — ruedas de ratón, trackpads y software de desplazamiento suave (Mos, SmoothScroll, Logitech Options+) — sin necesidad de ajustes. Las colas de inercia se suprimen y los deslizamientos largos deliberados mantienen una respuesta proporcional.

* **Panel de Configuración Gráfico**: Todos los parámetros y asignaciones de acciones de zona se pueden ajustar en un panel dentro de la página — los cambios se aplican al instante y se guardan en el navegador, así que las actualizaciones del script nunca borran tus personalizaciones.

![DEMO](./images/demo.webp)

## 🎛️ Panel de Configuración

Sin editar código — haz clic en el icono de ratón en la barra de controles del reproductor para abrir el panel de configuración:

![Acceso al panel de configuración](./images/settings-entry.png)

![Settings Panel](./images/settings-general.png)

* **Cuatro pestañas**: General (rueda adaptativa, atajos, apariencia, OSD), Acciones de Zona, Rueda (ajuste adaptativo y filtrado manual) y Avanzado (depuración, datos de configuración).
* **Asignación de acciones por zona**: Selecciona una zona de color y asigna cualquier acción con su valor a cada disparador (clic izquierdo / derecho / central, rueda arriba / abajo):

![Zone Actions](./images/settings-zones.png)

* **Aplicación instantánea y persistencia**: Los cambios se aplican al momento; "Guardar" los escribe en el almacenamiento del navegador — **las actualizaciones del script nunca borran tu configuración**; "Cancelar" o Esc revierte.
* **Atajos**: La visualización de zonas usa `Alt+Shift+Z` por defecto; el atajo del panel viene sin asignar. Ambos se pueden reasignar en el panel, con soporte para combinaciones de modificadores (Esc cancela la captura, Backspace borra).
* **Exportar / Importar / Restablecer**: Respalda la configuración como JSON, llévala a otro navegador o restaura los valores de fábrica con un clic.
* **Idioma de la interfaz**: Sigue el idioma del navegador (inglés, chino tradicional/simplificado, japonés, coreano, portugués, español), con inglés como respaldo.
* **Apariencia**: Claro / oscuro / automático (según el sistema).

## ⚙️ Parámetros Personalizables

Todos los parámetros se pueden ajustar en el panel de configuración (recomendado). También puedes editar directamente los bloques `SETTINGS` y `CONFIG` en la parte superior del script, pero ten en cuenta: las ediciones directas se sobrescriben con las actualizaciones del script, mientras que la configuración del panel se conserva.

<details>
<summary><b>Avanzado: referencia completa de parámetros</b> (clic para expandir)</summary>

### Configuración Global (Global Settings)

| Parámetro | Descripción | Predeterminado |
| :--- | :--- | :--- |
| `DEBUG` | Si se deben mostrar mensajes de depuración en la consola | `false` |
| `ZONE_TOGGLE_KEY` | Tecla de acceso rápido para alternar la visibilidad de las zonas (admite combinaciones de modificadores) | `Alt+Shift+Z` |
| `SETTINGS_TOGGLE_KEY` | Atajo para abrir el panel de configuración (la entrada principal es el botón de la barra de controles) | Sin asignar |
| `OSD_DURATION` | Tiempo que los avisos OSD permanecen en pantalla (ms) | `800` |
| `OSD_FADE_OUT` | Duración de la animación de desvanecimiento OSD (ms) | `150` |
| `OSD_FONT_SIZE` | Tamaño de fuente del texto OSD (soporta px, em, rem, etc.) | `28px` |
| `ADAPTIVE_WHEEL` | Rueda adaptativa: un clic/deslizamiento = una acción en cualquier dispositivo. Establécelo en `false` para usar la configuración manual de abajo | `true` |
| `WHEEL_STEP` | Modo adaptativo: desplazamiento acumulado (px) por acción; redúcelo para una respuesta más fina | `100` |
| `GESTURE_GAP` | Adaptativo: silencio (ms) tras el cual la entrada cuenta como gesto nuevo | `150` |
| `MIN_ACTION_INTERVAL` | Adaptativo: intervalo mínimo (ms) entre acciones; limita ráfagas | `80` |
| `IMPULSE_MIN` | Adaptativo: desplazamiento mínimo (px) para liquidarse como una acción; filtra roces | `20` |
| `REACCEL_FACTOR` | Adaptativo: razón de salto de magnitud que marca un clic nuevo dentro de una cola en decaimiento | `1.5` |
| `DISCRETE_SETTLE` | Adaptativo: retardo de liquidación (ms) para clics de evento único (rueda sin suavizado) | `60` |
| `USE_WHEEL_COUNT_FIXED` | Solo modo manual: si se debe activar el filtrado de recuento de rueda fijo | `false` |
| `WHEEL_DELAY` | Solo modo manual: tiempo de retraso de antivibración para eventos de rueda (ms) | `1` |
| `WHEEL_COUNT_THRESHOLD` | Umbral de activación: cuántos eventos de rueda acumular antes de actuar | `14` |

### Configuración de Zonas (Custom Zone Configuration)

Puedes personalizar totalmente las zonas de acción según tus necesidades, ajustando su tamaño y posición.

La configuración predeterminada incluye:

| Zona | Clic Izquierdo | Clic Derecho | Acción de Rueda |
| ----- | ----- | ----- | ----- |
| **Izquierda (Volumen)** | Volumen Máximo (100%) | Silencio Rápido (0%) | Paso de Volumen +/- 5% |
| **Centro (Progreso)** | Nativo (Reproducir/Pausar) | Nativo (Menú) | Salto de Progreso +/- 5s |
| **Derecha (Velocidad)** | Rápido 2.0x | Restablecer 1.0x | Paso de Velocidad +/- 0.25x |

### Lista de Acciones Compatibles (Supported Actions List)

En `mouse_action`, los tipos de `action` que puedes usar son:

| Nombre de Acción (action) | Descripción | Ejemplo de Parámetro (value) |
| :--- | :--- | :--- |
| `volume_up` | Aumentar volumen | `5` (+5%) |
| `volume_down` | Disminuir volumen | `5` (-5%) |
| `volume_set` | Establecer volumen fijo | `0` (Silencio) o `100` (Máximo) |
| `volume_mute` | Alternar silencio | No requiere parámetro |
| `seek` | Saltar progreso | `5` (adelante) o `-5` (atrás) |
| `toggle_play_pause` | Alternar reproducción/pausa | No requiere parámetro |
| `speed_up` | Aumentar velocidad | `0.25` |
| `speed_down` | Disminuir velocidad | `0.25` |
| `speed_set` | Establecer velocidad fija | `1.0`, `2.0`, etc. |
| `none` | Ninguna acción | Pasa el evento al manejo nativo del sitio |

</details>

## 📦 Instalación

**Método 1: Instalación del Userscript con un clic (recomendado, funciona en los principales navegadores)**

1. Instala la extensión de navegador [Tampermonkey](https://www.tampermonkey.net/).
2. Visita la **[página del script en GreasyFork](https://greasyfork.org/scripts/566499)**.
3. Haz clic en el botón **"Instalar este script"**.

**Método 2: Versión de extensión de navegador**

El listado en Microsoft Edge Add-ons está en preparación. También puedes descargar el directorio `extension/` de este repo y cargarlo manualmente desde la página de extensiones del navegador con el Modo de desarrollador activado.

**Método 3: Instalación manual del Userscript**

1. Crea un "Nuevo Script" en Tampermonkey.
2. Copia y pega el contenido de `SlippyMouse.user.js`.
3. ¡Guarda y disfruta!

---

*Metraje de fondo de la demo: [Ireland 4K: Nature Relaxation, Cliffs of Moher & Emerald Landscapes](https://www.youtube.com/watch?v=MSSkVk0em2Y) — Scenic 4K by John (licencia Creative Commons Atribución).*
