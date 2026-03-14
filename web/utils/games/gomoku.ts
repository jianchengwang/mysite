export const GOMOKU_SIZE = 15

export type GomokuCell = 0 | 1 | 2
export type GomokuColor = 1 | 2
export type GomokuBoard = GomokuCell[][]

export type GomokuMove = {
  row: number
  col: number
  color: GomokuColor
  score?: number
}

export type GomokuDifficulty = {
  id: string
  label: string
  depth: number
  width: number
  note: string
}

export type GomokuSearchResult = {
  move: GomokuMove | null
  score: number
  nodes: number
}

const WIN_SCORE = 1000000000
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
] as const

export const gomokuDifficulties: GomokuDifficulty[] = [
  { id: 'easy', label: 'Easy', depth: 1, width: 12, note: 'Fast local play that is good for short practice rounds.' },
  { id: 'medium', label: 'Medium', depth: 2, width: 14, note: 'Balances attack building with immediate defensive reading.' },
  { id: 'hard', label: 'Hard', depth: 3, width: 18, note: 'Pays much more attention to forcing threats and initiative.' }
]

export const createGomokuBoard = (): GomokuBoard =>
  Array.from({ length: GOMOKU_SIZE }, () => Array.from({ length: GOMOKU_SIZE }, () => 0 as GomokuCell))

export const cloneGomokuBoard = (board: GomokuBoard): GomokuBoard => board.map((row) => [...row])

export const getOpponentColor = (color: GomokuColor): GomokuColor => (color === 1 ? 2 : 1)

export const isInsideGomokuBoard = (row: number, col: number) =>
  row >= 0 && row < GOMOKU_SIZE && col >= 0 && col < GOMOKU_SIZE

export const countStones = (board: GomokuBoard) =>
  board.reduce((sum, row) => sum + row.filter(Boolean).length, 0)

export const applyGomokuMove = (board: GomokuBoard, move: GomokuMove): GomokuBoard => {
  const next = cloneGomokuBoard(board)
  next[move.row][move.col] = move.color
  return next
}

export const checkGomokuWin = (board: GomokuBoard, row: number, col: number, color: GomokuColor) => {
  return DIRECTIONS.some(([dr, dc]) => {
    let total = 1

    for (const step of [-1, 1]) {
      let r = row + dr * step
      let c = col + dc * step
      while (isInsideGomokuBoard(r, c) && board[r][c] === color) {
        total++
        r += dr * step
        c += dc * step
      }
    }

    return total >= 5
  })
}

const getRunScore = (stones: number, openEnds: number) => {
  if (stones >= 5) return 100000000
  if (stones === 4 && openEnds === 2) return 1200000
  if (stones === 4 && openEnds === 1) return 220000
  if (stones === 3 && openEnds === 2) return 28000
  if (stones === 3 && openEnds === 1) return 3200
  if (stones === 2 && openEnds === 2) return 900
  if (stones === 2 && openEnds === 1) return 180
  if (stones === 1 && openEnds === 2) return 40
  return 0
}

const scoreLineAtMove = (board: GomokuBoard, row: number, col: number, color: GomokuColor, dr: number, dc: number) => {
  let stones = 1
  let openEnds = 0

  for (const step of [-1, 1]) {
    let r = row + dr * step
    let c = col + dc * step

    while (isInsideGomokuBoard(r, c) && board[r][c] === color) {
      stones++
      r += dr * step
      c += dc * step
    }

    if (isInsideGomokuBoard(r, c) && board[r][c] === 0) {
      openEnds++
    }
  }

  return getRunScore(stones, openEnds)
}

const scoreMoveLocal = (board: GomokuBoard, row: number, col: number, color: GomokuColor) => {
  if (board[row][col] !== 0) return -Infinity
  let score = 0

  for (const [dr, dc] of DIRECTIONS) {
    score += scoreLineAtMove(board, row, col, color, dr, dc)
  }

  const centerDistance = Math.abs(row - 7) + Math.abs(col - 7)
  return score - centerDistance * 2
}

const hasNearbyStone = (board: GomokuBoard, row: number, col: number, radius = 2) => {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (isInsideGomokuBoard(nr, nc) && board[nr][nc] !== 0) {
        return true
      }
    }
  }
  return false
}

const scoreBoardForColor = (board: GomokuBoard, color: GomokuColor) => {
  let total = 0

  for (let row = 0; row < GOMOKU_SIZE; row++) {
    for (let col = 0; col < GOMOKU_SIZE; col++) {
      if (board[row][col] !== color) continue

      for (const [dr, dc] of DIRECTIONS) {
        const prevRow = row - dr
        const prevCol = col - dc
        if (isInsideGomokuBoard(prevRow, prevCol) && board[prevRow][prevCol] === color) {
          continue
        }

        let stones = 0
        let r = row
        let c = col
        while (isInsideGomokuBoard(r, c) && board[r][c] === color) {
          stones++
          r += dr
          c += dc
        }

        let openEnds = 0
        if (isInsideGomokuBoard(prevRow, prevCol) && board[prevRow][prevCol] === 0) {
          openEnds++
        }
        if (isInsideGomokuBoard(r, c) && board[r][c] === 0) {
          openEnds++
        }

        total += getRunScore(stones, openEnds)
      }
    }
  }

  return total
}

export const evaluateGomokuBoard = (board: GomokuBoard, aiColor: GomokuColor) => {
  const opponent = getOpponentColor(aiColor)
  return scoreBoardForColor(board, aiColor) - scoreBoardForColor(board, opponent) * 1.06
}

const isWinningMove = (board: GomokuBoard, move: GomokuMove) => {
  const nextBoard = applyGomokuMove(board, move)
  return checkGomokuWin(nextBoard, move.row, move.col, move.color)
}

const getImmediateWinningMoves = (board: GomokuBoard, color: GomokuColor, maxCandidates: number) =>
  getCandidateMoves(board, color, maxCandidates).filter((move) => isWinningMove(board, move))

const moveKey = (move: GomokuMove) => `${move.row}:${move.col}`

const getUrgentDefensiveMoves = (
  board: GomokuBoard,
  aiColor: GomokuColor,
  opponentWinningMoves: GomokuMove[],
  maxCandidates: number
) => {
  const opponent = getOpponentColor(aiColor)
  const threatKeys = new Set(opponentWinningMoves.map(moveKey))

  return getCandidateMoves(board, aiColor, maxCandidates).filter((move) => {
    if (threatKeys.has(moveKey(move))) return true

    const nextBoard = applyGomokuMove(board, move)
    return getImmediateWinningMoves(nextBoard, opponent, maxCandidates).length === 0
  })
}

const getCandidateMoves = (board: GomokuBoard, color: GomokuColor, maxCandidates: number): GomokuMove[] => {
  if (countStones(board) === 0) {
    return [{ row: 7, col: 7, color, score: 0 }]
  }

  const opponent = getOpponentColor(color)
  const moves: GomokuMove[] = []

  for (let row = 0; row < GOMOKU_SIZE; row++) {
    for (let col = 0; col < GOMOKU_SIZE; col++) {
      if (board[row][col] !== 0 || !hasNearbyStone(board, row, col)) continue

      const ownScore = scoreMoveLocal(board, row, col, color)
      const blockScore = scoreMoveLocal(board, row, col, opponent)
      moves.push({
        row,
        col,
        color,
        score: ownScore * 1.1 + blockScore
      })
    }
  }

  return moves
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxCandidates)
}

const boardKey = (board: GomokuBoard, color: GomokuColor, depth: number) =>
  `${color}:${depth}:${board.map((row) => row.join('')).join('|')}`

export const searchBestGomokuMove = (
  board: GomokuBoard,
  aiColor: GomokuColor,
  difficulty: GomokuDifficulty
): GomokuSearchResult => {
  const cache = new Map<string, number>()
  let nodes = 0
  const tacticalWidth = Math.max(difficulty.width * 2, 24)

  const negamax = (
    currentBoard: GomokuBoard,
    currentColor: GomokuColor,
    depth: number,
    alpha: number,
    beta: number,
    lastMove: GomokuMove | null
  ): number => {
    nodes++

    if (lastMove && checkGomokuWin(currentBoard, lastMove.row, lastMove.col, lastMove.color)) {
      return lastMove.color === aiColor ? WIN_SCORE + depth : -WIN_SCORE - depth
    }

    const opponent = getOpponentColor(currentColor)
    const immediateWins = getImmediateWinningMoves(currentBoard, currentColor, tacticalWidth)
    if (immediateWins.length) {
      return currentColor === aiColor ? WIN_SCORE + depth : -WIN_SCORE - depth
    }

    const filled = countStones(currentBoard)
    if (depth === 0 || filled === GOMOKU_SIZE * GOMOKU_SIZE) {
      return evaluateGomokuBoard(currentBoard, aiColor)
    }

    const key = boardKey(currentBoard, currentColor, depth)
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    const opponentWinningMoves = getImmediateWinningMoves(currentBoard, opponent, tacticalWidth)
    const moves =
      opponentWinningMoves.length > 0
        ? getUrgentDefensiveMoves(currentBoard, currentColor, opponentWinningMoves, tacticalWidth)
        : getCandidateMoves(currentBoard, currentColor, difficulty.width)
    if (!moves.length) {
      return evaluateGomokuBoard(currentBoard, aiColor)
    }

    let best = -Infinity
    let searchedAllMoves = true

    for (const move of moves) {
      const nextBoard = applyGomokuMove(currentBoard, move)
      const score = -negamax(nextBoard, opponent, depth - 1, -beta, -alpha, move)
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

  const immediateWins = getImmediateWinningMoves(board, aiColor, tacticalWidth)
  if (immediateWins.length) {
    return {
      move: immediateWins[0],
      score: WIN_SCORE,
      nodes
    }
  }

  const opponentWinningMoves = getImmediateWinningMoves(board, getOpponentColor(aiColor), tacticalWidth)
  const rootMoves =
    opponentWinningMoves.length > 0
      ? getUrgentDefensiveMoves(board, aiColor, opponentWinningMoves, tacticalWidth)
      : getCandidateMoves(board, aiColor, difficulty.width)
  if (!rootMoves.length) {
    return { move: null, score: 0, nodes }
  }

  let bestMove = rootMoves[0]
  let bestScore = -Infinity
  let alpha = -Infinity

  for (const move of rootMoves) {
    const nextBoard = applyGomokuMove(board, move)
    const score = -negamax(nextBoard, getOpponentColor(aiColor), difficulty.depth, -Infinity, Infinity, move)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
    alpha = Math.max(alpha, score)
  }

  return {
    move: bestMove,
    score: bestScore,
    nodes
  }
}
