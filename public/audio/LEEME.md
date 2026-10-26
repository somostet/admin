# Música de `public/audio/`

Once temas de la biblioteca de música de **Mixkit** bajo la **Stock Music
Free License** (uso comercial y no comercial, sin atribución obligatoria),
más cuatro piezas clásicas originales creadas para este proyecto y
dedicadas a **CC0 1.0**: una instrumental, una dramática, una feliz y una
triste. Todas duran un minuto. Las condiciones de Mixkit están más abajo,
en «Licencia».

Los MP3 fuente no viajan como archivos independientes en el repo. La música
que usa el editor está embebida en
`public/js/audio-data.js` (data: URL), porque en modo doble clic
(`file://`) no se puede hacer *fetch* de binarios. Las pistas embebidas
están **cortadas a 60 s y a 112 kbps** (~0,82 MB cada una en base64);
si el vídeo es más largo, la música se repite en bucle (con un fundido
de 0,4 s al final para que el bucle no chasquee).

## Cómo añadir una pista nueva

1. Añade la entrada en `LISTA_MUSICA` (`public/js/video.js`) — es la
   única fuente de verdad: el `id` es el nombre del MP3 sin extensión.
2. Descarga el tema de Mixkit y recórtalo a 60 s / 112 kbps con ffmpeg
   (lo hace `tools/descargar-musica.js`, que además borra el crudo):

        ffmpeg -i crudo.mp3 -t 60 -af afade=t=out:st=59.6:d=0.4 \
            -codec:a libmp3lame -b:a 112k -ar 44100 -ac 2 public/audio/<id>.mp3

   Para regenerar las cuatro piezas originales clásicas CC0:

        node tools/generar-musica-clasica.js

3. Regenera el embed:

        node tools/embed-audio.js

Los originales **completos** (256–320 kbps, 1:40–2:50) de Mixkit están
en la página de cada tema y en la columna «Original».

## Temas incluidos

| id (`LISTA_MUSICA`) | Tema | Autor | Grupo | Página | Original |
|---|---|---|---|---|---|
| `driving-ambition` | Driving Ambition | Ahjay Stelino | Noticias | <https://mixkit.co/free-stock-music/driving-ambition/> | <https://assets.mixkit.co/music/32/32.mp3> |
| `delayed-flight` | Delayed Flight | Michael Ramir C. | Última hora | <https://mixkit.co/free-stock-music/delayed-flight/> | <https://assets.mixkit.co/music/1024/1024.mp3> |
| `almost-game-time` | Almost Game Time | Ahjay Stelino | Última hora | <https://mixkit.co/free-stock-music/almost-game-time/> | <https://assets.mixkit.co/music/75/75.mp3> |
| `tech-house-vibes` | Tech House vibes | Alejandro Magaña (A. M.) | Tecnología | <https://mixkit.co/free-stock-music/tech-house-vibes/> | <https://assets.mixkit.co/music/130/130.mp3> |
| `new-bass-01` | New Bass 01 | Lily J | Tecnología | <https://mixkit.co/free-stock-music/new-bass-01/> | <https://assets.mixkit.co/music/720/720.mp3> |
| `digital-clouds` | Digital Clouds | Alejandro Magaña (A. M.) | Tecnología | <https://mixkit.co/free-stock-music/digital-clouds/> | <https://assets.mixkit.co/music/175/175.mp3> |
| `sci-fi-score` | Sci-Fi Score | Arulo | Tecnología | <https://mixkit.co/free-stock-music/sci-fi-score/> | <https://assets.mixkit.co/music/464/464.mp3> |
| `epic-games` | Epic Games | Ahjay Stelino | Videojuegos | <https://mixkit.co/free-stock-music/epic-games/> | <https://assets.mixkit.co/music/76/76.mp3> |
| `games-music` | Games Music | Grigoriy Nuzhny | Videojuegos | <https://mixkit.co/free-stock-music/games-music/> | <https://assets.mixkit.co/music/706/706.mp3> |
| `hip-hop-02` | Hip Hop 02 | Lily J | General | <https://mixkit.co/free-stock-music/hip-hop-02/> | <https://assets.mixkit.co/music/738/738.mp3> |
| `epical-drums-01` | Epical Drums 01 | Grigoriy Nuzhny | Acción | <https://mixkit.co/free-stock-music/epical-drums-01/> | <https://assets.mixkit.co/music/676/676.mp3> |
| `clasica-original-cc0` | Aire clásico original | Composición original tet · CC0 1.0 | Clásica | Generada en `tools/generar-musica-clasica.js` | — |
| `clasica-dramatica-cc0` | Clásica dramática | Composición original tet · CC0 1.0 | Clásica | Generada en `tools/generar-musica-clasica.js` | — |
| `clasica-feliz-cc0` | Clásica feliz | Composición original tet · CC0 1.0 | Clásica | Generada en `tools/generar-musica-clasica.js` | — |
| `clasica-triste-cc0` | Clásica triste | Composición original tet · CC0 1.0 | Clásica | Generada en `tools/generar-musica-clasica.js` | — |

En el editor aparecen en **Ajustes → Música de fondo**: un ▶ para
escucharlas y un clic en el título para elegirla (con volumen, «Quitar»
y deshacer, igual que un archivo subido).

## Licencia (Mixkit Stock Music Free License)

Texto vigente en <https://mixkit.co/license/> (modal «Stock Music Free
License»):

> Items under the Mixkit Stock Music Free License can be used in your
> commercial and non-commercial projects for free. You're permitted to
> download, copy, modify, distribute and publicly perform the Music Items
> on any web or social media platform, including internet-based video on
> demand services, podcasts and advertisements.

**Permitido**

- Uso **comercial y no comercial**, gratis: vídeos de YouTube, redes
  sociales, anuncios online, podcasts y formación.
- Descargar, copiar, **modificar** y **distribuir** los archivos. Por eso
  es correcto recortar a 60 s y embeber los bytes en
  `public/js/audio-data.js` (que va al repo), incluso si el proyecto se
  distribuyera.
- **Sin atribución obligatoria.** Aun así, los autores están en la tabla
  de arriba y en la lista del editor: si algún día hay que dar crédito,
  ya está a mano.

**No permitido**

- CDs y DVDs, ni emisión en **TV o radio**.
- Usarlas **dentro de un videojuego** como banda sonora (sí valen en un
  vídeo *sobre* juegos: resumen, gameplay o trailer publicado).
- Remixes, o incorporarlas a un tema de solo música.
- Reclamarlas como propias o registrarlas en un sistema de derechos
  (p. ej. **Content ID** de YouTube).
- Quedan sujetas a los límites de los [User Terms](https://mixkit.co/terms/)
  de Mixkit. Ante una reclamación: `team@mixkit.co`.

**No son dominio público ni CC0**: los derechos pertenecen a sus autores
(Ahjay Stelino, Lily J, Arulo, Grigoriy Nuzhny…) y lo que se concede es el
uso bajo esta licencia.

Las piezas **Aire clásico original**, **Clásica dramática**, **Clásica
feliz** y **Clásica triste** no utilizan grabaciones ni composiciones de
terceros. Sus composiciones y grabaciones sintetizadas se dedican a
**CC0 1.0**; el código que las genera está disponible en
`tools/generar-musica-clasica.js`.

Alternativas libres para seguir ampliando: **YouTube Audio Library**,
**Pixabay Music**, **Uppbeat**, **Free Music Archive** (revisa la
licencia de cada tema) y, de pago, **Epidemic Sound** / **Artlist**.