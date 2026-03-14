export type HuarongdaoPieceType = 'cao' | 'vertical' | 'horizontal' | 'soldier'

export type HuarongdaoPiece = {
  id: string
  type: HuarongdaoPieceType
  label: string
  width: number
  height: number
  x: number
  y: number
}

export type HuarongdaoMove = {
  pieceId: string
  dx: number
  dy: number
}

export type HuarongdaoLevel = {
  id: string
  title: string
  note: string
  pieces: HuarongdaoPiece[]
  estimatedDepth: number
  pathFromSolved: HuarongdaoMove[]
}

export type HuarongdaoHint = {
  move: HuarongdaoMove | null
  remainingSteps: number | null
  explored: number
}

export const HUARONGDAO_COLS = 4
export const HUARONGDAO_ROWS = 5

const moveVectors = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 }
] as const

const baseSolvedPieces: HuarongdaoPiece[] = [
  { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 3 },
  { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 0 },
  { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
  { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
  { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 2 },
  { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 2 },
  { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 2 },
  { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 2 },
  { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 0, y: 4 },
  { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 3, y: 4 }
]

export const cloneHuarongdaoPieces = (pieces: HuarongdaoPiece[]) => pieces.map((piece) => ({ ...piece }))

export const isHuarongdaoSolved = (pieces: HuarongdaoPiece[]) => {
  const cao = pieces.find((piece) => piece.id === 'cao')
  return cao?.x === 1 && cao?.y === 3
}

const sortPieces = (pieces: HuarongdaoPiece[]) => [...pieces].sort((a, b) => a.id.localeCompare(b.id))

export const serializeHuarongdaoState = (pieces: HuarongdaoPiece[]) =>
  sortPieces(pieces)
    .map((piece) => `${piece.id}:${piece.x},${piece.y}`)
    .join('|')

export const createHuarongdaoBoardMap = (pieces: HuarongdaoPiece[]) => {
  const board = Array.from({ length: HUARONGDAO_ROWS }, () => Array.from({ length: HUARONGDAO_COLS }, () => null as string | null))

  for (const piece of pieces) {
    for (let dy = 0; dy < piece.height; dy++) {
      for (let dx = 0; dx < piece.width; dx++) {
        board[piece.y + dy][piece.x + dx] = piece.id
      }
    }
  }

  return board
}

const getPieceById = (pieces: HuarongdaoPiece[], pieceId: string) => pieces.find((piece) => piece.id === pieceId)

export const canMoveHuarongdaoPiece = (pieces: HuarongdaoPiece[], pieceId: string, dx: number, dy: number) => {
  const piece = getPieceById(pieces, pieceId)
  if (!piece) return false
  const nextX = piece.x + dx
  const nextY = piece.y + dy

  if (nextX < 0 || nextY < 0 || nextX + piece.width > HUARONGDAO_COLS || nextY + piece.height > HUARONGDAO_ROWS) {
    return false
  }

  const board = createHuarongdaoBoardMap(pieces)

  for (let y = nextY; y < nextY + piece.height; y++) {
    for (let x = nextX; x < nextX + piece.width; x++) {
      const occupant = board[y][x]
      if (occupant && occupant !== piece.id) {
        return false
      }
    }
  }

  return true
}

export const getHuarongdaoLegalMoves = (pieces: HuarongdaoPiece[]) => {
  const moves: HuarongdaoMove[] = []
  for (const piece of pieces) {
    for (const vector of moveVectors) {
      if (canMoveHuarongdaoPiece(pieces, piece.id, vector.dx, vector.dy)) {
        moves.push({
          pieceId: piece.id,
          dx: vector.dx,
          dy: vector.dy
        })
      }
    }
  }
  return moves
}

export const applyHuarongdaoMove = (pieces: HuarongdaoPiece[], move: HuarongdaoMove) => {
  return pieces.map((piece) =>
    piece.id === move.pieceId
      ? {
          ...piece,
          x: piece.x + move.dx,
          y: piece.y + move.dy
        }
      : { ...piece }
  )
}

export const invertHuarongdaoMove = (move: HuarongdaoMove): HuarongdaoMove => ({
  pieceId: move.pieceId,
  dx: -move.dx,
  dy: -move.dy
})

const buildLevels = (): HuarongdaoLevel[] => {
  const classicHengdaoLima: HuarongdaoLevel = {
    id: 'level-classic-hengdao',
    title: '横刀立马',
    note: '华容道最经典、最知名的开局，曹操被众将重重包围。',
    pieces: [
      { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
      { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
      { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
      { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
      { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 2 },
      { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 2 },
      { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 3 },
      { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 3 },
      { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 0, y: 4 },
      { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 3, y: 4 }
    ],
    estimatedDepth: 81,
    pathFromSolved: [] // Path is only used for "replay" hints, which we don't need for this manual level
  }

  const targetDepths = [2, 4, 6, 8, 10, 12, 14, 16]
  const titles = ['热身一', '交错', '回身', '横挪', '逼仄', '夹缝', '折返', '长局']
  const notes = [
    '先感受一步步回溯的节奏，适合热手。',
    '开始会出现空位交错，适合练细挪。',
    '要学会先让长条，再挪大块。',
    '需要几次横向腾挪才能把路让出来。',
    '底部空间会更紧，需要耐心绕位。',
    '这一关更像在和空位对话。',
    '中段很容易走回头路，提示会更有价值。',
    '已经接近完整长局，适合慢慢拆。'
  ]

  const levels: HuarongdaoLevel[] = [classicHengdaoLima]
  const visited = new Set<string>()
  const queue: Array<{ pieces: HuarongdaoPiece[]; depth: number; path: HuarongdaoMove[] }> = [
    { pieces: cloneHuarongdaoPieces(baseSolvedPieces), depth: 0, path: [] }
  ]

  visited.add(serializeHuarongdaoState(baseSolvedPieces))

  while (queue.length && levels.length < targetDepths.length) {
    const current = queue.shift()!
    if (current.depth >= targetDepths[levels.length] && !isHuarongdaoSolved(current.pieces)) {
      levels.push({
        id: `level-${levels.length + 1}`,
        title: titles[levels.length],
        note: notes[levels.length],
        pieces: cloneHuarongdaoPieces(current.pieces),
        estimatedDepth: current.depth,
        pathFromSolved: [...current.path]
      })
    }

    const moves = getHuarongdaoLegalMoves(current.pieces)
    for (const move of moves) {
      const next = applyHuarongdaoMove(current.pieces, move)
      const key = serializeHuarongdaoState(next)
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({
        pieces: next,
        depth: current.depth + 1,
        path: [...current.path, move]
      })
    }
  }

  if (!levels.length) {
    return [
      {
        id: 'level-1',
        title: '热身一',
        note: '从接近完成的局面开始，先熟悉玩法。',
        pieces: cloneHuarongdaoPieces(baseSolvedPieces),
        estimatedDepth: 0,
        pathFromSolved: []
      }
    ]
  }

  return levels
}

export const huarongdaoLevels = buildLevels()

export const getHuarongdaoHint = (pieces: HuarongdaoPiece[]): HuarongdaoHint => {
  if (isHuarongdaoSolved(pieces)) {
    return { move: null, remainingSteps: 0, explored: 1 }
  }

  const queue: Array<{ pieces: HuarongdaoPiece[]; firstMove: HuarongdaoMove | null; depth: number }> = [
    { pieces: cloneHuarongdaoPieces(pieces), firstMove: null, depth: 0 }
  ]
  const visited = new Set<string>([serializeHuarongdaoState(pieces)])
  let explored = 0

  while (queue.length) {
    const current = queue.shift()!
    explored++

    for (const move of getHuarongdaoLegalMoves(current.pieces)) {
      const nextPieces = applyHuarongdaoMove(current.pieces, move)
      const key = serializeHuarongdaoState(nextPieces)
      if (visited.has(key)) continue

      const firstMove = current.firstMove ?? move
      const depth = current.depth + 1
      if (isHuarongdaoSolved(nextPieces)) {
        return {
          move: firstMove,
          remainingSteps: depth,
          explored
        }
      }

      visited.add(key)
      queue.push({
        pieces: nextPieces,
        firstMove,
        depth
      })
    }
  }

  return {
    move: null,
    remainingSteps: null,
    explored
  }
}

export const getHuarongdaoReplayHint = (pathFromSolved: HuarongdaoMove[], playerMoves: HuarongdaoMove[]): HuarongdaoHint => {
  const combined = [...pathFromSolved, ...playerMoves]
  if (!combined.length) {
    return { move: null, remainingSteps: 0, explored: 0 }
  }

  return {
    move: invertHuarongdaoMove(combined[combined.length - 1]),
    remainingSteps: combined.length,
    explored: combined.length
  }
}
