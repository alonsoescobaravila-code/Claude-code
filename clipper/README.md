# Clipper

Convierte un episodio o un directo largo en clips verticales 9:16 listos para subir a TikTok, Instagram y YouTube Shorts.

Cada clip sale con:

- un **título** arriba, en letra blanca limpia;
- **subtítulos** grabados, con la palabra que se está diciendo en amarillo;
- un **CTA** (llamado a la acción) en pantalla;
- **sin marca de agua**;
- un archivo `.txt` con el texto para cada red: descripción, CTA, etiquetas, hashtags y, si la campaña lo pide, la historia.

No publica nada. Tú subes los videos, pones la historia y mandas los enlaces a la campaña.

> Usa esto solo con contenido que tengas permiso para recortar: una campaña de clips (como Stream LA en Content Rewards / Whop) o un streamer que lo permita. Da siempre crédito.

## 1. Instalar (una sola vez)

1. Descarga esta carpeta `clipper` a tu computadora (por ejemplo, al Escritorio).
2. Abre una terminal dentro de la carpeta:
   - **Windows:** abre la carpeta, escribe `powershell` en la barra de direcciones y pulsa Enter.
   - **Mac:** abre Terminal, escribe `cd ` (con espacio), arrastra la carpeta a la ventana y pulsa Enter.
3. Ejecuta el instalador:
   - **Windows:** `powershell -ExecutionPolicy Bypass -File setup.ps1`
   - **Mac:** `bash setup.sh`

   Instala lo que falte (Node.js, ffmpeg, Python) y el transcriptor. Si te dice que cierres la ventana, ábrela de nuevo y vuelve a ejecutarlo.

## 2. Sacar clips de un episodio (un solo comando)

Pon el video en la carpeta y ejecuta:

```
node clipper.mjs auto episodio.mp4
```

El comando hace todo seguido:

1. **Transcribe** el video. La primera vez descarga el modelo; un episodio de una hora tarda entre 10 y 20 minutos en una computadora normal.
2. **Busca los momentos** más fuertes: volumen, ritmo de diálogo, gritos y preguntas.
3. **Escribe un borrador de `plan.json`**, con los momentos elegidos y un título provisional.
4. **Recorta los clips** en la carpeta `out/`: `clip_01.mp4`, `clip_01.txt`, etc.

## 3. Revisar antes de publicar (importante)

El borrador usa como título una frase del clip y no sabe quién sale. Abre `plan.json` con el Bloc de notas y, en cada clip:

- **`title`:** cámbialo por un título tuyo, distinto en cada clip. Ejemplo: `"India Love CRASHED OUT After Vegas Ky Did THIS!"`.
- **`cast`:** escribe quién sale, con el nombre tal como está en `presets/streamla.json`. Ejemplo: `["India Love", "Vegas Ky"]`.
- **`draft`:** borra la línea `"draft": true`.
- **`start` / `end`:** ajústalos si quieres empezar antes o terminar después.

Luego vuelve a recortar solo con tu plan:

```
node clipper.mjs cut episodio.mp4 plan.json
```

## 4. Campañas (presets)

Los ajustes de cada campaña están en `presets/`:

- **`streamla.json`** (el que se usa si no pones nada): Streamhouse LA en CWETV, en inglés. Trae los 4 CTA en rotación, los hashtags obligatorios, `@streamhousela`, los usuarios del elenco y los enlaces de la historia.
- **`generico.json`**: clips de un streamer, en español. Antes de usarlo, cambia `"credit"` por el usuario del streamer y ajusta los hashtags.

Para usar otro preset:

```
node clipper.mjs auto directo.mp4 --preset generico
```

Para una campaña nueva, copia un preset, cámbiale el nombre y edita sus datos.

## 5. Directos de Twitch, con el chat

En un directo, el chat marca muy bien los mejores momentos. Con permiso del streamer, desde tu casa:

1. Descarga TwitchDownloaderCLI (github.com/lay295/TwitchDownloader/releases) y ponlo en esta carpeta.
2. Baja el chat y el video:
   ```
   TwitchDownloaderCLI chatdownload --id https://www.twitch.tv/videos/NUMERO -o chat.json
   TwitchDownloaderCLI videodownload --id https://www.twitch.tv/videos/NUMERO -o directo.mp4
   ```
3. Saca los clips usando también el chat:
   ```
   node clipper.mjs auto directo.mp4 --preset generico --chat chat.json
   ```

`chat-clips.mjs` es la versión solo-chat de la guía "The Chat Clip Finder".

## Opciones

| Opción | Qué hace | Por defecto |
|---|---|---|
| `--preset nombre` | la campaña de `presets/` | `streamla` |
| `--top 8` | cuántos momentos buscar | 8 |
| `--chat chat.json` | suma los picos del chat de Twitch | sin chat |
| `--model small` | el modelo de transcripción (`base` es más rápido, `medium` más preciso) | el del preset |
| `--out carpeta` | dónde guardar los clips | `out/` junto al video |
| `--again` | rehace la transcripción y el plan | no |

## Archivos

- `clipper.mjs`: el comando principal.
- `transcribe.py`: la transcripción con faster-whisper (MIT).
- `presets/`: los ajustes de cada campaña.
- `chat-clips.mjs`: el buscador por chat de Twitch.
- `setup.sh` y `setup.ps1`: los instaladores.
- `Poppins-Bold.ttf`: la fuente de títulos y subtítulos (licencia OFL, en `Poppins-OFL.txt`).
