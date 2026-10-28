import { describe, expect, it } from 'vitest'
import { classifyMove, edgeUci, formatScore, parseInfo, uciToSan, whiteShare } from './score'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

describe('parseInfo', () => {
  it('pasa el puntaje del lado que mueve a blancas', () => {
    const line = 'info depth 14 seldepth 18 multipv 2 score cp 35 nodes 1000 nps 1 time 5 pv e7e5 g1f3'
    expect(parseInfo(line, true)).toEqual({ multipv: 2, depth: 14, score: { cp: 35 }, pv: ['e7e5', 'g1f3'] })
    expect(parseInfo(line, false)?.score).toEqual({ cp: -35 })
    expect(parseInfo('info depth 9 score mate -3 pv h2h3', false)?.score).toEqual({ mate: 3 })
  })

  it('ignora cotas y líneas sin puntaje', () => {
    expect(parseInfo('info depth 10 score cp 20 lowerbound pv e2e4', true)).toBeNull()
    expect(parseInfo('info depth 10 currmove e2e4 currmovenumber 1', true)).toBeNull()
    expect(parseInfo('info string NNUE enabled', true)).toBeNull()
  })

  it('mate 0: gana el que acaba de mover', () => {
    expect(formatScore(parseInfo('info depth 0 score mate 0', false)!.score)).toBe('1-0')
    expect(formatScore(parseInfo('info depth 0 score mate 0', true)!.score)).toBe('0-1')
  })
})

describe('formato y barra', () => {
  it('formatea centipeones y mates', () => {
    expect(formatScore({ cp: 35 })).toBe('+0.35')
    expect(formatScore({ cp: -120 })).toBe('−1.20')
    expect(formatScore({ cp: 0 })).toBe('0.00')
    expect(formatScore({ mate: 3 })).toBe('#3')
    expect(formatScore({ mate: -2 })).toBe('#−2')
  })

  it('la barra va de 0 a 100 y está pareja en 0', () => {
    expect(whiteShare({ cp: 0 })).toBe(50)
    expect(whiteShare({ mate: 1 })).toBeGreaterThan(95)
    expect(whiteShare({ mate: -1 })).toBeLessThan(5)
  })
})

describe('classifyMove', () => {
  it('marca según lo que pierde quien mueve', () => {
    expect(classifyMove({ cp: 30 }, { cp: 10 }, 'w')).toBeNull()
    expect(classifyMove({ cp: 30 }, { cp: -400 }, 'w')).toBe('??')
    // Para negras, que suba la evaluación es malo.
    expect(classifyMove({ cp: 0 }, { cp: 150 }, 'b')).toBe('?')
    expect(classifyMove({ cp: 0 }, { cp: -150 }, 'b')).toBeNull()
  })
})

describe('jugadas', () => {
  it('convierte entre SAN y UCI', () => {
    expect(edgeUci('e7', 'e8', 'e8=N+')).toBe('e7e8n')
    expect(edgeUci('g1', 'f3', 'Nf3')).toBe('g1f3')
    expect(uciToSan(START, ['e2e4', 'e7e5', 'g1f3', 'zzzz', 'b8c6'])).toEqual(['e4', 'e5', 'Nf3'])
    expect(uciToSan(AFTER_E4, ['c7c5'])).toEqual(['c5'])
  })
})
