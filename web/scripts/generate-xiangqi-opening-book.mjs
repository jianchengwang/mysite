import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'

const MAX_PLY = 16
const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w'
const OUTPUT_FILE = path.resolve(process.cwd(), 'public/engines/xiangqi-opening-book.json')
const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xqwlight-book-'))
const xqwlightDir = path.join(repoDir, 'xqwlight')

const loadXqwlightContext = () => {
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/xqbase/xqwlight', xqwlightDir], {
    stdio: 'ignore'
  })

  const context = { console, Math }
  vm.createContext(context)
  vm.runInContext(fs.readFileSync(path.join(xqwlightDir, 'JavaScript/position.js'), 'utf8'), context)
  vm.runInContext(fs.readFileSync(path.join(xqwlightDir, 'JavaScript/book.js'), 'utf8'), context)
  vm.runInContext(
    `
function collectBookMoves(pos) {
  if (typeof BOOK_DAT !== 'object' || BOOK_DAT.length === 0) {
    return []
  }

  let mirror = false
  let lock = pos.zobristLock >>> 1
  let index = binarySearch(BOOK_DAT, lock)

  if (index < 0) {
    mirror = true
    lock = pos.mirror().zobristLock >>> 1
    index = binarySearch(BOOK_DAT, lock)
  }

  if (index < 0) {
    return []
  }

  index--
  while (index >= 0 && BOOK_DAT[index][0] === lock) {
    index--
  }
  index++

  const moves = []
  while (index < BOOK_DAT.length && BOOK_DAT[index][0] === lock) {
    let mv = BOOK_DAT[index][1]
    mv = mirror ? MIRROR_MOVE(mv) : mv
    if (pos.legalMove(mv)) {
      moves.push({ mv, weight: BOOK_DAT[index][2] })
    }
    index++
  }

  return moves
}

function squareToEngineCoord(sq) {
  const file = String.fromCharCode(97 + (FILE_X(sq) - 3))
  const rank = String(12 - RANK_Y(sq))
  return file + rank
}

function moveToEngineCoord(mv) {
  return squareToEngineCoord(SRC(mv)) + squareToEngineCoord(DST(mv))
}
`,
    context
  )

  return context
}

const generateOpeningBook = (context) => {
  const book = new Map()
  const seen = new Set()
  const queue = [{ fen: START_FEN, history: [] }]

  while (queue.length > 0) {
    const { fen, history } = queue.shift()
    const position = vm.runInContext('new Position()', context)
    position.fromFen(fen)

    const bookMoves = context.collectBookMoves(position)
    if (bookMoves.length === 0) {
      continue
    }

    const key = history.join(',')
    if (!book.has(key)) {
      book.set(
        key,
        bookMoves.map((entry) => ({
          move: context.moveToEngineCoord(entry.mv),
          weight: entry.weight
        }))
      )
    }

    if (history.length >= MAX_PLY) {
      continue
    }

    for (const entry of bookMoves) {
      const engineMove = context.moveToEngineCoord(entry.mv)
      position.makeMove(entry.mv)
      const nextFen = position.toFen()
      position.undoMakeMove()

      const nextHistory = [...history, engineMove]
      const visitKey = `${nextFen}|${nextHistory.length}`
      if (!seen.has(visitKey)) {
        seen.add(visitKey)
        queue.push({ fen: nextFen, history: nextHistory })
      }
    }
  }

  return Object.fromEntries(book)
}

try {
  const context = loadXqwlightContext()
  const openingBook = generateOpeningBook(context)
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(openingBook))
  console.log(`Wrote ${Object.keys(openingBook).length} opening positions to ${OUTPUT_FILE}`)
} finally {
  fs.rmSync(repoDir, { recursive: true, force: true })
}
