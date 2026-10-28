import { parseInfo, sideToMove, type Line } from './score'

// Stockfish 19 "lite single-thread" (GPLv3): lo copia vite.config.ts desde node_modules.
const WORKER_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`

export interface AnalyzeOptions {
  /** Comando "go" sin la palabra go: "depth 16", "movetime 500 searchmoves e2e4 d2d4"... */
  go: string
  multipv?: number
  onInfo?: (lines: Line[]) => void
  signal?: AbortSignal
}

interface Job extends AnalyzeOptions {
  fen: string
  lines: Line[]
  resolve: (lines: Line[]) => void
  reject: (e: unknown) => void
}

/**
 * Stockfish en un Web Worker, con una cola: una búsqueda a la vez. Abortar una
 * búsqueda en curso manda "stop"; abortar una en cola la saca de la cola.
 */
class Engine {
  private worker: Worker
  private queue: Job[] = []
  private current: Job | null = null
  /** Se cumple cuando el motor ya se descargó y respondió "readyok". */
  readonly ready: Promise<void>
  isReady = false
  private waiters: { token: string; done: () => void }[] = []

  constructor() {
    this.worker = new Worker(WORKER_URL)
    this.worker.onmessage = (e: MessageEvent<string>) => this.onLine(String(e.data))
    // Si el worker no se puede descargar o falla al arrancar, ready se rechaza.
    const failed = new Promise<never>((_, reject) => {
      this.worker.onerror = (e) => reject(new Error(e.message || 'No se pudo cargar Stockfish'))
    })
    this.ready = Promise.race([
      (async () => {
        this.send('uci')
        await this.waitFor('uciok')
        this.send('isready')
        await this.waitFor('readyok')
        this.isReady = true
      })(),
      failed,
    ])
    this.ready.catch(() => {})
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd)
  }

  private waitFor(token: string) {
    return new Promise<void>((done) => this.waiters.push({ token, done }))
  }

  private onLine(line: string) {
    const waiter = this.waiters.find((w) => line.startsWith(w.token))
    if (waiter) {
      this.waiters = this.waiters.filter((w) => w !== waiter)
      waiter.done()
      return
    }
    const job = this.current
    if (!job) return
    if (line.startsWith('info ')) {
      const info = parseInfo(line, sideToMove(job.fen) === 'w')
      if (!info) return
      job.lines[info.multipv - 1] = info
      if (!job.signal?.aborted) job.onInfo?.(job.lines.filter(Boolean))
    } else if (line.startsWith('bestmove')) {
      this.current = null
      if (job.signal?.aborted) job.reject(new DOMException('Aborted', 'AbortError'))
      else job.resolve(job.lines.filter(Boolean))
      this.next()
    }
  }

  private async next() {
    if (this.current) return
    const job = this.queue.shift()
    if (!job) return
    this.current = job
    try {
      await this.ready
    } catch (e) {
      this.current = null
      for (const j of [job, ...this.queue]) j.reject(e)
      this.queue = []
      return
    }
    if (job.signal?.aborted) {
      this.current = null
      job.reject(new DOMException('Aborted', 'AbortError'))
      this.next()
      return
    }
    this.send(`setoption name MultiPV value ${job.multipv ?? 1}`)
    this.send(`position fen ${job.fen}`)
    this.send(`go ${job.go}`)
  }

  analyze(fen: string, opts: AnalyzeOptions): Promise<Line[]> {
    return new Promise((resolve, reject) => {
      const job: Job = { ...opts, fen, lines: [], resolve, reject }
      opts.signal?.addEventListener('abort', () => {
        if (this.current === job) this.send('stop')
        else if (this.queue.includes(job)) {
          this.queue = this.queue.filter((j) => j !== job)
          reject(new DOMException('Aborted', 'AbortError'))
        }
      })
      this.queue.push(job)
      this.next()
    })
  }

  terminate() {
    this.worker.terminate()
    for (const job of [this.current, ...this.queue]) job?.reject(new DOMException('Aborted', 'AbortError'))
    this.current = null
    this.queue = []
  }
}

let engine: Engine | null = null

/** El motor se crea (y se descarga) recién la primera vez que se pide. */
export function getEngine(): Engine {
  engine ??= new Engine()
  return engine
}

export function stopEngine() {
  engine?.terminate()
  engine = null
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
