# Repertorio de jugador

App web que arma el árbol de aperturas de un jugador a partir de archivos PGN descargados de Chess-Results. Corre 100% en el navegador: los PGN se guardan localmente (IndexedDB) y nunca salen de tu equipo.

## Funciones

- Carga de uno o varios PGN, guardados como **colecciones con nombre** (renombrar, agregar archivos, eliminar, activar/desactivar).
- Lectura tolerante: UTF-8 o Windows-1252, encabezados incompletos, comentarios, variantes y NAGs.
- Descarta partidas sin jugadas (incomparecencias, byes) e ignora duplicados entre archivos.
- Detección de jugadores normalizando acentos, mayúsculas, títulos y el formato "Apellido, Nombre".
- Explorador de aperturas por posición (FEN, agrupa transposiciones), separado para blancas y negras, con victorias/tablas/derrotas, tablero y lista de partidas.

## Uso

```bash
npm install
npm run dev     # servidor de desarrollo
npm test        # tests de la lógica (Vitest)
npm run build   # build de producción en dist/
```

## Stack

TypeScript · Vite · React · chess.js · react-chessboard · idb
