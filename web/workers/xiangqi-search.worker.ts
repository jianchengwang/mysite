import {
  searchBestXiangqiMove,
  type XiangqiBoard,
  type XiangqiDifficulty,
  type XiangqiSearchResult,
  type XiangqiSide,
  type XiangqiMove
} from '../utils/games/chineseChess'

type XiangqiSearchRequest = {
  id: number
  board: XiangqiBoard
  aiSide: XiangqiSide
  difficulty: XiangqiDifficulty
  historyKeys?: bigint[]
  timeLimit?: number
  history?: XiangqiMove[]
}

type XiangqiSearchResponse = {
  id: number
  result: XiangqiSearchResult
}

const workerScope = self as DedicatedWorkerGlobalScope

workerScope.onmessage = (event: MessageEvent<XiangqiSearchRequest>) => {
  const { id, board, aiSide, difficulty, historyKeys, timeLimit, history } = event.data
  const result = searchBestXiangqiMove(board, aiSide, difficulty, historyKeys, timeLimit, history)
  workerScope.postMessage({
    id,
    result
  } satisfies XiangqiSearchResponse)
}

export {}
