import { cpSync, mkdirSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Copia Stockfish (versión liviana de un hilo, ~1,8 MB) de node_modules a
 * public/stockfish, para servirlo tal cual como Web Worker con su .wasm al lado.
 * Se hace en `config`, antes de que el servidor de desarrollo lea public/.
 */
function copyStockfish(): Plugin {
  return {
    name: 'copy-stockfish',
    config() {
      mkdirSync('public/stockfish', { recursive: true })
      for (const ext of ['js', 'wasm']) {
        cpSync(`node_modules/stockfish/bin/stockfish-19-lite-single.${ext}`, `public/stockfish/stockfish-19-lite-single.${ext}`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: funciona tanto en GitHub Pages (/repertorio-jugador/) como en cualquier otro hosting.
  base: './',
  plugins: [react(), copyStockfish()],
})
