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
  { id: 'medium', label: 'Medium', depth: 4, note: 'Looks deeper for practical tactics while keeping reply times reasonable in the browser worker.', rootMoveLimit: 24, branchLimit: 18 },
  { id: 'hard', label: 'Hard', depth: 4, note: 'Keeps more tactical branches alive so the AI can press initiative and defend cleaner.', rootMoveLimit: 30, branchLimit: 22 }
]

const pieceValue: Record<XiangqiPieceType, number> = {
  general: 1000000,
  advisor: 120,
  elephant: 120,
  horse: 450,
  rook: 950,
  cannon: 480,
  soldier: 100
}

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

// Piece-Square Tables (PST) for positional evaluation
// Values are from the perspective of Red (bottom-up)
const soldierPST = [
  [0, 3, 6, 9, 12, 9, 6, 3, 0],
  [18, 36, 56, 80, 120, 80, 56, 36, 18],
  [14, 26, 42, 60, 80, 60, 42, 26, 14],
  [10, 20, 30, 34, 40, 34, 30, 20, 10],
  [6, 12, 18, 18, 20, 18, 18, 12, 6],
  [2, 0, 8, 0, 8, 0, 8, 0, 2],
  [0, 0, -2, 0, 4, 0, -2, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0]
]

const horsePST = [
  [4, 8, 16, 12, 4, 12, 16, 8, 4],
  [4, 10, 28, 16, 8, 16, 28, 10, 4],
  [12, 14, 16, 20, 18, 20, 16, 14, 12],
  [8, 24, 18, 24, 20, 24, 18, 24, 8],
  [6, 16, 14, 18, 16, 18, 14, 16, 6],
  [4, 12, 10, 14, 12, 14, 10, 12, 4],
  [2, 8, 6, 10, 8, 10, 6, 8, 2],
  [0, 4, 2, 6, 4, 6, 2, 4, 0],
  [-2, 2, 0, 4, 2, 4, 0, 2, -2],
  [-4, -2, 0, 0, -2, 0, 0, -2, -4]
]

const cannonPST = [
  [6, 4, 0, -10, -12, -10, 0, 4, 6],
  [2, 2, 0, -4, -4, -4, 0, 2, 2],
  [4, 0, 0, 0, 0, 0, 0, 0, 4],
  [2, 2, 0, 2, 4, 2, 0, 2, 2],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [1, 2, 2, 2, 2, 2, 2, 2, 1],
  [0, 0, 1, 2, 2, 2, 1, 0, 0],
  [-2, 0, 4, 0, 0, 0, 4, 0, -2],
  [-3, 2, 0, 0, 0, 0, 0, 2, -3],
  [-4, -2, -2, -2, -2, -2, -2, -2, -4]
]

const rookPST = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14],
  [16, 20, 18, 24, 26, 24, 18, 20, 16],
  [12, 12, 12, 18, 18, 18, 12, 12, 12],
  [12, 18, 16, 22, 22, 22, 16, 18, 12],
  [12, 14, 12, 18, 18, 18, 12, 14, 12],
  [12, 16, 14, 20, 20, 20, 14, 16, 12],
  [6, 10, 8, 14, 14, 14, 8, 10, 6],
  [10, 8, 12, 16, 16, 16, 12, 8, 10],
  [8, 6, 10, 12, 18, 12, 10, 6, 8],
  [10, 8, 12, 14, 12, 14, 12, 8, 10]
]

const getPiecePositionalValue = (piece: XiangqiPiece, row: number, col: number) => {
  const pstRow = piece.side === 'red' ? row : 9 - row
  const pstCol = col

  switch (piece.type) {
    case 'soldier':
      return soldierPST[pstRow][pstCol]
    case 'horse':
      return horsePST[pstRow][pstCol]
    case 'cannon':
      return cannonPST[pstRow][pstCol]
    case 'rook':
      return rookPST[pstRow][pstCol]
    case 'advisor':
    case 'elephant':
      return 10
    case 'general':
      return 0
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
      const mobility = getMobility(board, row, col) * (
        piece.type === 'rook'
          ? 2
          : piece.type === 'horse' || piece.type === 'cannon'
            ? 1
            : 0
      )
      score += sign * (base + positional + mobility)
    }
  }

  if (isXiangqiInCheck(board, getOppositeSide(perspective))) {
    score += 160
  }
  if (isXiangqiInCheck(board, perspective)) {
    score -= 220
  }

  return score
}

const moveOrderingScore = (board: XiangqiBoard, move: XiangqiMove) => {
  if (move.captured?.type === 'general') return MATE_SCORE

  const captureScore = move.captured ? pieceValue[move.captured.type] * 1.4 : 0
  const moverPenalty = pieceValue[move.piece.type] * 0.05
  const advanceBonus =
    move.piece.type === 'soldier'
      ? move.piece.side === 'red'
        ? move.from.row - move.to.row
        : move.to.row - move.from.row
      : 0
  const centerBonus =
    move.piece.type === 'horse' || move.piece.type === 'cannon' || move.piece.type === 'rook'
      ? (4 - Math.abs(4 - move.to.col)) * 6
      : 0
  const nextBoard = applyXiangqiMove(board, move)
  const checkBonus = isXiangqiInCheck(nextBoard, getOppositeSide(move.piece.side)) ? 180 : 0

  return captureScore + checkBonus + centerBonus + advanceBonus * 12 - moverPenalty
}

const isWinningXiangqiMove = (board: XiangqiBoard, move: XiangqiMove) => {
  if (move.captured?.type === 'general') return true

  const nextBoard = applyXiangqiMove(board, move)
  const enemy = getOppositeSide(move.piece.side)
  const enemyGeneral = findGeneral(nextBoard, enemy)
  if (!enemyGeneral) return true

  const enemyReplies = generateLegalXiangqiMoves(nextBoard, enemy)
  return enemyReplies.length === 0 && isXiangqiInCheck(nextBoard, enemy)
}

const getImmediateWinningXiangqiMoves = (board: XiangqiBoard, side: XiangqiSide) =>
  generateLegalXiangqiMoves(board, side).filter((move) => isWinningXiangqiMove(board, move))

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

    if (legalMoves.some((move) => move.captured?.type === 'general')) {
      return currentSide === aiSide ? MATE_SCORE + depth : -MATE_SCORE - depth
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
    let searchedAllMoves = true
    const orderedMoves = legalMoves
      .sort((a, b) => moveOrderingScore(currentBoard, b) - moveOrderingScore(currentBoard, a))
      .slice(0, depth > 1 ? difficulty.branchLimit ?? legalMoves.length : legalMoves.length)

    for (const move of orderedMoves) {
      const nextBoard = applyXiangqiMove(currentBoard, move)
      const score = -negamax(nextBoard, enemy, depth - 1, -beta, -alpha)
      if (score > best) best = score
      if (score > alpha) alpha = score
      if (alpha >= beta) {
        searchedAllMoves = false
        break
      }
    }

    if (searchedAllMoves) {
      cache.set(key, best)
    }
    return best
  }

  const immediateWins = getImmediateWinningXiangqiMoves(board, aiSide)
    .sort((a, b) => moveOrderingScore(board, b) - moveOrderingScore(board, a))
  if (immediateWins.length) {
    return {
      move: immediateWins[0],
      score: MATE_SCORE,
      nodes
    }
  }

  const legalRootMoves = generateLegalXiangqiMoves(board, aiSide)
  const opponent = getOppositeSide(aiSide)
  const opponentWinningMoves = getImmediateWinningXiangqiMoves(board, opponent)
  const urgentDefensiveMoves =
    opponentWinningMoves.length > 0
      ? legalRootMoves.filter((move) => getImmediateWinningXiangqiMoves(applyXiangqiMove(board, move), opponent).length === 0)
      : []

  const rootMoves = (urgentDefensiveMoves.length ? urgentDefensiveMoves : legalRootMoves)
    .sort((a, b) => moveOrderingScore(board, b) - moveOrderingScore(board, a))
    .slice(0, difficulty.rootMoveLimit ?? Number.POSITIVE_INFINITY)
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
