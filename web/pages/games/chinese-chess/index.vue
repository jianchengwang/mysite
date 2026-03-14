<template>
  <GameShell
    eyebrow="Classic Strategy"
    :title="game?.title || 'Xiangqi'"
    :description="game?.description || ''"
    :highlights="['Human vs AI', 'Worker Search', 'Responsive Board']"
    :stats="heroStats"
  >
    <div class="space-y-6">
      <section class="sketch-card !p-4 sm:!p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Match Flow</p>
            <h2 class="text-2xl font-bold text-zinc-900 sm:text-3xl">{{ statusTitle }}</h2>
            <p class="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">{{ statusDetail }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="inline-flex rounded-full border border-zinc-300 bg-white p-1">
              <button
                v-for="option in sideOptions"
                :key="option.value"
                class="rounded-full px-4 py-2 text-sm font-bold transition"
                :class="humanSide === option.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'"
                @click="changeHumanSide(option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <label class="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-700">
              <span>Difficulty</span>
              <select v-model="difficultyId" class="bg-transparent text-sm font-bold text-zinc-900 outline-none">
                <option v-for="option in xiangqiDifficulties" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="resetGame">
              Restart
            </button>
            <button class="sketch-button px-4 py-2 text-sm" :disabled="moveHistory.length === 0 || isThinking" @click="undoRound">
              Undo Round
            </button>
          </div>
        </div>

        <div class="mt-6 rounded-[36px] border-2 border-zinc-900 bg-[#f6ead0] p-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.1)] sm:p-5">
          <div class="mx-auto w-full max-w-[62rem]">
            <div class="xiangqi-board-container relative">
              <!-- Board Lines Layer -->
              <div class="absolute inset-0 pointer-events-none p-[5.5%]">
                <svg viewBox="0 0 800 900" class="w-full h-full stroke-zinc-700/60 fill-none" stroke-width="2">
                  <!-- Vertical Lines -->
                  <path v-for="i in 9" :key="`v-${i}`" :d="`M ${(i-1)*100} 0 L ${(i-1)*100} ${i===1||i===9 ? 900 : 400} M ${(i-1)*100} 500 L ${(i-1)*100} 900`" />
                  <!-- Horizontal Lines -->
                  <path v-for="i in 10" :key="`h-${i}`" :d="`M 0 ${(i-1)*100} L 800 ${(i-1)*100}`" />
                  <!-- Palace Diagonals -->
                  <path d="M 300 0 L 500 200 M 500 0 L 300 200" />
                  <path d="M 300 700 L 500 900 M 500 700 L 300 900" />
                  <!-- River Text -->
                  <text x="200" y="465" class="fill-zinc-600 font-serif italic text-4xl" stroke="none">楚 河</text>
                  <text x="600" y="465" class="fill-zinc-600 font-serif italic text-4xl" text-anchor="end" stroke="none">漢 界</text>
                </svg>
              </div>

              <div class="xiangqi-board relative z-10" :style="{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }">
                <button
                  v-for="(cell, index) in board.flat()"
                  :key="index"
                  class="xiangqi-cell"
                  :class="{
                    'is-selected': isSelectedIndex(index),
                    'is-target': isTargetIndex(index),
                    'is-last-from': isLastMoveFromIndex(index),
                    'is-last-to': isLastMoveToIndex(index)
                  }"
                  @click="handleCellClickByIndex(index)"
                >
                  <span v-if="isTargetIndex(index) && !cell" class="target-dot" />
                  <span
                    v-if="cell"
                    class="xiangqi-piece"
                    :class="[
                      cell.side === 'red' ? 'piece-red' : 'piece-black',
                      isSelectedIndex(index) ? 'piece-selected' : '',
                      isLastMoveToIndex(index) ? 'piece-last' : ''
                    ]"
                  >
                    {{ getXiangqiPieceLabel(cell) }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3 xl:grid-cols-3">
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Turn</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ currentTurnLabel }}</p>
            <p class="mt-1 text-sm text-zinc-500">{{ currentCheckLabel }}</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Last Move</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ lastMoveLabel }}</p>
            <p class="mt-1 text-sm text-zinc-500">Origin and destination are both highlighted on the board.</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">AI Search</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ lastSearchNodes }} nodes</p>
            <p class="mt-1 text-sm text-zinc-500">Eval {{ lastSearchScore }} · {{ selectedDifficulty.note }}</p>
          </div>
        </div>
      </section>
    </div>
  </GameShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GameShell from '~/components/games/GameShell.vue'
import { getGameBySlug } from '~/utils/games/catalog'
import {
  applyXiangqiMove,
  calculateXiangqiHistoryKeys,
  createInitialXiangqiBoard,
  generateLegalXiangqiMoves,
  getOppositeSide,
  getXiangqiPieceLabel,
  isXiangqiGameOver,
  isXiangqiInCheck,
  xiangqiDifficulties,
  type XiangqiBoard,
  type XiangqiDifficulty,
  type XiangqiMove,
  type XiangqiPosition,
  type XiangqiSearchResult,
  type XiangqiSide
} from '~/utils/games/chineseChess'

definePageMeta({ layout: 'default' })

type WorkerSearchResponse = {
  id: number
  result: XiangqiSearchResult
}

const game = getGameBySlug('chinese-chess')
const board = ref<XiangqiBoard>(createInitialXiangqiBoard())
const moveHistory = ref<XiangqiMove[]>([])
const currentTurn = ref<XiangqiSide>('red')
const humanSide = ref<XiangqiSide>('red')
const winner = ref<XiangqiSide | null>(null)
const selectedPosition = ref<XiangqiPosition | null>(null)
const isThinking = ref(false)
const difficultyId = ref(xiangqiDifficulties[1].id)
const lastSearchNodes = ref(0)
const lastSearchScore = ref('0')
const lastMove = ref<XiangqiMove | null>(null)

const workerRef = ref<Worker | null>(null)
const pendingSearches = new Map<number, { resolve: (value: XiangqiSearchResult) => void; reject: (reason?: unknown) => void }>()
let workerRequestId = 0
let activeAiRequestToken = 0

const gameOver = computed(() => !!winner.value || isXiangqiGameOver(board.value))
const aiSide = computed(() => getOppositeSide(humanSide.value))
const selectedDifficulty = computed<XiangqiDifficulty>(
  () => xiangqiDifficulties.find((option) => option.id === difficultyId.value) || xiangqiDifficulties[1]
)
const legalMoves = computed(() => generateLegalXiangqiMoves(board.value, currentTurn.value))
const selectableMoves = computed(() => {
  if (!selectedPosition.value) return []
  return legalMoves.value.filter(
    (move) => move.from.row === selectedPosition.value?.row && move.from.col === selectedPosition.value?.col
  )
})
const currentTurnLabel = computed(() => (currentTurn.value === 'red' ? 'Red to move' : 'Black to move'))
const currentCheckLabel = computed(() => {
  if (winner.value) return winner.value === humanSide.value ? 'You converted the attack.' : 'The AI converted the attack.'
  if (isXiangqiInCheck(board.value, currentTurn.value)) {
    return currentTurn.value === humanSide.value ? 'You are in check.' : 'The AI is in check.'
  }
  return isThinking.value ? 'The search runs in a background worker to keep the page responsive.' : 'Pick a piece, then tap a highlighted square.'
})

const sideOptions = [
  { label: 'Play Red', value: 'red' as XiangqiSide },
  { label: 'Play Black', value: 'black' as XiangqiSide }
]

const statusTitle = computed(() => {
  if (winner.value === 'red') return 'Red wins'
  if (winner.value === 'black') return 'Black wins'
  if (isThinking.value) return 'AI is thinking'
  if (isXiangqiInCheck(board.value, currentTurn.value)) {
    return currentTurn.value === humanSide.value ? 'You are in check' : 'AI under pressure'
  }
  return currentTurn.value === humanSide.value ? 'Your move' : 'AI move'
})

const statusDetail = computed(() => {
  if (winner.value === humanSide.value) {
    return 'You kept the king safe, used the initiative well, and closed the game.'
  }
  if (winner.value && winner.value !== humanSide.value) {
    return 'The AI found the stronger tactical sequence. Undo the round or restart from the other side.'
  }
  if (isThinking.value) {
    return 'Search is running off the main thread, so the page should stay responsive even on longer turns.'
  }
  if (isXiangqiInCheck(board.value, currentTurn.value)) {
    return currentTurn.value === humanSide.value
      ? 'Look for king moves, blocks, or captures that resolve the check immediately.'
      : 'You have the AI in check. Keep the pressure, but do not leave your own king exposed.'
  }
  return currentTurn.value === humanSide.value
    ? 'The latest move is marked on the board, which should make the tactical thread much easier to read.'
    : 'Watch the highlighted last move to understand which file or diagonal the AI is fighting for.'
})

const heroStats = computed(() => [
  { label: 'Difficulty', value: selectedDifficulty.value.label },
  { label: 'You Play', value: humanSide.value === 'red' ? 'Red' : 'Black' },
  { label: 'Board State', value: winner.value ? statusTitle.value : `${moveHistory.value.length} plies` }
])

const formatPosition = (position: XiangqiPosition) => `${position.col + 1},${10 - position.row}`

const lastMoveLabel = computed(() => {
  if (!lastMove.value) return 'No moves yet'
  return `${getXiangqiPieceLabel(lastMove.value.piece)} ${formatPosition(lastMove.value.from)} → ${formatPosition(lastMove.value.to)}`
})

const ensureWorker = () => {
  if (!import.meta.client || workerRef.value) return
  const worker = new Worker(new URL('../../../workers/xiangqi-search.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<WorkerSearchResponse>) => {
    const pending = pendingSearches.get(event.data.id)
    if (!pending) return
    pendingSearches.delete(event.data.id)
    pending.resolve(event.data.result)
  }
  worker.onerror = (error) => {
    for (const pending of pendingSearches.values()) {
      pending.reject(error)
    }
    pendingSearches.clear()
  }
  workerRef.value = worker
}

const recreateWorker = () => {
  workerRef.value?.terminate()
  workerRef.value = null
  for (const pending of pendingSearches.values()) {
    pending.reject(new Error('Xiangqi search cancelled'))
  }
  pendingSearches.clear()
  ensureWorker()
}

const cloneBoardSnapshot = (source: XiangqiBoard): XiangqiBoard =>
  source.map((row) => row.map((cell) => (cell ? { ...cell } : null)))

const searchWithWorker = (currentBoard: XiangqiBoard, side: XiangqiSide, difficulty: XiangqiDifficulty) => {
  ensureWorker()
  const worker = workerRef.value
  if (!worker) {
    return Promise.reject(new Error('Worker unavailable'))
  }

  // Generate board history keys for repetition detection in search
  const historyKeys = calculateXiangqiHistoryKeys(createInitialXiangqiBoard(), moveHistory.value)

  return new Promise<XiangqiSearchResult>((resolve, reject) => {
    const id = ++workerRequestId
    pendingSearches.set(id, { resolve, reject })
    worker.postMessage({
      id,
      board: cloneBoardSnapshot(currentBoard),
      aiSide: side,
      difficulty: { ...difficulty },
      historyKeys,
      timeLimit: 3000 // 3 seconds per move
    })
  })
}

const cancelActiveAi = () => {
  activeAiRequestToken++
  isThinking.value = false
  recreateWorker()
}

const indexToCoord = (index: number) => ({
  row: Math.floor(index / 9),
  col: index % 9
})

const isSelectedIndex = (index: number) => {
  if (!selectedPosition.value) return false
  const { row, col } = indexToCoord(index)
  return selectedPosition.value.row === row && selectedPosition.value.col === col
}

const isTargetIndex = (index: number) => {
  const { row, col } = indexToCoord(index)
  return selectableMoves.value.some((move) => move.to.row === row && move.to.col === col)
}

const isLastMoveFromIndex = (index: number) => {
  if (!lastMove.value) return false
  const { row, col } = indexToCoord(index)
  return lastMove.value.from.row === row && lastMove.value.from.col === col
}

const isLastMoveToIndex = (index: number) => {
  if (!lastMove.value) return false
  const { row, col } = indexToCoord(index)
  return lastMove.value.to.row === row && lastMove.value.to.col === col
}

const updateWinnerFromTurn = () => {
  if (isXiangqiGameOver(board.value)) {
    winner.value = currentTurn.value === 'red' ? 'black' : 'red'
    return
  }

  const nextMoves = generateLegalXiangqiMoves(board.value, currentTurn.value)
  winner.value = nextMoves.length ? null : getOppositeSide(currentTurn.value)
}

const resetGame = async () => {
  cancelActiveAi()
  board.value = createInitialXiangqiBoard()
  moveHistory.value = []
  currentTurn.value = 'red'
  winner.value = null
  selectedPosition.value = null
  lastSearchNodes.value = 0
  lastSearchScore.value = '0'
  lastMove.value = null

  if (humanSide.value === 'black') {
    await triggerAiMove()
  }
}

const commitMove = (move: XiangqiMove) => {
  board.value = applyXiangqiMove(board.value, move)
  moveHistory.value = [...moveHistory.value, move]
  currentTurn.value = getOppositeSide(move.piece.side)
  selectedPosition.value = null
  lastMove.value = move
  updateWinnerFromTurn()
}

const handleCellClickByIndex = async (index: number) => {
  if (gameOver.value || isThinking.value || currentTurn.value !== humanSide.value) return

  const { row, col } = indexToCoord(index)
  const cell = board.value[row][col]
  const activeMove = selectableMoves.value.find((move) => move.to.row === row && move.to.col === col)

  if (activeMove) {
    commitMove(activeMove)
    if (!winner.value) {
      await triggerAiMove()
    }
    return
  }

  if (cell?.side === humanSide.value && currentTurn.value === humanSide.value) {
    selectedPosition.value =
      selectedPosition.value?.row === row && selectedPosition.value?.col === col
        ? null
        : { row, col }
    return
  }

  selectedPosition.value = null
}

const triggerAiMove = async () => {
  if (winner.value || currentTurn.value !== aiSide.value) return

  const token = ++activeAiRequestToken
  const side = aiSide.value
  isThinking.value = true

  try {
    const result = await searchWithWorker(board.value, side, selectedDifficulty.value)
    if (token !== activeAiRequestToken || winner.value || currentTurn.value !== side) return

    lastSearchNodes.value = result.nodes
    lastSearchScore.value = result.score.toLocaleString()

    if (result.move) {
      commitMove(result.move)
    } else {
      winner.value = humanSide.value
    }
  } catch (error) {
    if (token === activeAiRequestToken) {
      lastSearchScore.value = 'search error'
      console.error(error)
    }
  } finally {
    if (token === activeAiRequestToken) {
      isThinking.value = false
    }
  }
}

const undoRound = () => {
  if (moveHistory.value.length === 0 || isThinking.value) return
  const removeCount = moveHistory.value.length >= 2 ? 2 : 1
  const remaining = moveHistory.value.slice(0, -removeCount)

  cancelActiveAi()
  board.value = createInitialXiangqiBoard()
  moveHistory.value = []
  currentTurn.value = 'red'
  winner.value = null
  selectedPosition.value = null
  lastMove.value = null

  for (const move of remaining) {
    board.value = applyXiangqiMove(board.value, move)
    moveHistory.value = [...moveHistory.value, move]
    currentTurn.value = getOppositeSide(move.piece.side)
    lastMove.value = move
  }

  updateWinnerFromTurn()
}

const changeHumanSide = async (side: XiangqiSide) => {
  if (humanSide.value === side) return
  humanSide.value = side
  await resetGame()
}

onMounted(() => {
  ensureWorker()
})

onUnmounted(() => {
  workerRef.value?.terminate()
  workerRef.value = null
  pendingSearches.clear()
})

await resetGame()
</script>

<style scoped>
.xiangqi-board {
  display: grid;
  width: 100%;
  overflow: hidden;
  border-radius: 26px;
}

.xiangqi-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 28px;
  background: transparent;
}

.xiangqi-cell.is-selected {
  background: rgba(251, 191, 36, 0.16);
}

.xiangqi-cell.is-target {
  background: rgba(14, 165, 233, 0.08);
}

.xiangqi-cell.is-last-from {
  background: rgba(245, 158, 11, 0.08);
}

.xiangqi-cell.is-last-to {
  background: rgba(14, 165, 233, 0.12);
}

.target-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  width: 11px;
  height: 11px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.84);
}

.xiangqi-piece {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 82%;
  height: 82%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 2px solid rgba(113, 63, 18, 0.48);
  background: radial-gradient(circle at 30% 28%, #fffdf5 0%, #f8f1df 70%, #eadfc6 100%);
  box-shadow: 0 8px 14px rgba(24, 24, 27, 0.08);
  font-size: clamp(0.9rem, 1.8vw, 1.25rem);
  font-weight: 700;
}

.piece-red {
  color: #b91c1c;
}

.piece-black {
  color: #18181b;
}

.piece-selected {
  border-color: rgba(14, 116, 144, 0.72);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
}

.piece-last {
  box-shadow:
    0 0 0 4px rgba(14, 116, 144, 0.18),
    0 8px 14px rgba(24, 24, 27, 0.08);
  border-color: rgba(14, 116, 144, 0.78);
}
</style>
