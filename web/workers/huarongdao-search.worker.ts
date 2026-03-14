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
  const { pieces, maxDepth = 200, maxStates = 100000 } = e.data

  if (isHuarongdaoSolved(pieces)) {
    self.postMessage({ move: null, remainingSteps: 0, explored: 1 })
    return
  }

  const queue: Array<{ pieces: HuarongdaoPiece[]; firstMove: HuarongdaoMove | null; depth: number }> = [
    { pieces: cloneHuarongdaoPieces(pieces), firstMove: null, depth: 0 }
  ]
  const visited = new Set<string>([serializeHuarongdaoState(pieces)])
  let explored = 0
  const startTime = Date.now()
  const TIME_LIMIT = 2000 // 2 seconds limit

  while (queue.length) {
    const current = queue.shift()!
    explored++

    // Check limits
    if (explored > maxStates || (Date.now() - startTime) > TIME_LIMIT) {
      break
    }

    if (current.depth >= maxDepth) continue

    for (const move of getHuarongdaoLegalMoves(current.pieces)) {
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

  self.postMessage({
    move: null,
    remainingSteps: null,
    explored
  })
}
