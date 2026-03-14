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
}

const MATE_SCORE = 100000000
const BOARD_ROWS = 10
const BOARD_COLS = 9

export const xiangqiDifficulties: XiangqiDifficulty[] = [
  { id: 'easy', label: 'Easy', depth: 2, note: 'Fast replies for learning movement rules and common captures.', rootMoveLimit: 32, branchLimit: 32 },
  { id: 'medium', label: 'Medium', depth: 5, note: 'Looks deeper for practical tactics while keeping reply times reasonable.', rootMoveLimit: 32, branchLimit: 32 },
  { id: 'hard', label: 'Hard', depth: 7, note: 'Stronger tactical reading with aspiration windows and PVS.', rootMoveLimit: 64, branchLimit: 64 }
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
    horse: '馬',
    rook: '車',
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
      const pieceIdx = p > 0 ? p : 7 - p // 1-7 for red, 8-14 for black
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

// Piece-Square Tables (PST)
const soldierPST = new Int16Array([
  0, 3, 6, 9, 12, 9, 6, 3, 0,
  18, 36, 56, 80, 120, 80, 56, 36, 18,
  14, 26, 42, 60, 80, 60, 42, 26, 14,
  10, 20, 30, 34, 40, 34, 30, 20, 10,
  6, 12, 18, 18, 20, 18, 18, 12, 6,
  2, 0, 8, 0, 8, 0, 8, 0, 2,
  0, 0, -2, 0, 4, 0, -2, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0
])

const horsePST = new Int16Array([
  4, 8, 16, 12, 4, 12, 16, 8, 4,
  4, 10, 28, 16, 8, 16, 28, 10, 4,
  12, 14, 16, 20, 18, 20, 16, 14, 12,
  8, 24, 18, 24, 20, 24, 18, 24, 8,
  6, 16, 14, 18, 16, 18, 14, 16, 6,
  4, 12, 10, 14, 12, 14, 10, 12, 4,
  2, 8, 6, 10, 8, 10, 6, 8, 2,
  0, 4, 2, 6, 4, 6, 2, 4, 0,
  -2, 2, 0, 4, 2, 4, 0, 2, -2,
  -4, -2, 0, 0, -2, 0, 0, -2, -4
])

const cannonPST = new Int16Array([
  6, 4, 0, -10, -12, -10, 0, 4, 6,
  2, 2, 0, -4, -4, -4, 0, 2, 2,
  4, 0, 0, 0, 0, 0, 0, 0, 4,
  2, 2, 0, 2, 4, 2, 0, 2, 2,
  0, 0, 0, 2, 4, 2, 0, 0, 0,
  1, 2, 2, 2, 2, 2, 2, 2, 1,
  0, 0, 1, 2, 2, 2, 1, 0, 0,
  -2, 0, 4, 0, 0, 0, 4, 0, -2,
  -3, 2, 0, 0, 0, 0, 0, 2, -3,
  -4, -2, -2, -2, -2, -2, -2, -2, -4
])

const rookPST = new Int16Array([
  14, 14, 12, 18, 16, 18, 12, 14, 14,
  16, 20, 18, 24, 26, 24, 18, 20, 16,
  12, 12, 12, 18, 18, 18, 12, 12, 12,
  12, 18, 16, 22, 22, 22, 16, 18, 12,
  12, 14, 12, 18, 18, 18, 12, 14, 12,
  12, 16, 14, 20, 20, 20, 14, 16, 12,
  6, 10, 8, 14, 14, 14, 8, 10, 6,
  10, 8, 12, 16, 16, 16, 12, 8, 10,
  8, 6, 10, 12, 18, 12, 10, 6, 8,
  10, 8, 12, 14, 12, 14, 12, 8, 10
])

const getPieceValue = (p: number, pos: number): number => {
  const type = Math.abs(p)
  const isRed = p > 0
  const r = Math.floor(pos / 9)
  const c = pos % 9
  const pstIdx = isRed ? pos : (9 - r) * 9 + c
  
  let val = 0
  switch (type) {
    case 1: val = 1000000; break
    case 2: val = 120 + 10; break
    case 3: val = 120 + 10; break
    case 4: val = 450 + horsePST[pstIdx]; break
    case 5: val = 950 + rookPST[pstIdx]; break
    case 6: val = 480 + cannonPST[pstIdx]; break
    case 7: val = 100 + soldierPST[pstIdx]; break
  }
  return isRed ? val : -val
}

const generateInternalPseudoMoves = (board: InternalBoard, pos: number): InternalMove[] => {
  const p = board[pos]
  if (p === EMPTY) return []
  const isRed = p > 0
  const type = Math.abs(p)
  const r = Math.floor(pos / 9)
  const c = pos % 9
  const moves: InternalMove[] = []

  const add = (tr: number, tc: number) => {
    if (tr < 0 || tr >= 10 || tc < 0 || tc >= 9) return false
    const tp = board[tr * 9 + tc]
    if (tp !== EMPTY && (tp > 0) === isRed) return false
    moves.push({ from: pos, to: tr * 9 + tc, piece: p, captured: tp })
    return tp === EMPTY
  }

  switch (type) {
    case 1: {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const tr = r + dr, tc = c + dc
        if ((isRed ? tr >= 7 && tr <= 9 : tr >= 0 && tr <= 2) && tc >= 3 && tc <= 5) add(tr, tc)
      }
      let step = isRed ? -1 : 1
      for (let tr = r + step; tr >= 0 && tr < 10; tr += step) {
        const tp = board[tr * 9 + c]
        if (tp !== EMPTY) {
          if (Math.abs(tp) === 1) moves.push({ from: pos, to: tr * 9 + c, piece: p, captured: tp })
          break
        }
      }
      break
    }
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
  const oppRed = !isRed
  for (let i = 0; i < 90; i++) {
    const p = board[i]
    if (p !== EMPTY && (p > 0) === oppRed) {
      const pseudos = generateInternalPseudoMoves(board, i)
      for (const m of pseudos) if (m.to === gPos) return true
    }
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
    if (p !== EMPTY) score += getPieceValue(p, i)
  }
  return perspectiveIsRed ? score : -score
}

type TTEntry = { key: bigint, score: number, depth: number, flag: number, bestMove: number }
const TT_SIZE = 1 << 19
const transpositionTable = new Array<TTEntry | null>(TT_SIZE).fill(null)
const killerMoves = new Int32Array(100 * 2)
const historyTable = new Int32Array(90 * 90)

const setTT = (key: bigint, score: number, depth: number, flag: number, bestMove: number) => {
  transpositionTable[Number(key & BigInt(TT_SIZE - 1))] = { key, score, depth, flag, bestMove }
}

const moveOrderingScore = (m: InternalMove, ttMove: number, depth: number): number => {
  const mv = (m.from << 8) | m.to
  if (mv === ttMove) return 20000000
  if (m.captured !== EMPTY) return 1000000 + (Math.abs(m.captured) * 100) - Math.abs(m.piece)
  if (killerMoves[depth * 2] === mv) return 900000
  if (killerMoves[depth * 2 + 1] === mv) return 800000
  return historyTable[m.from * 90 + m.to]
}

export const searchBestXiangqiMove = (board: XiangqiBoard, aiSide: XiangqiSide, difficulty: XiangqiDifficulty): XiangqiSearchResult => {
  let nodes = 0
  const isRed = aiSide === 'red'
  const ib = boardToInternal(board)
  let ck = getZobristKey(ib, isRed)
  killerMoves.fill(0); historyTable.fill(0); transpositionTable.fill(null)

  const quiesce = (alpha: number, beta: number, sideRed: boolean): number => {
    nodes++
    const standPat = evaluateInternal(ib, isRed)
    if (standPat >= beta) return beta
    if (alpha < standPat) alpha = standPat
    const caps = generateLegalInternalMoves(ib, sideRed).filter(m => m.captured !== EMPTY).sort((a, b) => moveOrderingScore(b, 0, 0) - moveOrderingScore(a, 0, 0))
    for (const m of caps) {
      const cap = ib[m.to]; ib[m.to] = m.piece; ib[m.from] = EMPTY
      const s = -quiesce(-beta, -alpha, !sideRed)
      ib[m.from] = m.piece; ib[m.to] = cap
      if (s >= beta) return beta
      if (s > alpha) alpha = s
    }
    return alpha
  }

  const negamax = (depth: number, alpha: number, beta: number, sideRed: boolean): number => {
    nodes++
    const tt = transpositionTable[Number(ck & BigInt(TT_SIZE - 1))]
    if (tt && tt.key === ck && tt.depth >= depth) {
      if (tt.flag === 0) return tt.score
      if (tt.flag === 1) alpha = Math.max(alpha, tt.score)
      else if (tt.flag === 2) beta = Math.min(beta, tt.score)
      if (alpha >= beta) return tt.score
    }
    if (depth === 0) return quiesce(alpha, beta, sideRed)
    const moves = generateLegalInternalMoves(ib, sideRed)
    if (moves.length === 0) return isInternalInCheck(ib, sideRed) ? -MATE_SCORE + (difficulty.depth - depth) : 0
    moves.sort((a, b) => moveOrderingScore(b, tt?.key === ck ? tt.bestMove : 0, depth) - moveOrderingScore(a, tt?.key === ck ? tt.bestMove : 0, depth))
    let bestS = -Infinity, bestM = 0, alphaOrig = alpha
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i], cap = ib[m.to]
      ib[m.to] = m.piece; ib[m.from] = EMPTY; ck ^= zobristSide[0]
      ck = updateZobristKey(ck, m.from, m.piece); ck = updateZobristKey(ck, m.to, m.piece); ck = updateZobristKey(ck, m.to, cap)
      let s
      if (i === 0) s = -negamax(depth - 1, -beta, -alpha, !sideRed)
      else { s = -negamax(depth - 1, -alpha - 1, -alpha, !sideRed); if (s > alpha && s < beta) s = -negamax(depth - 1, -beta, -alpha, !sideRed) }
      ib[m.from] = m.piece; ib[m.to] = cap; ck ^= zobristSide[0]
      ck = updateZobristKey(ck, m.from, m.piece); ck = updateZobristKey(ck, m.to, m.piece); ck = updateZobristKey(ck, m.to, cap)
      if (s > bestS) { bestS = s; bestM = (m.from << 8) | m.to }
      alpha = Math.max(alpha, s)
      if (alpha >= beta) { if (cap === EMPTY) { killerMoves[depth * 2 + 1] = killerMoves[depth * 2]; killerMoves[depth * 2] = (m.from << 8) | m.to; historyTable[m.from * 90 + m.to] += depth * depth }; break }
    }
    setTT(ck, bestS, depth, bestS <= alphaOrig ? 2 : bestS >= beta ? 1 : 0, bestM)
    return bestS
  }

  let finalM: InternalMove | null = null, finalS = -Infinity
  for (let d = 1; d <= difficulty.depth; d++) {
    let alpha = -Infinity, beta = Infinity
    if (d > 2) { alpha = finalS - 50; beta = finalS + 50 }
    while (true) {
      const tt = transpositionTable[Number(ck & BigInt(TT_SIZE - 1))]
      const root = generateLegalInternalMoves(ib, isRed).sort((a, b) => moveOrderingScore(b, tt?.key === ck ? tt.bestMove : 0, d) - moveOrderingScore(a, tt?.key === ck ? tt.bestMove : 0, d))
      let bM = root[0], bS = -Infinity
      for (const m of root) {
        const cap = ib[m.to]; ib[m.to] = m.piece; ib[m.from] = EMPTY; ck ^= zobristSide[0]
        ck = updateZobristKey(ck, m.from, m.piece); ck = updateZobristKey(ck, m.to, m.piece); ck = updateZobristKey(ck, m.to, cap)
        const s = -negamax(d - 1, -beta, -alpha, !isRed)
        ib[m.from] = m.piece; ib[m.to] = cap; ck ^= zobristSide[0]
        ck = updateZobristKey(ck, m.from, m.piece); ck = updateZobristKey(ck, m.to, m.piece); ck = updateZobristKey(ck, m.to, cap)
        if (s > bS) { bS = s; bM = m }
      }
      if (bS <= alpha || bS >= beta) { alpha = -Infinity; beta = Infinity; continue }
      finalM = bM; finalS = bS; break
    }
    if (Math.abs(finalS) > MATE_SCORE / 2) break
  }
  return { move: finalM ? { from: { row: Math.floor(finalM.from / 9), col: finalM.from % 9 }, to: { row: Math.floor(finalM.to / 9), col: finalM.to % 9 }, piece: getExternalPiece(finalM.piece)!, captured: getExternalPiece(finalM.captured) } : null, score: finalS, nodes }
}

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
