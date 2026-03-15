export type DigitalHuarongdaoMove = {
  from: number // index in the array
  to: number
  value: number
}

export type DigitalHuarongdaoState = {
  board: number[] // 0 for empty
  size: number // 3 for 3x3, 4 for 4x4
  moves: number
}

export const createInitialDigitalHuarongdao = (size = 4): DigitalHuarongdaoState => {
  const board = Array.from({ length: size * size }, (_, i) => (i === size * size - 1 ? 0 : i + 1))
  return { board, size, moves: 0 }
}

export const isDigitalHuarongdaoSolved = (state: DigitalHuarongdaoState): boolean => {
  for (let i = 0; i < state.board.length - 1; i++) {
    if (state.board[i] !== i + 1) return false
  }
  return state.board[state.board.length - 1] === 0
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
