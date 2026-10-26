import { describe, expect, it } from 'vitest'
import { decodePgnBytes } from './decode'
import { importGames } from './importGames'
import { normalizeName } from './names'
import { parseGame, positionKey, tokenizeMovetext } from './parseGame'
import { collectPlayers } from './players'
import { splitPgn } from './splitPgn'
import { buildTree, scorePercent } from './tree'

const SAMPLE = `[Event "Torneo Abierto"]
[Round "1.1"]
[White "Pérez, Juan"]
[Black "Gómez, Ana"]
[Result "1-0"]

1. e4 {comentario con 1-0 adentro} e5 2. Nf3 (2. f4 exf4) Nc6 3. Bb5 $1 a6 1-0

[Event "Torneo Abierto"]
[Round "1.2"]
[White "Lopez, Carlos"]
[Black "PEREZ, JUAN"]
[Result "1/2-1/2"]

1. d4 d5 2. c4 e6 1/2-1/2

[Event "Torneo Abierto"]
[Round "2.1"]
[White "Gomez, Ana"]
[Black "Lopez, Carlos"]
[Result "1-0"]

1-0

[White "Juan Perez"]
[Black "Lopez, Carlos"]
[Round "3.1"]

1.e4 e5 2.Nf3 Nf6 0-1
`

describe('decode', () => {
  it('acepta UTF-8', () => {
    expect(decodePgnBytes(new TextEncoder().encode('Pérez'))).toBe('Pérez')
  })
  it('cae a Windows-1252 si no es UTF-8 válido', () => {
    expect(decodePgnBytes(new Uint8Array([0x50, 0xe9, 0x72, 0x65, 0x7a]))).toBe('Pérez')
  })
  it('quita BOM y normaliza saltos de línea', () => {
    expect(decodePgnBytes(new TextEncoder().encode('﻿a\r\nb'))).toBe('a\nb')
  })
})

describe('names', () => {
  it('unifica acentos, mayúsculas y orden Apellido, Nombre', () => {
    const k = normalizeName('Pérez, Juan')
    expect(normalizeName('PEREZ, JUAN')).toBe(k)
    expect(normalizeName('Juan Perez')).toBe(k)
    expect(normalizeName('  perez ,  juan ')).toBe(k)
    expect(normalizeName('GM Pérez, Juan')).toBe(k)
  })
  it('nombres desconocidos dan clave vacía', () => {
    expect(normalizeName('?')).toBe('')
    expect(normalizeName(undefined)).toBe('')
    expect(normalizeName('NN')).toBe('')
  })
})

describe('splitPgn', () => {
  it('separa partidas, incluso sin [Event] ni resultado en cabecera', () => {
    const games = splitPgn(SAMPLE)
    expect(games).toHaveLength(4)
    expect(games[3].headers.White).toBe('Juan Perez')
    expect(games[0].movetext).toContain('Bb5')
  })
  it('separa partidas sin encabezados por el resultado', () => {
    expect(splitPgn('1. e4 e5 1-0\n\n1. d4 d5 0-1\n')).toHaveLength(2)
  })
  it('no corta por un resultado dentro de un comentario multilínea', () => {
    expect(splitPgn('1. e4 { gana\n1-0\n} e5 0-1')).toHaveLength(1)
  })
})

describe('parseGame', () => {
  it('ignora comentarios, variantes y NAGs', () => {
    expect(tokenizeMovetext('1. e4 {x} e5 (1... c5 2. Nf3) 2. Nf3 $14 Nc6!?')).toEqual(['e4', 'e5', 'Nf3', 'Nc6!?'])
  })
  it('acepta el formato "1. ... e5" de los estudios de Lichess', () => {
    const movetext = '1. e4 {[%eval 0.0]} 1. ... e5 {[%eval 0.12]} 2. Nf3 2. ... \nNc6 3. Bb5 $6 {x}\n    ( 3. d4 )\n3. ... a6 1/2-1/2'
    expect(tokenizeMovetext(movetext)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', '1/2-1/2'])
  })
  it('lee el Elo y lo omite si es 0 o falta', () => {
    const r = parseGame({ headers: { WhiteElo: '1615', BlackElo: '0' }, movetext: '1. e4' }, 'x')
    expect(r.ok && [r.game.whiteElo, r.game.blackElo]).toEqual([1615, undefined])
  })
  it('descarta partidas sin jugadas', () => {
    expect(parseGame({ headers: { Result: '1-0' }, movetext: '1-0' }, 'x')).toEqual({ ok: false, reason: 'sin-jugadas' })
  })
  it('trunca ante una jugada ilegal y avisa', () => {
    const r = parseGame({ headers: {}, movetext: '1. e4 e5 2. Ke3 Nc6' }, 'x')
    expect(r.ok && r.game.plies.map((p) => p.san)).toEqual(['e4', 'e5'])
    expect(r.ok && r.game.warning).toMatch(/Ke3/)
  })
  it('toma el resultado del texto si falta la cabecera y acepta 0-0', () => {
    const r = parseGame({ headers: {}, movetext: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. 0-0 0-1' }, 'x')
    expect(r.ok && r.game.result).toBe('0-1')
    expect(r.ok && r.game.plies.at(-1)?.san).toBe('O-O')
  })
})

describe('importGames', () => {
  it('cuenta válidas, descartadas y duplicadas entre archivos', () => {
    const { games, report } = importGames([
      { name: 'a.pgn', text: SAMPLE },
      { name: 'b.pgn', text: SAMPLE },
    ])
    expect(games).toHaveLength(3)
    expect(report.read).toBe(8)
    expect(report.discarded['sin-jugadas']).toBe(2)
    expect(report.discarded.duplicada).toBe(3)
  })
})

describe('players y árbol', () => {
  const { games } = importGames([{ name: 'a.pgn', text: SAMPLE }])
  const juan = normalizeName('Perez, Juan')

  it('detecta jugadores con su nombre más frecuente', () => {
    const players = collectPlayers(games)
    const p = players.find((x) => x.key === juan)!
    expect(p.asWhite).toBe(2)
    expect(p.asBlack).toBe(1)
    expect(players.map((x) => x.key)).not.toContain('')
  })

  it('arma estadísticas desde el punto de vista del jugador', () => {
    const tree = buildTree(games, juan, 'w')
    const root = tree.nodes.get(tree.rootKey)!
    expect(root.stats).toMatchObject({ games: 2, win: 1, loss: 1, draw: 0 })
    const e4 = root.children.get('e4')!
    expect(e4.games).toBe(2)
    const afterNf3 = tree.nodes.get(tree.nodes.get(e4.target)!.children.get('e5')!.target)!
    expect([...afterNf3.children.keys()]).toEqual(['Nf3'])
    expect(scorePercent(root.stats)).toBe(50)

    const black = buildTree(games, juan, 'b')
    expect(black.nodes.get(black.rootKey)!.stats).toMatchObject({ games: 1, draw: 1 })
  })

  it('agrupa transposiciones en el mismo nodo', () => {
    const { games: t } = importGames([
      { name: 't.pgn', text: '[White "A, B"]\n\n1. Nf3 d5 2. d4 1-0\n\n[White "A, B"]\n\n1. d4 d5 2. Nf3 0-1\n' },
    ])
    const tree = buildTree(t, normalizeName('A, B'), 'w')
    const target = positionKey(t[0].plies[2].fen)
    expect(tree.nodes.get(target)!.stats.games).toBe(2)
  })
})
