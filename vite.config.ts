import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: funciona tanto en GitHub Pages (/repertorio-jugador/) como en cualquier otro hosting.
  base: './',
  plugins: [react()],
})
