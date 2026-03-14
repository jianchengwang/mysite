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
  const levels: HuarongdaoLevel[] = [
    {
      id: 'level-classic-hengdao',
      title: '横刀立马',
      note: '最经典开局。曹操在上方，关羽横在中间，众将在两侧。',
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
      pathFromSolved: []
    },
    {
      id: 'level-qitou-bingjin',
      title: '齐头并进',
      note: '关羽居中，张飞赵云分立左右。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 1, y: 3 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 2, y: 3 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 0, y: 2 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 3, y: 2 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 0, y: 3 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 3, y: 3 }
      ],
      estimatedDepth: 72,
      pathFromSolved: []
    },
    {
      id: 'level-bingfen-lianglu',
      title: '兵分两路',
      note: '士兵分列两路，护送曹操。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 2 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 2 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 3 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 3 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 1, y: 4 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 2, y: 4 }
      ],
      estimatedDepth: 77,
      pathFromSolved: []
    },
    {
      id: 'level-weiwo-duzun',
      title: '唯我独尊',
      note: '曹操被围在中心，关羽在最下方。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 1 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 0 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 2 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 2 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 3 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 3 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 1, y: 4 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 2, y: 4 }
      ],
      estimatedDepth: 62,
      pathFromSolved: []
    },
    {
      id: 'level-shuixie-butong',
      title: '水泄不通',
      note: '阵势严密，几乎没有腾挪空间。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 3 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 3 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 3 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 3 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 1, y: 4 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 2, y: 4 }
      ],
      estimatedDepth: 79,
      pathFromSolved: []
    },
    {
      id: 'level-silu-zongdui',
      title: '四路纵队',
      note: '四路大军纵向排列。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 2 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 2 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 0, y: 4 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 1, y: 3 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 2, y: 3 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 3, y: 4 }
      ],
      estimatedDepth: 75,
      pathFromSolved: []
    },
    {
      id: 'level-zuoyou-lunhu',
      title: '左右轮虎',
      note: '两侧将军交错。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 3 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 3 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 3 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 3 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 0, y: 2 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 3, y: 2 }
      ],
      estimatedDepth: 72,
      pathFromSolved: []
    },
    {
      id: 'level-qianfu-houji',
      title: '前赴后继',
      note: '阵型紧凑。',
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
      estimatedDepth: 73,
      pathFromSolved: []
    },
    {
      id: 'level-jinza-zhichi',
      title: '近在咫尺',
      note: '曹操距离出口很近。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 2 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 1 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 2 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 2 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 1, y: 0 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 2, y: 0 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 1, y: 4 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 2, y: 4 }
      ],
      estimatedDepth: 74,
      pathFromSolved: []
    },
    {
      id: 'level-jiefang-zhongyuan',
      title: '解放中原',
      note: '最具挑战性的开局之一。',
      pieces: [
        { id: 'cao', type: 'cao', label: '曹操', width: 2, height: 2, x: 1, y: 0 },
        { id: 'guan', type: 'horizontal', label: '关羽', width: 2, height: 1, x: 1, y: 2 },
        { id: 'zhang', type: 'vertical', label: '张飞', width: 1, height: 2, x: 0, y: 0 },
        { id: 'zhao', type: 'vertical', label: '赵云', width: 1, height: 2, x: 3, y: 0 },
        { id: 'ma', type: 'vertical', label: '马超', width: 1, height: 2, x: 0, y: 3 },
        { id: 'huang', type: 'vertical', label: '黄忠', width: 1, height: 2, x: 3, y: 3 },
        { id: 'soldier-1', type: 'soldier', label: '兵一', width: 1, height: 1, x: 0, y: 2 },
        { id: 'soldier-2', type: 'soldier', label: '兵二', width: 1, height: 1, x: 3, y: 2 },
        { id: 'soldier-3', type: 'soldier', label: '兵三', width: 1, height: 1, x: 1, y: 3 },
        { id: 'soldier-4', type: 'soldier', label: '兵四', width: 1, height: 1, x: 2, y: 3 }
      ],
      estimatedDepth: 82,
      pathFromSolved: []
    }
  ]
  return levels
}

export const huarongdaoLevels = buildLevels()

export const getHuarongdaoHint = (pieces: HuarongdaoPiece[]): HuarongdaoHint => {
  // This is now handled by the Web Worker. This stub is kept for types if needed, 
  // but it's not used in the UI anymore.
  return { move: null, remainingSteps: null, explored: 0 }
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
