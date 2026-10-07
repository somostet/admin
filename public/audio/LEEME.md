# Música de `public/audio/`

Cuatro temas gratuitos de la biblioteca de música de **Mixkit** (licencia
Mixkit: uso personal y comercial, sin atribución obligatoria —
<https://mixkit.co/license/>).

**Los MP3 no viajan en el repo** (4 × 821 KB): aquí solo vive este
LEEME. La música que usa el editor está embebida en
`public/js/audio-data.js` (data: URL), porque en modo doble clic
(`file://`) no se puede hacer *fetch* de binarios. Las pistas embebidas
están **cortadas a 60 s y a 112 kbps** (~1,1 MB cada una en base64);
si el vídeo es más largo, la música se repite en bucle.

Para (re)generar el embed en local, coloca los MP3 en esta carpeta y:

    node tools/embed-audio.js

Los originales **completos** (256–320 kbps, 1:42–1:55) están en la
página de cada tema y en la columna «Original»:

| id (`LISTA_MUSICA`) | Tema | Autor | Página | Original |
|---|---|---|---|---|
| `driving-ambition` | Driving Ambition | Ahjay Stelino | <https://mixkit.co/free-stock-music/driving-ambition/> | <https://assets.mixkit.co/music/32/32.mp3> |
| `tech-house-vibes` | Tech House vibes | Alejandro Magana (A. M.) | <https://mixkit.co/free-stock-music/tech-house-vibes/> | <https://assets.mixkit.co/music/130/130.mp3> |
| `hip-hop-02` | Hip Hop 02 | Lily J | <https://mixkit.co/free-stock-music/hip-hop-02/> | <https://assets.mixkit.co/music/738/738.mp3> |
| `epical-drums-01` | Epical Drums 01 | Grigoriy Nuzhny | <https://mixkit.co/free-stock-music/epical-drums-01/> | <https://assets.mixkit.co/music/676/676.mp3> |

En el editor aparecen en **Contenido → Música de fondo**: un ▶ para
escucharlas y un clic en el título para elegirla (con volumen, «Quitar»
y deshacer, igual que un archivo subido).

Más música libre para redes: **YouTube Audio Library**, **Pixabay
Music**, **Uppbeat**, **Free Music Archive** (revisa la licencia de cada
tema) y, de pago, **Epidemic Sound** / **Artlist**.
