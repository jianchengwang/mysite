import {
  applyHuarongdaoMove,
  cloneHuarongdaoPieces,
  isHuarongdaoSolved,
  getHuarongdaoLegalMoves,
  serializeHuarongdaoState,
  type HuarongdaoPiece,
  type HuarongdaoMove
} from '../utils/games/huarongdao'

self.onmessage = (e: MessageEvent) => {
  const { pieces, maxDepth = 240, maxStates = 320000 } = e.data

  const scoreHintMove = (currentPieces: HuarongdaoPiece[], move: HuarongdaoMove) => {
    const nextPieces = applyHuarongdaoMove(currentPieces, move)
    const cao = nextPieces.find((piece) => piece.id === 'cao')
    if (!cao) return Number.NEGATIVE_INFINITY

    let centralLaneBlocks = 0
    for (const piece of nextPieces) {
      if (piece.id === 'cao') continue
      for (let y = piece.y; y < piece.y + piece.height; y++) {
        for (let x = piece.x; x < piece.x + piece.width; x++) {
          if (x >= 1 && x <= 2 && y >= 2) {
            centralLaneBlocks++
          }
        }
      }
    }

    const nextMobility = getHuarongdaoLegalMoves(nextPieces).length
    const caoProgress = cao.y * 180 - Math.abs(cao.x - 1) * 70
    const moveBias =
      move.pieceId === 'cao'
        ? move.dy > 0
          ? 260
          : move.dx !== 0
            ? 90
            : -40
        : move.dy > 0
          ? 48
          : 12

    return caoProgress + nextMobility * 14 - centralLaneBlocks * 58 + moveBias
  }

  const getFallbackHintMove = (currentPieces: HuarongdaoPiece[]) => {
    const legalMoves = getHuarongdaoLegalMoves(currentPieces)
    if (!legalMoves.length) return null
    return [...legalMoves].sort((left, right) => scoreHintMove(currentPieces, right) - scoreHintMove(currentPieces, left))[0]
  }

  if (isHuarongdaoSolved(pieces)) {
    self.postMessage({ move: null, remainingSteps: 0, explored: 1 })
    return
  }

  const queue: Array<{ pieces: HuarongdaoPiece[]; firstMove: HuarongdaoMove | null; depth: number }> = [
    { pieces: cloneHuarongdaoPieces(pieces), firstMove: null, depth: 0 }
  ]
  const visited = new Set<string>([serializeHuarongdaoState(pieces)])
  let queueIndex = 0
  let explored = 0
  const startTime = Date.now()
  const TIME_LIMIT = 3600

  while (queueIndex < queue.length) {
    const current = queue[queueIndex++]
    explored++

    if (explored > maxStates || (Date.now() - startTime) > TIME_LIMIT) {
      break
    }

    if (current.depth >= maxDepth) continue

    const orderedMoves = [...getHuarongdaoLegalMoves(current.pieces)].sort(
      (left, right) => scoreHintMove(current.pieces, right) - scoreHintMove(current.pieces, left)
    )

    for (const move of orderedMoves) {
      const nextPieces = applyHuarongdaoMove(current.pieces, move)
      const key = serializeHuarongdaoState(nextPieces)
      if (visited.has(key)) continue

      const firstMove = current.firstMove ?? move
      const depth = current.depth + 1
      
      if (isHuarongdaoSolved(nextPieces)) {
        self.postMessage({
          move: firstMove,
          remainingSteps: depth,
          explored
        })
        return
      }

      visited.add(key)
      queue.push({
        pieces: nextPieces,
        firstMove,
        depth
      })
    }
  }

  const fallbackMove = getFallbackHintMove(pieces)
  self.postMessage({
    move: fallbackMove,
    remainingSteps: null,
    explored
  })
}
