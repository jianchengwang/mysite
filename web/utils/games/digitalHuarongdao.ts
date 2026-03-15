export type DigitalHuarongdaoMove = {
  from: number // index in the array
  to: number
  value: number
}

export type DigitalHuarongdaoPattern = 'classic' | 'snake' | 'spiral'

export type DigitalHuarongdaoState = {
  board: number[] // 0 for empty
  size: number // 3 for 3x3, 4 for 4x4
  moves: number
  pattern: DigitalHuarongdaoPattern
}

export const getTargetBoard = (size: number, pattern: DigitalHuarongdaoPattern): number[] => {
  const count = size * size
  const board = new Array(count).fill(0)
  
  if (pattern === 'classic') {
    for (let i = 0; i < count - 1; i++) board[i] = i + 1
    board[count - 1] = 0
  } else if (pattern === 'snake') {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = r * size + (r % 2 === 0 ? c : size - 1 - c) + 1
        if (val < count) board[r * size + c] = val
        else board[r * size + c] = 0
      }
    }
  } else if (pattern === 'spiral') {
    let top = 0, bottom = size - 1, left = 0, right = size - 1
    let val = 1
    while (val < count) {
      for (let i = left; i <= right && val < count; i++) board[top * size + i] = val++
      top++
      for (let i = top; i <= bottom && val < count; i++) board[i * size + right] = val++
      right--
      for (let i = right; i >= left && val < count; i--) board[bottom * size + i] = val++
      bottom--
      for (let i = bottom; i >= top && val < count; i--) board[i * size + left] = val++
      left++
    }
    // Find where 0 is (already 0 because initialized with 0)
  }
  return board
}

export const createInitialDigitalHuarongdao = (size = 4, pattern: DigitalHuarongdaoPattern = 'classic'): DigitalHuarongdaoState => {
  const board = getTargetBoard(size, pattern)
  return { board, size, moves: 0, pattern }
}

export const isDigitalHuarongdaoSolved = (state: DigitalHuarongdaoState): boolean => {
  const target = getTargetBoard(state.size, state.pattern)
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] !== target[i]) return false
  }
  return true
}

export const getDigitalHuarongdaoLegalMoves = (state: DigitalHuarongdaoState): DigitalHuarongdaoMove[] => {
  const emptyIndex = state.board.indexOf(0)
  const emptyR = Math.floor(emptyIndex / state.size)
  const emptyC = emptyIndex % state.size
  const moves: DigitalHuarongdaoMove[] = []

  const directions = [
    [0, 1], [0, -1], [1, 0], [-1, 0]
  ]

  for (const [dr, dc] of directions) {
    const nr = emptyR + dr
    const nc = emptyC + dc
    if (nr >= 0 && nr < state.size && nc >= 0 && nc < state.size) {
      const fromIndex = nr * state.size + nc
      moves.push({
        from: fromIndex,
        to: emptyIndex,
        value: state.board[fromIndex]
      })
    }
  }

  return moves
}

export const applyDigitalHuarongdaoMove = (state: DigitalHuarongdaoState, move: DigitalHuarongdaoMove): DigitalHuarongdaoState => {
  const nextBoard = [...state.board]
  nextBoard[move.to] = nextBoard[move.from]
  nextBoard[move.from] = 0
  return {
    ...state,
    board: nextBoard,
    moves: state.moves + 1
  }
}

export const shuffleDigitalHuarongdao = (state: DigitalHuarongdaoState, iterations = 200): DigitalHuarongdaoState => {
  let current = { ...state, moves: 0 }
  for (let i = 0; i < iterations; i++) {
    const legal = getDigitalHuarongdaoLegalMoves(current)
    const move = legal[Math.floor(Math.random() * legal.length)]
    current = applyDigitalHuarongdaoMove(current, move)
  }
  return { ...current, moves: 0 }
}
