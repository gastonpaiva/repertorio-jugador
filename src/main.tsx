import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { decodeGameHash } from './core/gameLink'
import { GameViewer } from './ui/GameViewer'

// Un enlace "#partida=..." abre el visor de una partida en lugar de la app.
const sharedGame = decodeGameHash(window.location.hash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{sharedGame ? <GameViewer game={sharedGame} /> : <App />}</StrictMode>,
)
