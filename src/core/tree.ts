import { DEFAULT_POSITION } from 'chess.js'
import { positionKey } from './parseGame'
import type { Color, ParsedGame } from './types'

export interface Stats {
  games: number
  win: number
  draw: number
  loss: number
  /** Resultado "*" o ausente: no entra en los porcentajes. */
  unknown: number
}

export interface Edge extends Stats {
  san: string
  from: string
  to: string
  /** Clave de la posición a la que lleva la jugada. */
  target: string
}

export interface TreeNode {
  key: string
  fen: string
  stats: Stats
  children: Map<string, Edge>
  /** Índices (en `games`) de las partidas que pasaron por esta posición. */
  gameIndices: number[]
}

export interface OpeningTree {
  rootKey: string
  nodes: Map<string, TreeNode>
  games: ParsedGame[]
}

const emptyStats = (): Stats => ({ games: 0, win: 0, draw: 0, loss: 0, unknown: 0 })

function outcomeFor(game: ParsedGame, color: Color): keyof Omit<Stats, 'games'> {
  if (game.result === '1/2-1/2') return 'draw'
  if (game.result === '*') return 'unknown'
  const whiteWon = game.result === '1-0'
  return whiteWon === (color === 'w') ? 'win' : 'loss'
}

function bump(s: Stats, outcome: keyof Omit<Stats, 'games'>) {
  s.games++
  s[outcome]++
}

export function playerGames(games: ParsedGame[], playerKey: string, color: Color): ParsedGame[] {
  return games.filter((g) => (color === 'w' ? g.whiteKey : g.blackKey) === playerKey)
}

/**
 * Grafo de posiciones (por FEN sin contadores) con estadísticas desde el punto
 * de vista del jugador. Las transposiciones caen en el mismo nodo; una partida
 * cuenta una sola vez por nodo y por jugada aunque repita la posición.
 */
export function buildTree(games: ParsedGame[], playerKey: string, color: Color): OpeningTree {
  const own = playerGames(games, playerKey, color)
  const rootKey = positionKey(DEFAULT_POSITION)
  const nodes = new Map<string, TreeNode>()

  const nodeFor = (key: string, fen: string) => {
    let node = nodes.get(key)
    if (!node) {
      node = { key, fen, stats: emptyStats(), children: new Map(), gameIndices: [] }
      nodes.set(key, node)
    }
    return node
  }

  own.forEach((game, index) => {
    const outcome = outcomeFor(game, color)
    const visitedNodes = new Set<string>()
    const visitedEdges = new Set<string>()

    const visit = (node: TreeNode) => {
      if (visitedNodes.has(node.key)) return
      visitedNodes.add(node.key)
      bump(node.stats, outcome)
      node.gameIndices.push(index)
    }

    let current = nodeFor(rootKey, DEFAULT_POSITION)
    visit(current)
    for (const ply of game.plies) {
      const next = nodeFor(ply.key, ply.fen)
      const edgeId = `${current.key}|${ply.san}`
      let edge = current.children.get(ply.san)
      if (!edge) {
        edge = { san: ply.san, from: ply.from, to: ply.to, target: ply.key, ...emptyStats() }
        current.children.set(ply.san, edge)
      }
      if (!visitedEdges.has(edgeId)) {
        visitedEdges.add(edgeId)
        bump(edge, outcome)
      }
      visit(next)
      current = next
    }
  })

  return { rootKey, nodes, games: own }
}

/** Puntaje del jugador (victoria = 1, tablas = ½) sobre partidas con resultado. */
export function scorePercent(s: Stats): number | null {
  const decided = s.win + s.draw + s.loss
  return decided === 0 ? null : ((s.win + s.draw / 2) / decided) * 100
}
