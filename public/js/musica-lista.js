/* Lista de música incluida, compartida por el editor de vídeo (video.html)
   y el reel de cuadros (reel.html). Es la única fuente de verdad: los ids
   son el nombre del MP3 sin extensión en public/audio y tools/embed-audio.js
   lee este archivo para generar public/js/audio-data.js.

   Las pistas de Mixkit y las composiciones originales CC0 se recortan a
   60 s y 112 kbps (public/audio/LEEME.md). `grupo` es solo la etiqueta que
   se pinta en la fila y `dur` la duración real que se muestra. */
window.TET_LISTA_MUSICA = [
    { id: 'driving-ambition', titulo: 'Driving Ambition', autor: 'Ahjay Stelino', dur: 60, grupo: 'Noticias' },
    { id: 'delayed-flight', titulo: 'Delayed Flight', autor: 'Michael Ramir C.', dur: 60, grupo: 'Última hora' },
    { id: 'almost-game-time', titulo: 'Almost Game Time', autor: 'Ahjay Stelino', dur: 60, grupo: 'Última hora' },
    { id: 'tech-house-vibes', titulo: 'Tech House vibes', autor: 'Alejandro Magaña (A. M.)', dur: 60, grupo: 'Tecnología' },
    { id: 'new-bass-01', titulo: 'New Bass 01', autor: 'Lily J', dur: 60, grupo: 'Tecnología' },
    { id: 'digital-clouds', titulo: 'Digital Clouds', autor: 'Alejandro Magaña (A. M.)', dur: 60, grupo: 'Tecnología' },
    { id: 'sci-fi-score', titulo: 'Sci-Fi Score', autor: 'Arulo', dur: 60, grupo: 'Tecnología' },
    { id: 'epic-games', titulo: 'Epic Games', autor: 'Ahjay Stelino', dur: 60, grupo: 'Videojuegos' },
    { id: 'games-music', titulo: 'Games Music', autor: 'Grigoriy Nuzhny', dur: 60, grupo: 'Videojuegos' },
    { id: 'hip-hop-02', titulo: 'Hip Hop 02', autor: 'Lily J', dur: 60, grupo: 'General' },
    { id: 'epical-drums-01', titulo: 'Epical Drums 01', autor: 'Grigoriy Nuzhny', dur: 60, grupo: 'Acción' },
    { id: 'clasica-original-cc0', titulo: 'Aire clásico original', autor: 'Composición original tet · CC0 1.0', dur: 60, grupo: 'Clásica' },
    { id: 'clasica-dramatica-cc0', titulo: 'Clásica dramática', autor: 'Composición original tet · CC0 1.0', dur: 60, grupo: 'Clásica' },
    { id: 'clasica-feliz-cc0', titulo: 'Clásica feliz', autor: 'Composición original tet · CC0 1.0', dur: 60, grupo: 'Clásica' },
    { id: 'clasica-triste-cc0', titulo: 'Clásica triste', autor: 'Composición original tet · CC0 1.0', dur: 60, grupo: 'Clásica' },
    { id: 'canyons', titulo: 'Canyons', autor: 'Pista del proyecto', dur: 60, grupo: 'General' },
    { id: 'comedy-corridor', titulo: 'Comedy Corridor', autor: 'Pista del proyecto', dur: 60, grupo: 'General' },
    { id: 'countless', titulo: 'Countless', autor: 'Pista del proyecto', dur: 60, grupo: 'General' },
    { id: 'digital-horizon', titulo: 'Digital Horizon', autor: 'Pista del proyecto', dur: 43, grupo: 'Tecnología' },
    { id: 'future', titulo: 'Future', autor: 'Pista del proyecto', dur: 34, grupo: 'Tecnología' },
    { id: 'war', titulo: 'War', autor: 'Pista del proyecto', dur: 60, grupo: 'Acción' },
    { id: 'neon-futuristic', titulo: 'Neon Futuristic', autor: 'ikoliks_aj', dur: 60, grupo: 'Tecnología' }
];
