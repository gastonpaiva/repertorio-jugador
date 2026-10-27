import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Color } from './core/types'

export type Lang = 'es' | 'en'

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

const es = {
  locale: 'es',
  /** Idioma de la página de Chess-Results (parámetro lan). */
  chessResultsLan: 2,
  app: {
    title: 'Repertorio de jugador',
    subtitle: 'Árbol de aperturas a partir de PGN de Chess-Results. Todo queda en tu navegador.',
    storageError: 'No se pudo abrir el almacenamiento del navegador; las colecciones no se guardarán.',
    language: 'Idioma',
    addGames: 'Agregar partidas',
    withWhite: (n: number) => `Con blancas (${n})`,
    withBlack: (n: number) => `Con negras (${n})`,
    emptyNoCollections: 'Empezá agregando partidas desde Chess-Results o desde un archivo.',
    emptyNoGames: 'Activá al menos una colección con partidas.',
    emptyPickPlayer: 'Elegí un jugador de la lista.',
    donateText: '¿Te sirvió para preparar tu partida? Este sitio es gratis y no tiene publicidad.',
    donateMercadoPago: '♟ Mercado Pago · $ 50',
    donateKofi: 'Ko-fi · desde otros países',
    /** Quien está en Uruguay paga más fácil con Mercado Pago; el resto, con Ko-fi. */
    kofiFirst: false,
  },
  guided: {
    title: 'Desde Chess-Results',
    open: 'Abrir búsqueda de partidas',
    instructions: (
      <>
        En Chess-Results, poné el <b>Código FIDE</b> del rival y tocá <b>Descargar en formato PGN</b>.
      </>
    ),
    pickDownloaded: 'Elegir el PGN descargado',
    dropHint: 'O arrastralo a este recuadro.',
    noGames: 'El archivo no tiene partidas con jugadas.',
    loaded: (name: string, n: number) => `Colección "${name}" cargada con ${n} ${plural(n, 'partida', 'partidas')}.`,
  },
  local: {
    title: 'Desde un archivo de tu equipo',
    description: 'Uno o más PGN que ya tengas guardados, de cualquier origen.',
    pick: 'Elegir PGN',
    andMore: (first: string, n: number) => `${first} y ${n} más`,
  },
  library: {
    title: 'Colecciones',
    empty: 'Todavía no hay colecciones. Agregá partidas desde Chess-Results o desde un archivo.',
    files: (n: number) => `${n} ${plural(n, 'archivo', 'archivos')}`,
    rename: 'Renombrar',
    addPgn: 'Agregar PGN',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
  },
  summary: {
    valid: 'partidas válidas',
    read: 'leídas',
    noMoves: (n: number) => `${n} sin jugadas (incomparecencias, byes)`,
    duplicates: (n: number) => `${n} ${plural(n, 'duplicada ignorada', 'duplicadas ignoradas')}`,
    nonStandard: (n: number) => `${n} desde posición no estándar`,
    truncated: (n: number) => `${n} ${plural(n, 'partida', 'partidas')} con jugadas inválidas (truncadas)`,
    invalidMove: (token: string, move: number, kept: number) =>
      `Jugada inválida "${token}" en la jugada ${move}; se usaron las primeras ${kept} medias jugadas.`,
  },
  picker: {
    title: 'Jugador',
    search: (n: number) => `Buscar entre ${n} jugadores…`,
    sortBy: 'Ordenar por',
    byGames: 'Partidas',
    byName: 'Nombre',
    countTitle: 'Total · con blancas / con negras',
    whiteAbbr: 'B',
    blackAbbr: 'N',
    noMatches: 'Sin coincidencias.',
  },
  explorer: {
    noResult: (n: number) => `${n} sin resultado`,
    noGamesFor: (color: Color) => `No hay partidas con ${color === 'w' ? 'blancas' : 'negras'} para este jugador.`,
    notInGames: (move: string) => `No hay partidas con ${move} en esta posición.`,
    first: '⏮ Inicio',
    back: '◀ Atrás',
    dragHint: 'Podés mover las piezas en el tablero para avanzar.',
    start: 'Inicio',
    gamesHere: (n: number) => `${plural(n, 'partida', 'partidas')} en esta posición`,
    score: 'puntaje',
    endOfGames: 'Fin de las partidas registradas.',
    move: 'Jugada',
    games: 'Partidas',
    scoreCol: 'Puntaje',
    gamesThrough: (n: number) => `Partidas que pasaron por esta posición (${n})`,
    result: 'Resultado',
    resultAbbr: 'Res.',
    opponent: 'Rival',
    event: 'Torneo',
    date: 'Fecha',
    moves: 'Jugadas',
    openGame: 'Ver la partida completa en otra pestaña',
  },
  viewer: {
    round: (r: string) => `Ronda ${r}`,
    keyboardHint: 'También podés usar las flechas ← → del teclado.',
  },
}

export type Messages = typeof es

const en: Messages = {
  locale: 'en',
  chessResultsLan: 1,
  app: {
    title: 'Player repertoire',
    subtitle: 'Opening tree from Chess-Results PGN files. Everything stays in your browser.',
    storageError: 'Could not open browser storage; collections will not be saved.',
    language: 'Language',
    addGames: 'Add games',
    withWhite: (n) => `As white (${n})`,
    withBlack: (n) => `As black (${n})`,
    emptyNoCollections: 'Start by adding games from Chess-Results or from a file.',
    emptyNoGames: 'Turn on at least one collection with games.',
    emptyPickPlayer: 'Pick a player from the list.',
    donateText: 'Did it help you prepare for your game? This site is free and has no ads.',
    donateMercadoPago: 'Mercado Pago (Uruguay) · $ 50 UYU',
    donateKofi: '♟ Support me on Ko-fi',
    kofiFirst: true,
  },
  guided: {
    title: 'From Chess-Results',
    open: 'Open game search',
    instructions: (
      <>
        On Chess-Results, enter the opponent's <b>Fide-ID</b> and click <b>Download as PGN-File</b>.
      </>
    ),
    pickDownloaded: 'Choose the downloaded PGN',
    dropHint: 'Or drop it on this box.',
    noGames: 'The file has no games with moves.',
    loaded: (name, n) => `Collection "${name}" loaded with ${n} ${plural(n, 'game', 'games')}.`,
  },
  local: {
    title: 'From a file on your device',
    description: 'One or more PGN files you already have, from any source.',
    pick: 'Choose PGN',
    andMore: (first, n) => `${first} and ${n} more`,
  },
  library: {
    title: 'Collections',
    empty: 'No collections yet. Add games from Chess-Results or from a file.',
    files: (n) => `${n} ${plural(n, 'file', 'files')}`,
    rename: 'Rename',
    addPgn: 'Add PGN',
    confirm: 'Confirm',
    cancel: 'Cancel',
    delete: 'Delete',
  },
  summary: {
    valid: 'valid games',
    read: 'read',
    noMoves: (n) => `${n} without moves (forfeits, byes)`,
    duplicates: (n) => `${n} ${plural(n, 'duplicate', 'duplicates')} ignored`,
    nonStandard: (n) => `${n} from a non-standard position`,
    truncated: (n) => `${n} ${plural(n, 'game', 'games')} with invalid moves (truncated)`,
    invalidMove: (token, move, kept) =>
      `Invalid move "${token}" at move ${move}; the first ${kept} half-moves were used.`,
  },
  picker: {
    title: 'Player',
    search: (n) => `Search among ${n} players…`,
    sortBy: 'Sort by',
    byGames: 'Games',
    byName: 'Name',
    countTitle: 'Total · as white / as black',
    whiteAbbr: 'W',
    blackAbbr: 'B',
    noMatches: 'No matches.',
  },
  explorer: {
    noResult: (n) => `${n} without result`,
    noGamesFor: (color) => `No games as ${color === 'w' ? 'white' : 'black'} for this player.`,
    notInGames: (move) => `No games with ${move} in this position.`,
    first: '⏮ Start',
    back: '◀ Back',
    dragHint: 'You can move the pieces on the board to go forward.',
    start: 'Start',
    gamesHere: (n) => `${plural(n, 'game', 'games')} in this position`,
    score: 'score',
    endOfGames: 'End of the recorded games.',
    move: 'Move',
    games: 'Games',
    scoreCol: 'Score',
    gamesThrough: (n) => `Games that reached this position (${n})`,
    result: 'Result',
    resultAbbr: 'Res.',
    opponent: 'Opponent',
    event: 'Event',
    date: 'Date',
    moves: 'Moves',
    openGame: 'Open the full game in a new tab',
  },
  viewer: {
    round: (r) => `Round ${r}`,
    keyboardHint: 'You can also use the ← → arrow keys.',
  },
}

const MESSAGES: Record<Lang, Messages> = { es, en }

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem('lang')
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    // Sin almacenamiento local: se usa el idioma del navegador.
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'es', setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
    } catch {
      // Sin almacenamiento local: el idioma simplemente no se recuerda.
    }
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

/** Textos de la interfaz en el idioma elegido. */
export function useT(): Messages {
  return MESSAGES[useContext(LangContext).lang]
}

// Banderas en SVG: Windows no dibuja los emojis de banderas.
const FLAGS: Record<Lang, ReactNode> = {
  es: (
    <svg className="flag" viewBox="0 0 3 2" aria-hidden="true">
      <rect width="3" height="2" fill="#c60b1e" />
      <rect y="0.5" width="3" height="1" fill="#ffc400" />
    </svg>
  ),
  en: (
    <svg className="flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <clipPath id="flag-uk-cross">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#flag-uk-cross)" stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  ),
}

const LANG_NAMES: Record<Lang, string> = { es: 'Español', en: 'English' }

export function LangSwitch() {
  const { lang, setLang } = useLang()
  const t = useT()
  return (
    <div className="tabs small lang-switch" role="group" aria-label={t.app.language}>
      {(['es', 'en'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} title={LANG_NAMES[l]} onClick={() => setLang(l)}>
          {FLAGS[l]}
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
