export type XiangqiSide = 'red' | 'black'
export type XiangqiPieceType = 'general' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'soldier'

export type XiangqiPiece = {
  side: XiangqiSide
  type: XiangqiPieceType
}

export type XiangqiCell = XiangqiPiece | null
export type XiangqiBoard = XiangqiCell[][]

export type XiangqiPosition = {
  row: number
  col: number
}

export type XiangqiMove = {
  from: XiangqiPosition
  to: XiangqiPosition
  piece: XiangqiPiece
  captured: XiangqiPiece | null
  score?: number
}

export type XiangqiDifficulty = {
  id: string
  label: string
  depth: number
  note: string
  rootMoveLimit?: number
  branchLimit?: number
}

export type XiangqiSearchResult = {
  move: XiangqiMove | null
  score: number
  nodes: number
  isTimeout?: boolean
  scoreLabel?: string
  source?: 'opening_book' | 'engine' | 'fallback'
  backend?: string
  depth?: number
}

const MATE_SCORE = 100000000
const BOARD_ROWS = 10
const BOARD_COLS = 9

export const xiangqiDifficulties: XiangqiDifficulty[] = [
  { id: 'easy', label: 'Easy', depth: 2, note: 'Basic tactical awareness.', rootMoveLimit: 32, branchLimit: 32 },
  { id: 'medium', label: 'Medium', depth: 4, note: 'Solid practical play.', rootMoveLimit: 48, branchLimit: 48 },
  { id: 'hard', label: 'Hard', depth: 5, note: 'Strong tactical depth.', rootMoveLimit: 64, branchLimit: 64 }
]

const pieceCodeMap: Record<XiangqiSide, Record<XiangqiPieceType, string>> = {
  red: {
    general: '帥',
    advisor: '仕',
    elephant: '相',
    horse: '馬',
    rook: '車',
    cannon: '炮',
    soldier: '兵'
  },
  black: {
    general: '將',
    advisor: '士',
    elephant: '象',
    horse: '马',
    rook: '车',
    cannon: '砲',
    soldier: '卒'
  }
}

const initialCodes = [
  ['br', 'bh', 'be', 'ba', 'bg', 'ba', 'be', 'bh', 'br'],
  [null, null, null, null, null, null, null, null, null],
  [null, 'bc', null, null, null, null, null, 'bc', null],
  ['bs', null, 'bs', null, 'bs', null, 'bs', null, 'bs'],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  ['rs', null, 'rs', null, 'rs', null, 'rs', null, 'rs'],
  [null, 'rc', null, null, null, null, null, 'rc', null],
  [null, null, null, null, null, null, null, null, null],
  ['rr', 'rh', 're', 'ra', 'rg', 'ra', 're', 'rh', 'rr']
] as const

const decodePiece = (code: string): XiangqiPiece => {
  const side = code[0] === 'r' ? 'red' : 'black'
  const map: Record<string, XiangqiPieceType> = {
    g: 'general',
    a: 'advisor',
    e: 'elephant',
    h: 'horse',
    r: 'rook',
    c: 'cannon',
    s: 'soldier'
  }
  return { side, type: map[code[1]] }
}

export const createInitialXiangqiBoard = (): XiangqiBoard =>
  initialCodes.map((row) => row.map((code) => (code ? decodePiece(code) : null)))

export const cloneXiangqiBoard = (board: XiangqiBoard): XiangqiBoard => board.map((row) => [...row])

export const getXiangqiPieceLabel = (piece: XiangqiPiece) => pieceCodeMap[piece.side][piece.type]

export const getOppositeSide = (side: XiangqiSide): XiangqiSide => (side === 'red' ? 'black' : 'red')

// Internal representation constants
const EMPTY = 0
const R_GEN = 1, R_ADV = 2, R_ELE = 3, R_HOR = 4, R_ROO = 5, R_CAN = 6, R_SOL = 7
const B_GEN = -1, B_ADV = -2, B_ELE = -3, B_HOR = -4, B_ROO = -5, B_CAN = -6, B_SOL = -7

const TYPE_MAP: Record<XiangqiPieceType, number> = {
  general: 1, advisor: 2, elephant: 3, horse: 4, rook: 5, cannon: 6, soldier: 7
}
const REV_TYPE_MAP: Record<number, XiangqiPieceType> = {
  1: 'general', 2: 'advisor', 3: 'elephant', 4: 'horse', 5: 'rook', 6: 'cannon', 7: 'soldier'
}

const getInternalPiece = (piece: XiangqiPiece | null): number => {
  if (!piece) return EMPTY
  const val = TYPE_MAP[piece.type]
  return piece.side === 'red' ? val : -val
}

const getExternalPiece = (val: number): XiangqiPiece | null => {
  if (val === EMPTY) return null
  return {
    side: val > 0 ? 'red' : 'black',
    type: REV_TYPE_MAP[Math.abs(val)]
  }
}

type InternalBoard = Int8Array
type InternalMove = { from: number; to: number; piece: number; captured: number }

const boardToInternal = (board: XiangqiBoard): InternalBoard => {
  const internal = new Int8Array(90)
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      internal[r * 9 + c] = getInternalPiece(board[r][c])
    }
  }
  return internal
}

// Zobrist Hashing
const zobristPieces = new BigUint64Array(16 * 90) // 14 pieces + padding
const zobristSide = new BigUint64Array(1)

const initZobrist = () => {
  const view = new BigUint64Array(1)
  for (let i = 0; i < zobristPieces.length; i++) {
    crypto.getRandomValues(new Uint32Array(view.buffer))
    zobristPieces[i] = view[0]
  }
  crypto.getRandomValues(new Uint32Array(view.buffer))
  zobristSide[0] = view[0]
}
initZobrist()

const getZobristKey = (board: InternalBoard, isRed: boolean): bigint => {
  let key = isRed ? 0n : zobristSide[0]
  for (let i = 0; i < 90; i++) {
    const p = board[i]
    if (p !== EMPTY) {
      const pieceIdx = p > 0 ? p : 7 - p 
      key ^= zobristPieces[pieceIdx * 90 + i]
    }
  }
  return key
}

const updateZobristKey = (key: bigint, pos: number, piece: number): bigint => {
  if (piece === EMPTY) return key
  const pieceIdx = piece > 0 ? piece : 7 - piece
  return key ^ zobristPieces[pieceIdx * 90 + pos]
}

// Piece-Square Tables (PST) - Offensive
const soldierPST = new Int16Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  20, 40, 60, 80, 100, 80, 60, 40, 20,
  15, 30, 45, 60, 75, 60, 45, 30, 15,
  10, 20, 30, 40, 50, 40, 30, 20, 10,
  5, 10, 15, 20, 25, 20, 15, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0
])

const horsePST = new Int16Array([
  4, 8, 16, 12, 4, 12, 16, 8, 4,
  4, 15, 28, 16, 8, 16, 28, 15, 4,
  12, 14, 16, 25, 18, 25, 16, 14, 12,
  8, 24, 18, 24, 20, 24, 18, 24, 8,
  6, 16, 14, 18, 16, 18, 14, 16, 6,
  4, 12, 10, 14, 12, 14, 10, 12, 4,
  2, 8, 6, 10, 8, 10, 6, 8, 2,
  0, 4, 2, 6, 4, 6, 2, 4, 0,
  -2, 2, 0, 4, 2, 4, 0, 2, -2,
  -4, -2, 0, 0, -2, 0, 0, -2, -4
])

const getPieceValue = (p: number, pos: number, board: InternalBoard): number => {
  const type = Math.abs(p)
  const isRed = p > 0
  const r = Math.floor(pos / 9)
  const c = pos % 9
  const pstIdx = isRed ? pos : (9 - r) * 9 + c
  
  let val = 0
  switch (type) {
    case 1: val = 1000000; break
    case 2: val = 120; break
    case 3: val = 120; break
    case 4: val = 450 + horsePST[pstIdx]; break
    case 5: val = 950; break
    case 6: val = 480; break
    case 7: val = 100 + soldierPST[pstIdx]; break
  }
  return isRed ? val : -val
}

const generateInternalPseudoMoves = (board: InternalBoard, pos: number): InternalMove[] => {
  const p = board[pos]
  if (p === EMPTY) return []
  const isRed = p > 0
  const type = Math.abs(p)
  const r = Math.floor(pos / 9), c = pos % 9
  const moves: InternalMove[] = []

  const add = (tr: number, tc: number) => {
    if (tr < 0 || tr >= 10 || tc < 0 || tc >= 9) return false
    const tp = board[tr * 9 + tc]
    if (tp !== EMPTY && (tp > 0) === isRed) return false
    moves.push({ from: pos, to: tr * 9 + tc, piece: p, captured: tp })
    return tp === EMPTY
  }

  switch (type) {
    case 1: 
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const tr = r + dr, tc = c + dc
        if ((isRed ? tr >= 7 && tr <= 9 : tr >= 0 && tr <= 2) && tc >= 3 && tc <= 5) add(tr, tc)
      }
      break
    case 2:
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const tr = r + dr, tc = c + dc
        if ((isRed ? tr >= 7 && tr <= 9 : tr >= 0 && tr <= 2) && tc >= 3 && tc <= 5) add(tr, tc)
      }
      break
    case 3:
      for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
        const tr = r + dr, tc = c + dc
        if (tr < 0 || tr >= 10 || tc < 0 || tc >= 9 || (isRed ? tr < 5 : tr > 4)) continue
        if (board[(r + dr / 2) * 9 + (c + dc / 2)] === EMPTY) add(tr, tc)
      }
      break
    case 4:
      for (const [dr, dc, lr, lc] of [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]]) {
        const tr = r + dr, tc = c + dc
        if (tr >= 0 && tr < 10 && tc >= 0 && tc < 9 && board[(r + lr) * 9 + (c + lc)] === EMPTY) add(tr, tc)
      }
      break
    case 5:
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let tr = r + dr, tc = c + dc
        while (add(tr, tc)) { tr += dr; tc += dc }
      }
      break
    case 6:
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let tr = r + dr, tc = c + dc, jumped = false
        while (tr >= 0 && tr < 10 && tc >= 0 && tc < 9) {
          const tp = board[tr * 9 + tc]
          if (!jumped) { if (tp === EMPTY) moves.push({ from: pos, to: tr * 9 + tc, piece: p, captured: EMPTY }); else jumped = true }
          else if (tp !== EMPTY) { if ((tp > 0) !== isRed) moves.push({ from: pos, to: tr * 9 + tc, piece: p, captured: tp }); break }
          tr += dr; tc += dc
        }
      }
      break
    case 7:
      add(r + (isRed ? -1 : 1), c)
      if (isRed ? r <= 4 : r >= 5) { add(r, c - 1); add(r, c + 1) }
      break
  }
  return moves
}

const findInternalGeneral = (board: InternalBoard, isRed: boolean): number => {
  const target = isRed ? 1 : -1
  for (let i = 0; i < 90; i++) if (board[i] === target) return i
  return -1
}

const isInternalInCheck = (board: InternalBoard, isRed: boolean): boolean => {
  const gPos = findInternalGeneral(board, isRed)
  if (gPos === -1) return true
  const r = Math.floor(gPos / 9), c = gPos % 9
  const horseType = isRed ? B_HOR : R_HOR
  for (const [dr, dc, lr, lc] of [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]]) {
    const tr = r + dr, tc = c + dc
    if (tr >= 0 && tr < 10 && tc >= 0 && tc < 9 && board[tr * 9 + tc] === horseType) {
      if (board[(r + lr) * 9 + (c + lc)] === EMPTY) return true
    }
  }
  const rookType = isRed ? B_ROO : R_ROO
  const cannonType = isRed ? B_CAN : R_CAN
  const oppGeneralType = isRed ? B_GEN : R_GEN
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let tr = r + dr, tc = c + dc, jumped = false
    while (tr >= 0 && tr < 10 && tc >= 0 && tc < 9) {
      const tp = board[tr * 9 + tc]
      if (tp !== EMPTY) {
        if (!jumped) {
          if (tp === rookType || tp === oppGeneralType) return true
          jumped = true
        } else {
          if (tp === cannonType) return true
          break
        }
      }
      tr += dr; tc += dc
    }
  }
  const soldierType = isRed ? B_SOL : R_SOL
  const soldierMoves = isRed ? [[-1, 0], [0, -1], [0, 1]] : [[1, 0], [0, -1], [0, 1]]
  for (const [dr, dc] of soldierMoves) {
    const tr = r + dr, tc = c + dc
    if (tr >= 0 && tr < 10 && tc >= 0 && tc < 9 && board[tr * 9 + tc] === soldierType) return true
  }
  return false
}

const generateLegalInternalMoves = (board: InternalBoard, isRed: boolean): InternalMove[] => {
  const moves: InternalMove[] = []
  for (let i = 0; i < 90; i++) {
    const p = board[i]
    if (p !== EMPTY && (p > 0) === isRed) {
      for (const m of generateInternalPseudoMoves(board, i)) {
        const cap = board[m.to]
        board[m.to] = m.piece; board[m.from] = EMPTY
        if (!isInternalInCheck(board, isRed)) moves.push(m)
        board[m.from] = m.piece; board[m.to] = cap
      }
    }
  }
  return moves
}

const evaluateInternal = (board: InternalBoard, perspectiveIsRed: boolean): number => {
  let score = 0
  for (let i = 0; i < 90; i++) {
    const p = board[i]
    if (p !== EMPTY) score += getPieceValue(p, i, board)
  }
  return perspectiveIsRed ? score : -score
}

type TTEntry = { key: bigint, score: number, depth: number, flag: number, bestMove: number }
const TT_SIZE = 1 << 19
const transpositionTable = new Array<TTEntry | null>(TT_SIZE).fill(null)

const searchBestXiangqiMoveInternal = (
  board: XiangqiBoard,
  aiSide: XiangqiSide,
  difficulty: XiangqiDifficulty,
  historyKeys: bigint[] = [],
  timeLimit: number = 3000
): XiangqiSearchResult => {
  let nodes = 0
  let isAborted = false
  const startTime = Date.now()
  const isRed = aiSide === 'red'
  const ib = boardToInternal(board)
  let ck = getZobristKey(ib, isRed)
  transpositionTable.fill(null)

  const negamax = (depth: number, alpha: number, beta: number, sideRed: boolean): number => {
    nodes++
    if (nodes % 2048 === 0 && Date.now() - startTime > timeLimit) isAborted = true
    if (isAborted) return alpha
    const moves = generateLegalInternalMoves(ib, sideRed)
    if (moves.length === 0) return isInternalInCheck(ib, sideRed) ? -MATE_SCORE + (difficulty.depth - depth) : 0
    if (depth === 0) return evaluateInternal(ib, isRed)
    let bestS = -Infinity
    for (const m of moves) {
      const cap = ib[m.to]; ib[m.to] = m.piece; ib[m.from] = EMPTY
      const s = -negamax(depth - 1, -beta, -alpha, !sideRed)
      ib[m.from] = m.piece; ib[m.to] = cap
      if (isAborted) return alpha
      if (s > bestS) bestS = s
      alpha = Math.max(alpha, s)
      if (alpha >= beta) break
    }
    return bestS
  }

  let finalM: InternalMove | null = null, finalS = -Infinity
  for (let d = 1; d <= difficulty.depth; d++) {
    const root = generateLegalInternalMoves(ib, isRed)
    let bM = root[0], bS = -Infinity
    for (const m of root) {
      const cap = ib[m.to]; ib[m.to] = m.piece; ib[m.from] = EMPTY
      const s = -negamax(d - 1, -Infinity, Infinity, !isRed)
      ib[m.from] = m.piece; ib[m.to] = cap
      if (isAborted) break
      if (s > bS) { bS = s; bM = m }
    }
    if (isAborted) break
    finalM = bM; finalS = bS
  }

  return { 
    move: finalM ? { from: { row: Math.floor(finalM.from / 9), col: finalM.from % 9 }, to: { row: Math.floor(finalM.to / 9), col: finalM.to % 9 }, piece: getExternalPiece(finalM.piece)!, captured: getExternalPiece(finalM.captured) } : null, 
    score: finalS, nodes, source: 'fallback', backend: 'built-in'
  }
}

export const searchBestXiangqiMove = searchBestXiangqiMoveInternal

export const applyXiangqiMove = (board: XiangqiBoard, move: XiangqiMove): XiangqiBoard => {
  const next = cloneXiangqiBoard(board)
  next[move.to.row][move.to.col] = next[move.from.row][move.from.col]
  next[move.from.row][move.from.col] = null
  return next
}

export const isXiangqiInCheck = (board: XiangqiBoard, side: XiangqiSide): boolean => isInternalInCheck(boardToInternal(board), side === 'red')

export const generateLegalXiangqiMoves = (board: XiangqiBoard, side: XiangqiSide): XiangqiMove[] => {
  const moves = generateLegalInternalMoves(boardToInternal(board), side === 'red')
  return moves.map(m => ({ from: { row: Math.floor(m.from / 9), col: m.from % 9 }, to: { row: Math.floor(m.to / 9), col: m.to % 9 }, piece: getExternalPiece(m.piece)!, captured: getExternalPiece(m.captured) }))
}

export const isXiangqiGameOver = (board: XiangqiBoard): boolean => {
  const ib = boardToInternal(board)
  return findInternalGeneral(ib, true) === -1 || findInternalGeneral(ib, false) === -1
}

export const calculateXiangqiHistoryKeys = (initialBoard: XiangqiBoard, moves: XiangqiMove[]): bigint[] => {
  const keys: bigint[] = []
  let ib = boardToInternal(initialBoard)
  let isRed = true 
  let ck = getZobristKey(ib, isRed)
  keys.push(ck)
  for (const m of moves) {
    const fromIdx = m.from.row * 9 + m.from.col, toIdx = m.to.row * 9 + m.to.col
    const p = getInternalPiece(m.piece), cap = getInternalPiece(m.captured)
    ib[toIdx] = p; ib[fromIdx] = EMPTY
    ck ^= zobristSide[0]
    ck = updateZobristKey(ck, fromIdx, p); ck = updateZobristKey(ck, toIdx, p); ck = updateZobristKey(ck, toIdx, cap)
    keys.push(ck); isRed = !isRed
  }
  return keys
}

export const boardToFen = (board: XiangqiBoard, activeSide: XiangqiSide): string => {
  let fen = ''
  for (let r = 0; r < 10; r++) {
    let empty = 0
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c]
      if (!piece) empty++
      else {
        if (empty > 0) { fen += empty; empty = 0 }
        const typeMap: any = { horse: 'n', advisor: 'a', elephant: 'b', general: 'k', rook: 'r', cannon: 'c', soldier: 'p' }
        const char = typeMap[piece.type] || '?'
        fen += piece.side === 'red' ? char.toUpperCase() : char
      }
    }
    if (empty > 0) fen += empty
    if (r < 9) fen += '/'
  }
  fen += ` ${activeSide === 'red' ? 'w' : 'b'} - - 0 1`
  return fen
}

export const moveToUci = (move: XiangqiMove): string => {
  const f = String.fromCharCode(97 + move.from.col)
  const r = 9 - move.from.row
  const tf = String.fromCharCode(97 + move.to.col)
  const tr = 9 - move.to.row
  return `${f}${r}${tf}${tr}`
}

export const uciToMove = (board: XiangqiBoard, uci: string, aiSide?: XiangqiSide): XiangqiMove | null => {
  const match = uci.match(/^([a-i])(\d+)([a-i])(\d+)$/)
  if (!match) return null
  
  const fromCol = match[1].charCodeAt(0) - 97
  const fromRank = parseInt(match[2])
  const toCol = match[3].charCodeAt(0) - 97
  const toRank = parseInt(match[4])
  
  // Standard Fairy-Stockfish xiangqi variant mapping:
  // a0 is bottom-left (from red's perspective).
  // In our board array: row 0 is top (black side), row 9 is bottom (red side).
  // So rank 0 is row 9, rank 9 is row 0.
  const fromRow = 9 - fromRank
  const toRow = 9 - toRank
  
  if (fromRow < 0 || fromRow >= 10 || fromCol < 0 || fromCol >= 9) return null
  if (toRow < 0 || toRow >= 10 || toCol < 0 || toCol >= 9) return null

  const piece = board[fromRow][fromCol]
  
  if (!piece) return null
  if (aiSide && piece.side !== aiSide) return null
  
  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    piece,
    captured: board[toRow][toCol] || null
  }
}
