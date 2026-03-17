/* global Stockfish */

'use strict'

const ENGINE_ASSET_BASE = '/engines/fairy-stockfish/'
const ENGINE_SCRIPT_URL = `${ENGINE_ASSET_BASE}stockfish.js`
const OPENING_BOOK_URL = '/engines/xiangqi-opening-book.json'

const ENGINE_OPTIONS = {
  easy: { skill: 4, hash: 16, multiPV: 4, movetime: 250 },
  medium: { skill: 10, hash: 24, multiPV: 2, movetime: 700 },
  hard: { skill: 20, hash: 32, multiPV: 1, movetime: 1600 }
}

const listeners = new Set()
let engineInstance = null
let enginePromise = null
let openingBookPromise = null
let initError = null

const toEngineMove = (move) => {
  const file = (col) => String.fromCharCode(97 + col)
  const rank = (row) => String(10 - row)
  return `${file(move.from.col)}${rank(move.from.row)}${file(move.to.col)}${rank(move.to.row)}`
}

const weightedPick = (entries) => {
  const total = entries.reduce((sum, entry) => sum + Math.max(1, Number(entry.weight) || 1), 0)
  if (total <= 0) {
    return entries[0] || null
  }

  let cursor = Math.random() * total
  for (const entry of entries) {
    cursor -= Math.max(1, Number(entry.weight) || 1)
    if (cursor < 0) {
      return entry
    }
  }

  return entries[entries.length - 1] || null
}

const parseInfoLine = (line, previous) => {
  const next = { ...previous }
  const nodesMatch = line.match(/\bnodes\s+(\d+)/)
  const depthMatch = line.match(/\bdepth\s+(\d+)/)
  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/)

  if (nodesMatch) {
    next.nodes = Number(nodesMatch[1]) || 0
  }

  if (depthMatch) {
    next.depth = Number(depthMatch[1]) || 0
  }

  if (scoreMatch) {
    const [, kind, rawValue] = scoreMatch
    const value = Number(rawValue) || 0
    if (kind === 'mate') {
      next.score = value > 0 ? 100000 - value : -100000 - value
      next.scoreLabel = `mate ${value}`
    } else {
      next.score = value
      next.scoreLabel = value.toLocaleString()
    }
  }

  return next
}

const addListener = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const waitForLine = (predicate, timeoutMs) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for engine output`))
    }, timeoutMs)

    const cleanup = addListener((line) => {
      if (!predicate(line)) {
        return
      }

      clearTimeout(timeout)
      cleanup()
      resolve(line)
    })
  })

const sendCommand = (command) => {
  if (!engineInstance) {
    throw new Error('Engine has not been initialized')
  }
  engineInstance.postMessage(command)
}

const waitReady = async () => {
  sendCommand('isready')
  await waitForLine((line) => line === 'readyok', 10000)
}

const ensureOpeningBook = async () => {
  if (!openingBookPromise) {
    openingBookPromise = fetch(OPENING_BOOK_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Opening book request failed with ${response.status}`)
        }
        return response.json()
      })
      .catch((error) => {
        console.error(error)
        return {}
      })
  }

  return openingBookPromise
}

const ensureEngine = async () => {
  if (initError) {
    throw initError
  }

  if (!enginePromise) {
    enginePromise = (async () => {
      if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('SharedArrayBuffer is unavailable. Configure COOP/COEP headers to enable Fairy-Stockfish.')
      }

      importScripts(ENGINE_SCRIPT_URL)

      const stockfishFactory = typeof Stockfish === 'function' ? Stockfish : self.Stockfish
      if (typeof stockfishFactory !== 'function') {
        throw new Error('Fairy-Stockfish script did not expose a factory function')
      }

      engineInstance = await stockfishFactory({
        locateFile(file) {
          return `${ENGINE_ASSET_BASE}${file}`
        },
        mainScriptUrlOrBlob: ENGINE_SCRIPT_URL
      })

      engineInstance.addMessageListener((line) => {
        const text = String(line)
        for (const listener of listeners) {
          listener(text)
        }
      })

      sendCommand('uci')
      await waitForLine((line) => line === 'uciok', 10000)
      sendCommand('setoption name UCI_Variant value xiangqi')
      sendCommand('setoption name Threads value 1')
      sendCommand('setoption name Hash value 32')
      await waitReady()

      self.postMessage({
        type: 'ready',
        backend: 'Fairy-Stockfish'
      })

      return engineInstance
    })().catch((error) => {
      initError = error instanceof Error ? error : new Error(String(error))
      self.postMessage({
        type: 'unavailable',
        reason: initError.message
      })
      throw initError
    })
  }

  return enginePromise
}

const searchWithEngine = async (request) => {
  const engine = await ensureEngine()
  const openingBook = await ensureOpeningBook()
  const difficulty = ENGINE_OPTIONS[request.difficultyId] || ENGINE_OPTIONS.medium
  const historyMoves = request.history.map(toEngineMove)
  const legalMoveMap = new Map(request.legalMoves.map((move) => [toEngineMove(move), move]))
  const openingEntries = Array.isArray(openingBook[historyMoves.join(',')]) ? openingBook[historyMoves.join(',')] : []
  const legalOpeningEntries = openingEntries.filter((entry) => legalMoveMap.has(entry.move))

  if (legalOpeningEntries.length > 0) {
    const choice = weightedPick(legalOpeningEntries)
    return {
      move: choice ? legalMoveMap.get(choice.move) || null : null,
      score: 0,
      nodes: 0,
      scoreLabel: 'book',
      source: 'opening_book',
      backend: 'Fairy-Stockfish + opening book'
    }
  }

  sendCommand(`setoption name Skill Level value ${difficulty.skill}`)
  sendCommand(`setoption name MultiPV value ${difficulty.multiPV}`)
  sendCommand(`setoption name Hash value ${difficulty.hash}`)
  sendCommand('ucinewgame')
  await waitReady()

  if (historyMoves.length > 0) {
    sendCommand(`position startpos moves ${historyMoves.join(' ')}`)
  } else {
    sendCommand('position startpos')
  }

  let searchSummary = {
    score: 0,
    scoreLabel: '0',
    nodes: 0,
    depth: 0
  }

  const removeInfoListener = addListener((line) => {
    if (!line.startsWith('info ')) {
      return
    }
    searchSummary = parseInfoLine(line, searchSummary)
  })

  try {
    sendCommand(`go movetime ${difficulty.movetime}`)
    const bestmoveLine = await waitForLine((line) => line.startsWith('bestmove '), difficulty.movetime + 6000)
    const [, bestmove] = bestmoveLine.split(/\s+/)

    return {
      move: bestmove && bestmove !== '(none)' ? legalMoveMap.get(bestmove) || null : null,
      score: searchSummary.score,
      nodes: searchSummary.nodes,
      scoreLabel: searchSummary.scoreLabel,
      source: 'engine',
      backend: 'Fairy-Stockfish',
      depth: searchSummary.depth
    }
  } finally {
    removeInfoListener()
  }
}

self.onmessage = async (event) => {
  const request = event.data
  if (!request || request.type !== 'search') {
    return
  }

  try {
    const result = await searchWithEngine(request)
    self.postMessage({
      type: 'result',
      id: request.id,
      result
    })
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: request.id,
      reason: error instanceof Error ? error.message : String(error)
    })
  }
}
