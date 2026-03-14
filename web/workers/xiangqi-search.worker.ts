import {
  searchBestXiangqiMove,
  type XiangqiBoard,
  type XiangqiDifficulty,
  type XiangqiSearchResult,
  type XiangqiSide
} from '../utils/games/chineseChess'

type XiangqiSearchRequest = {
  id: number
  board: XiangqiBoard
  aiSide: XiangqiSide
  difficulty: XiangqiDifficulty
}

type XiangqiSearchResponse = {
  id: number
  result: XiangqiSearchResult
}

const workerScope = self as DedicatedWorkerGlobalScope

workerScope.onmessage = (event: MessageEvent<XiangqiSearchRequest>) => {
  const { id, board, aiSide, difficulty } = event.data
  const result = searchBestXiangqiMove(board, aiSide, difficulty)
  workerScope.postMessage({
    id,
    result
  } satisfies XiangqiSearchResponse)
}

export {}
