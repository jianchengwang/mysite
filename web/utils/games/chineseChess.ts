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
  { id: 'easy', label: 'Easy', depth: 1, note: '适合练习规则和常见吃子。' },
  { id: 'medium', label: 'Medium', depth: 2, note: '会明显更在意将帅安全和大子交换。' },
  { id: 'hard', label: 'Hard', depth: 3, note: '会持续看几步后的捉子与牵制。' }
]

const pieceValue: Record<XiangqiPieceType, number> = {
  general: 100000,
  advisor: 110,
  elephant: 110,
  horse: 320,
  rook: 620,
  cannon: 340,
  soldier: 120
}

const pieceCodeMap: Record<XiangqiSide, Record<XiangqiPieceType, string>> = {
  red: {
    general: '帅',
    advisor: '仕',
    elephant: '相',
    horse: '马',
    rook: '车',
    cannon: '炮',
    soldier: '兵'
  },
  black: {
    general: '将',
    advisor: '士',
    elephant: '象',
    horse: '马',
    rook: '车',
    cannon: '炮',
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

const inBounds = (row: number, col: number) => row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS

const inPalace = (side: XiangqiSide, row: number, col: number) => {
  const validRow = side === 'red' ? row >= 7 && row <= 9 : row >= 0 && row <= 2
  return validRow && col >= 3 && col <= 5
}

const hasCrossedRiver = (side: XiangqiSide, row: number) => (side === 'red' ? row <= 4 : row >= 5)

const findGeneral = (board: XiangqiBoard, side: XiangqiSide): XiangqiPosition | null => {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col]
      if (piece?.side === side && piece.type === 'general') {
        return { row, col }
      }
    }
  }
  return null
}

const generalsFacing = (board: XiangqiBoard) => {
  const red = findGeneral(board, 'red')
  const black = findGeneral(board, 'black')
  if (!red || !black || red.col !== black.col) return false

  const start = Math.min(red.row, black.row) + 1
  const end = Math.max(red.row, black.row)
  for (let row = start; row < end; row++) {
    if (board[row][red.col]) {
      return false
    }
  }

  return true
}

const addMoveIfValid = (
  moves: XiangqiMove[],
  board: XiangqiBoard,
  piece: XiangqiPiece,
  from: XiangqiPosition,
  row: number,
  col: number
) => {
  if (!inBounds(row, col)) return
  const target = board[row][col]
  if (target && target.side === piece.side) return
  moves.push({
    from,
    to: { row, col },
    piece,
    captured: target ?? null
  })
}

const generatePseudoMoves = (board: XiangqiBoard, row: number, col: number): XiangqiMove[] => {
  const piece = board[row][col]
  if (!piece) return []

  const from = { row, col }
  const moves: XiangqiMove[] = []

  switch (piece.type) {
    case 'general': {
      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]
      for (const [dr, dc] of directions) {
        const nextRow = row + dr
        const nextCol = col + dc
        if (inPalace(piece.side, nextRow, nextCol)) {
          addMoveIfValid(moves, board, piece, from, nextRow, nextCol)
        }
      }

      const enemy = getOppositeSide(piece.side)
      const enemyGeneral = findGeneral(board, enemy)
      if (enemyGeneral && enemyGeneral.col === col) {
        const minRow = Math.min(row, enemyGeneral.row) + 1
        const maxRow = Math.max(row, enemyGeneral.row)
        let blocked = false
        for (let scan = minRow; scan < maxRow; scan++) {
          if (board[scan][col]) {
            blocked = true
            break
          }
        }
        if (!blocked) {
          moves.push({
            from,
            to: enemyGeneral,
            piece,
            captured: board[enemyGeneral.row][enemyGeneral.col]
          })
        }
      }
      break
    }
    case 'advisor': {
      for (const [dr, dc] of [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ]) {
        const nextRow = row + dr
        const nextCol = col + dc
        if (inPalace(piece.side, nextRow, nextCol)) {
          addMoveIfValid(moves, board, piece, from, nextRow, nextCol)
        }
      }
      break
    }
    case 'elephant': {
      for (const [dr, dc] of [
        [-2, -2],
        [-2, 2],
        [2, -2],
        [2, 2]
      ]) {
        const nextRow = row + dr
        const nextCol = col + dc
        const eyeRow = row + dr / 2
        const eyeCol = col + dc / 2
        if (!inBounds(nextRow, nextCol) || board[eyeRow][eyeCol]) continue
        if (piece.side === 'red' && nextRow < 5) continue
        if (piece.side === 'black' && nextRow > 4) continue
        addMoveIfValid(moves, board, piece, from, nextRow, nextCol)
      }
      break
    }
    case 'horse': {
      const horseMoves = [
        { leg: [-1, 0], step: [-2, -1] },
        { leg: [-1, 0], step: [-2, 1] },
        { leg: [1, 0], step: [2, -1] },
        { leg: [1, 0], step: [2, 1] },
        { leg: [0, -1], step: [-1, -2] },
        { leg: [0, -1], step: [1, -2] },
        { leg: [0, 1], step: [-1, 2] },
        { leg: [0, 1], step: [1, 2] }
      ] as const

      for (const option of horseMoves) {
        const legRow = row + option.leg[0]
        const legCol = col + option.leg[1]
        const nextRow = row + option.step[0]
        const nextCol = col + option.step[1]
        if (!inBounds(nextRow, nextCol) || board[legRow][legCol]) continue
        addMoveIfValid(moves, board, piece, from, nextRow, nextCol)
      }
      break
    }
    case 'rook': {
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]) {
        let nextRow = row + dr
        let nextCol = col + dc
        while (inBounds(nextRow, nextCol)) {
          const target = board[nextRow][nextCol]
          if (!target) {
            moves.push({ from, to: { row: nextRow, col: nextCol }, piece, captured: null })
          } else {
            if (target.side !== piece.side) {
              moves.push({ from, to: { row: nextRow, col: nextCol }, piece, captured: target })
            }
            break
          }
          nextRow += dr
          nextCol += dc
        }
      }
      break
    }
    case 'cannon': {
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]) {
        let nextRow = row + dr
        let nextCol = col + dc
        let jumped = false
        while (inBounds(nextRow, nextCol)) {
          const target = board[nextRow][nextCol]
          if (!jumped) {
            if (!target) {
              moves.push({ from, to: { row: nextRow, col: nextCol }, piece, captured: null })
            } else {
              jumped = true
            }
          } else if (target) {
            if (target.side !== piece.side) {
              moves.push({ from, to: { row: nextRow, col: nextCol }, piece, captured: target })
            }
            break
          }
          nextRow += dr
          nextCol += dc
        }
      }
      break
    }
    case 'soldier': {
      const forward = piece.side === 'red' ? -1 : 1
      addMoveIfValid(moves, board, piece, from, row + forward, col)
      if (hasCrossedRiver(piece.side, row)) {
        addMoveIfValid(moves, board, piece, from, row, col - 1)
        addMoveIfValid(moves, board, piece, from, row, col + 1)
      }
      break
    }
  }

  return moves
}

export const applyXiangqiMove = (board: XiangqiBoard, move: XiangqiMove): XiangqiBoard => {
  const next = cloneXiangqiBoard(board)
  next[move.to.row][move.to.col] = next[move.from.row][move.from.col]
  next[move.from.row][move.from.col] = null
  return next
}

export const isXiangqiInCheck = (board: XiangqiBoard, side: XiangqiSide) => {
  const general = findGeneral(board, side)
  if (!general) return true
  if (generalsFacing(board)) return true

  const enemy = getOppositeSide(side)
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col]
      if (!piece || piece.side !== enemy) continue
      const pseudoMoves = generatePseudoMoves(board, row, col)
      if (pseudoMoves.some((move) => move.to.row === general.row && move.to.col === general.col)) {
        return true
      }
    }
  }

  return false
}

export const generateLegalXiangqiMoves = (board: XiangqiBoard, side: XiangqiSide): XiangqiMove[] => {
  const legalMoves: XiangqiMove[] = []

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col]
      if (!piece || piece.side !== side) continue
      const pseudoMoves = generatePseudoMoves(board, row, col)
      for (const move of pseudoMoves) {
        const nextBoard = applyXiangqiMove(board, move)
        if (!isXiangqiInCheck(nextBoard, side)) {
          legalMoves.push(move)
        }
      }
    }
  }

  return legalMoves
}

const getMobility = (board: XiangqiBoard, row: number, col: number) => {
  const piece = board[row][col]
  if (!piece) return 0
  return generatePseudoMoves(board, row, col).length
}

const getPiecePositionalValue = (piece: XiangqiPiece, row: number, col: number) => {
  const mirroredRow = piece.side === 'red' ? 9 - row : row

  switch (piece.type) {
    case 'soldier': {
      const advance = piece.side === 'red' ? 6 - row : row - 3
      return hasCrossedRiver(piece.side, row) ? 40 + Math.max(0, advance) * 8 : Math.max(0, advance) * 4
    }
    case 'horse':
      return (4 - Math.abs(4 - col)) * 8 + (4 - Math.abs(4 - mirroredRow)) * 6
    case 'cannon':
      return (4 - Math.abs(4 - col)) * 6 + (4 - Math.abs(4 - mirroredRow)) * 4
    case 'rook':
      return getMobilityBonus(col, mirroredRow)
    case 'advisor':
    case 'elephant':
      return 8
    case 'general':
      return inPalace(piece.side, row, col) ? 12 : 0
  }
}

const getMobilityBonus = (col: number, row: number) => {
  return (4 - Math.abs(4 - col)) * 4 + (4 - Math.abs(4 - row)) * 3
}

export const evaluateXiangqiBoard = (board: XiangqiBoard, perspective: XiangqiSide) => {
  let score = 0

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col]
      if (!piece) continue

      const sign = piece.side === perspective ? 1 : -1
      const base = pieceValue[piece.type]
      const positional = getPiecePositionalValue(piece, row, col)
      const mobility = getMobility(board, row, col) * (piece.type === 'rook' ? 4 : piece.type === 'horse' ? 3 : 2)
      score += sign * (base + positional + mobility)
    }
  }

  if (isXiangqiInCheck(board, getOppositeSide(perspective))) {
    score += 90
  }
  if (isXiangqiInCheck(board, perspective)) {
    score -= 90
  }

  return score
}

const moveOrderingScore = (move: XiangqiMove) => {
  const captureScore = move.captured ? pieceValue[move.captured.type] : 0
  const moverPenalty = pieceValue[move.piece.type] * 0.08
  const advanceBonus =
    move.piece.type === 'soldier'
      ? move.piece.side === 'red'
        ? move.from.row - move.to.row
        : move.to.row - move.from.row
      : 0

  return captureScore - moverPenalty + advanceBonus * 10
}

const boardKey = (board: XiangqiBoard, side: XiangqiSide, depth: number) =>
  `${side}:${depth}:${board
    .map((row) =>
      row
        .map((cell) => {
          if (!cell) return '__'
          return `${cell.side[0]}${cell.type[0]}`
        })
        .join('')
    )
    .join('|')}`

export const isXiangqiGameOver = (board: XiangqiBoard) => !findGeneral(board, 'red') || !findGeneral(board, 'black')

export const searchBestXiangqiMove = (
  board: XiangqiBoard,
  aiSide: XiangqiSide,
  difficulty: XiangqiDifficulty
): XiangqiSearchResult => {
  const cache = new Map<string, number>()
  let nodes = 0

  const negamax = (
    currentBoard: XiangqiBoard,
    currentSide: XiangqiSide,
    depth: number,
    alpha: number,
    beta: number
  ): number => {
    nodes++

    const enemy = getOppositeSide(currentSide)
    const currentGeneral = findGeneral(currentBoard, currentSide)
    const enemyGeneral = findGeneral(currentBoard, enemy)

    if (!currentGeneral) {
      return currentSide === aiSide ? -MATE_SCORE - depth : MATE_SCORE + depth
    }
    if (!enemyGeneral) {
      return enemy === aiSide ? -MATE_SCORE - depth : MATE_SCORE + depth
    }

    const legalMoves = generateLegalXiangqiMoves(currentBoard, currentSide)
    if (!legalMoves.length) {
      return currentSide === aiSide ? -MATE_SCORE - depth : MATE_SCORE + depth
    }

    if (depth === 0) {
      return evaluateXiangqiBoard(currentBoard, aiSide)
    }

    const key = boardKey(currentBoard, currentSide, depth)
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    let best = -Infinity
    const orderedMoves = legalMoves.sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a))

    for (const move of orderedMoves) {
      const nextBoard = applyXiangqiMove(currentBoard, move)
      const score = -negamax(nextBoard, enemy, depth - 1, -beta, -alpha)
      if (score > best) best = score
      if (score > alpha) alpha = score
      if (alpha >= beta) break
    }

    cache.set(key, best)
    return best
  }

  const rootMoves = generateLegalXiangqiMoves(board, aiSide).sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a))
  if (!rootMoves.length) {
    return { move: null, score: 0, nodes }
  }

  let bestMove = rootMoves[0]
  let bestScore = -Infinity

  for (const move of rootMoves) {
    const nextBoard = applyXiangqiMove(board, move)
    const score = -negamax(nextBoard, getOppositeSide(aiSide), difficulty.depth, -Infinity, Infinity)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return {
    move: bestMove,
    score: bestScore,
    nodes
  }
}
