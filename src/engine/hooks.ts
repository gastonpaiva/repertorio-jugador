import { useEffect, useState } from 'react'
import { getEngine, isAbort, stopEngine } from './engine'
import type { Line, Score } from './score'

/** Interruptor del motor, recordado entre visitas. Apagado por defecto. */
export function useEngineEnabled(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem('engine') === 'on'
    } catch {
      return false
    }
  })
  const set = (value: boolean) => {
    setOn(value)
    if (!value) stopEngine()
    try {
      localStorage.setItem('engine', value ? 'on' : 'off')
    } catch {
      // Sin almacenamiento local: la preferencia simplemente no se recuerda.
    }
  }
  return [on, set]
}

export const MAX_LINES = 5

/** Cuántas variantes muestra el explorador (1 a 5), recordado entre visitas. */
export function useEngineLines(): [number, (n: number) => void] {
  const [n, setN] = useState(() => {
    try {
      const v = Number(localStorage.getItem('engineLines'))
      return v >= 1 && v <= MAX_LINES ? v : 1
    } catch {
      return 1
    }
  })
  const set = (value: number) => {
    setN(value)
    try {
      localStorage.setItem('engineLines', String(value))
    } catch {
      // Sin almacenamiento local: la preferencia simplemente no se recuerda.
    }
  }
  return [n, set]
}

export type EngineStatus = 'off' | 'loading' | 'running' | 'done' | 'error'

/**
 * Límites de cada búsqueda: se corta al llegar a la profundidad o al pasar el
 * tiempo (en ms), lo que ocurra primero. El motor liviano usa un solo núcleo.
 */
const LIMITS = {
  /** Mejor jugada de la posición del explorador; se muestra mientras profundiza. */
  best: 'depth 20 movetime 4000',
  /** Evaluación de las jugadas del rival (columna Eval.). */
  moves: 'depth 14 movetime 1500',
  /** Cada posición de una partida en el visor. */
  game: 'depth 12 movetime 500',
}

/** "loading" solo mientras el motor se descarga y arranca; después, "running". */
async function startEngine(setStatus: (s: EngineStatus) => void, signal: AbortSignal) {
  const engine = getEngine()
  if (!engine.isReady) {
    setStatus('loading')
    await engine.ready
  }
  if (!signal.aborted) setStatus('running')
  return engine
}

// Resultados ya terminados, para que volver a una posición sea instantáneo.
const bestCache = new Map<string, Line[]>()
const movesCache = new Map<string, Map<string, Score>>()

/**
 * Las `multipv` mejores variantes de una posición (se actualizan mientras el
 * motor profundiza) y la evaluación de cada jugada de `ucis`, buscando solo
 * entre ellas.
 */
export function usePositionAnalysis(fen: string, ucis: string[], enabled: boolean, multipv = 1) {
  const movesKey = `${fen}|${ucis.join(' ')}`
  const bestKey = `${fen}|${multipv}`
  const [lines, setLines] = useState<Line[]>([])
  const [moves, setMoves] = useState<Map<string, Score>>(new Map())
  const [status, setStatus] = useState<EngineStatus>('off')

  useEffect(() => {
    if (!enabled) {
      setStatus('off')
      return
    }
    const ctrl = new AbortController()
    const cachedBest = bestCache.get(bestKey)
    const cachedMoves = movesCache.get(movesKey)
    setLines(cachedBest ?? [])
    setMoves(cachedMoves ?? new Map())
    if (cachedBest && (cachedMoves || ucis.length === 0)) {
      setStatus('done')
      return
    }
    ;(async () => {
      const engine = await startEngine(setStatus, ctrl.signal)
      // Primero la columna Eval., que es corta; después la búsqueda larga de la mejor jugada.
      if (!cachedMoves && ucis.length > 0) {
        const lines = await engine.analyze(fen, {
          go: `${LIMITS.moves} searchmoves ${ucis.join(' ')}`,
          multipv: ucis.length,
          signal: ctrl.signal,
        })
        const map = new Map(lines.map((l) => [l.pv[0], l.score]))
        movesCache.set(movesKey, map)
        setMoves(map)
      }
      if (!cachedBest) {
        const result = await engine.analyze(fen, {
          go: LIMITS.best,
          multipv,
          signal: ctrl.signal,
          onInfo: setLines,
        })
        if (result.length > 0) bestCache.set(bestKey, result)
        setLines(result)
      }
      setStatus('done')
    })().catch((e) => {
      if (!isAbort(e)) setStatus('error')
    })

    return () => ctrl.abort()
  }, [movesKey, bestKey, enabled]) // las claves ya incluyen fen, ucis y multipv

  return {
    lines: enabled ? lines : [],
    best: enabled ? (lines[0] ?? null) : null,
    moves: enabled ? moves : new Map<string, Score>(),
    status,
  }
}

const gameCache = new Map<string, Line>()

/** Evalúa en orden todas las posiciones de una partida, con poca profundidad. */
export function useGameAnalysis(fens: string[], enabled: boolean) {
  const [evals, setEvals] = useState<(Line | undefined)[]>(() => fens.map((f) => gameCache.get(f)))
  const [status, setStatus] = useState<EngineStatus>('off')

  useEffect(() => {
    if (!enabled) {
      setStatus('off')
      return
    }
    const ctrl = new AbortController()
    ;(async () => {
      const engine = await startEngine(setStatus, ctrl.signal)
      for (let i = 0; i < fens.length; i++) {
        if (gameCache.has(fens[i])) continue
        const lines = await engine.analyze(fens[i], { go: LIMITS.game, signal: ctrl.signal })
        if (lines[0]) gameCache.set(fens[i], lines[0])
        setEvals(fens.map((f) => gameCache.get(f)))
      }
      setEvals(fens.map((f) => gameCache.get(f)))
      setStatus('done')
    })().catch((e) => {
      if (!isAbort(e)) setStatus('error')
    })
    return () => ctrl.abort()
  }, [fens, enabled])

  return { evals: enabled ? evals : [], status }
}
