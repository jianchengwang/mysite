<template>
  <GameShell
    eyebrow="Classic Strategy"
    :title="game?.title || '中国象棋'"
    :description="game?.description || ''"
    :highlights="['Human vs AI', 'Legal Move Generator', 'Front-end Alpha-Beta']"
    :stats="heroStats"
    :controls="[
      '先点击己方棋子，再点击高亮目标格完成走子。',
      '切换红黑方会自动重开，方便练残局或后手应对。',
      'AI 搜索完全在浏览器里完成，重在顺手和可练习。'
    ]"
    :notes="[
      selectedDifficulty.note,
      '页面固定为红方在下的常见视角；如果你选择黑方，AI 会先手。',
      '规则包含将帅照面、蹩马腿、塞象眼、炮架与合法着过滤。'
    ]"
  >
    <div class="space-y-6">
      <section class="sketch-card space-y-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Table Setup</p>
            <h2 class="text-2xl font-bold text-zinc-900">极简中国象棋桌</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in sideOptions"
              :key="option.value"
              class="sketch-button px-4 py-2 text-sm"
              :class="humanSide === option.value ? '!bg-zinc-900 !text-white' : ''"
              @click="changeHumanSide(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.2fr_0.88fr]">
          <div class="rounded-[32px] border-2 border-zinc-900 bg-[#f6ead0] p-3 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)] sm:p-4">
            <div class="rounded-[24px] border border-dashed border-zinc-400 bg-[#fbf4df] px-3 py-2 text-center text-sm font-bold tracking-[0.28em] text-zinc-600">
              楚 河　　　　汉 界
            </div>

            <div class="xiangqi-board mt-3" :style="{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }">
              <button
                v-for="(cell, index) in board.flat()"
                :key="index"
                class="xiangqi-cell"
                :class="{
                  'is-selected': isSelectedIndex(index),
                  'is-target': isTargetIndex(index)
                }"
                @click="handleCellClickByIndex(index)"
              >
                <span v-if="isTargetIndex(index) && !cell" class="target-dot" />
                <span
                  v-if="cell"
                  class="xiangqi-piece"
                  :class="[
                    cell.side === 'red' ? 'piece-red' : 'piece-black',
                    isSelectedIndex(index) ? 'piece-selected' : ''
                  ]"
                >
                  {{ getXiangqiPieceLabel(cell) }}
                </span>
              </button>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Match State</p>
              <p class="mt-2 text-2xl font-bold text-zinc-900">{{ statusTitle }}</p>
              <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ statusDetail }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-2">
                <span class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Difficulty</span>
                <select v-model="difficultyId" class="w-full sketch-border bg-white px-3 py-2 text-sm outline-none">
                  <option v-for="option in xiangqiDifficulties" :key="option.id" :value="option.id">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <div class="space-y-2">
                <span class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Current Turn</span>
                <div class="rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-800">
                  {{ currentTurnLabel }}
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="resetGame">
                Restart
              </button>
              <button class="sketch-button px-4 py-2 text-sm" :disabled="moveHistory.length === 0 || isThinking" @click="undoRound">
                Undo
              </button>
            </div>

            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-white px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">AI Search</p>
              <div class="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-700">
                <div class="rounded-2xl bg-zinc-50 px-3 py-3">
                  <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Nodes</p>
                  <p class="mt-1 text-lg font-bold text-zinc-900">{{ lastSearchNodes }}</p>
                </div>
                <div class="rounded-2xl bg-zinc-50 px-3 py-3">
                  <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Eval</p>
                  <p class="mt-1 text-lg font-bold text-zinc-900">{{ lastSearchScore }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="sketch-card">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Move Log</p>
            <h3 class="text-2xl font-bold text-zinc-900">最近几着</h3>
          </div>
          <p class="text-sm text-zinc-500">{{ moveHistory.length }} plies</p>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="(move, index) in recentMoves"
            :key="`${move.from.row}-${move.from.col}-${move.to.row}-${move.to.col}-${index}`"
            class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700"
          >
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Step {{ moveHistory.length - recentMoves.length + index + 1 }}</p>
            <p class="mt-1 font-bold text-zinc-900">
              {{ getXiangqiPieceLabel(move.piece) }} {{ move.from.col + 1 }},{{ 10 - move.from.row }} → {{ move.to.col + 1 }},{{ 10 - move.to.row }}
            </p>
            <p class="mt-1 text-xs text-zinc-500">{{ move.captured ? `吃 ${getXiangqiPieceLabel(move.captured)}` : '平稳过渡' }}</p>
          </div>
          <div
            v-if="recentMoves.length === 0"
            class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500"
          >
            先走一步，局面就会立刻热起来。
          </div>
        </div>
      </section>
    </div>
  </GameShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GameShell from '~/components/games/GameShell.vue'
import { getGameBySlug } from '~/utils/games/catalog'
import {
  applyXiangqiMove,
  createInitialXiangqiBoard,
  generateLegalXiangqiMoves,
  getOppositeSide,
  getXiangqiPieceLabel,
  isXiangqiGameOver,
  isXiangqiInCheck,
  searchBestXiangqiMove,
  xiangqiDifficulties,
  type XiangqiBoard,
  type XiangqiMove,
  type XiangqiPosition,
  type XiangqiSide
} from '~/utils/games/chineseChess'

definePageMeta({ layout: 'default' })

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

const gameOver = computed(() => !!winner.value || isXiangqiGameOver(board.value))
const aiSide = computed(() => getOppositeSide(humanSide.value))
const selectedDifficulty = computed(
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
const recentMoves = computed(() => moveHistory.value.slice(-6))

const sideOptions = [
  { label: '我执红先手', value: 'red' as XiangqiSide },
  { label: '我执黑后手', value: 'black' as XiangqiSide }
]

const statusTitle = computed(() => {
  if (winner.value === 'red') return '红方胜'
  if (winner.value === 'black') return '黑方胜'
  if (isThinking.value) return 'AI 思考中'
  if (isXiangqiInCheck(board.value, currentTurn.value)) {
    return currentTurn.value === humanSide.value ? '你被将军了' : 'AI 被将军'
  }
  return currentTurn.value === humanSide.value ? '轮到你走' : '轮到 AI'
})

const statusDetail = computed(() => {
  if (winner.value === humanSide.value) {
    return '这一盘你把将帅安全和吃子节奏都拿得很稳。'
  }
  if (winner.value && winner.value !== humanSide.value) {
    return 'AI 抓住了关键先手。可以悔棋回看刚才哪一步露了空当。'
  }
  if (isThinking.value) {
    return '正在前端生成合法着法并进行 alpha-beta 搜索。'
  }
  if (isXiangqiInCheck(board.value, currentTurn.value)) {
    return currentTurn.value === humanSide.value
      ? '优先考虑解将、垫子或反将，不要让将帅继续暴露。'
      : '你已经给 AI 施压了，可以继续扩大先手。'
  }
  return currentTurn.value === humanSide.value
    ? '点击你的棋子查看可走位置，再点击高亮点完成走子。'
    : 'AI 会更偏好大子安全、将帅保护和顺手吃子。'
})

const heroStats = computed(() => [
  { label: 'Difficulty', value: selectedDifficulty.value.label },
  { label: 'You Play', value: humanSide.value === 'red' ? 'Red' : 'Black' },
  { label: 'State', value: winner.value ? statusTitle.value : `${moveHistory.value.length} plies` }
])

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

const updateWinnerFromTurn = () => {
  if (isXiangqiGameOver(board.value)) {
    winner.value = currentTurn.value === 'red' ? 'black' : 'red'
    return
  }

  const nextMoves = generateLegalXiangqiMoves(board.value, currentTurn.value)
  if (!nextMoves.length) {
    winner.value = getOppositeSide(currentTurn.value)
  } else {
    winner.value = null
  }
}

const resetGame = async () => {
  board.value = createInitialXiangqiBoard()
  moveHistory.value = []
  currentTurn.value = 'red'
  winner.value = null
  selectedPosition.value = null
  isThinking.value = false
  lastSearchNodes.value = 0
  lastSearchScore.value = '0'

  if (humanSide.value === 'black') {
    await triggerAiMove()
  }
}

const commitMove = (move: XiangqiMove) => {
  board.value = applyXiangqiMove(board.value, move)
  moveHistory.value = [...moveHistory.value, move]
  currentTurn.value = getOppositeSide(move.piece.side)
  selectedPosition.value = null
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

  isThinking.value = true
  await new Promise((resolve) => setTimeout(resolve, 160))

  try {
    const result = searchBestXiangqiMove(board.value, aiSide.value, selectedDifficulty.value)
    lastSearchNodes.value = result.nodes
    lastSearchScore.value = result.score.toLocaleString()

    if (result.move) {
      commitMove(result.move)
    } else {
      winner.value = humanSide.value
    }
  } finally {
    isThinking.value = false
  }
}

const undoRound = () => {
  if (moveHistory.value.length === 0 || isThinking.value) return
  const removeCount = moveHistory.value.length >= 2 ? 2 : 1
  const remaining = moveHistory.value.slice(0, -removeCount)

  board.value = createInitialXiangqiBoard()
  moveHistory.value = []
  currentTurn.value = 'red'
  winner.value = null
  selectedPosition.value = null

  for (const move of remaining) {
    board.value = applyXiangqiMove(board.value, move)
    moveHistory.value = [...moveHistory.value, move]
    currentTurn.value = getOppositeSide(move.piece.side)
  }

  updateWinnerFromTurn()
}

const changeHumanSide = async (side: XiangqiSide) => {
  if (humanSide.value === side) return
  humanSide.value = side
  await resetGame()
}

await resetGame()
</script>

<style scoped>
.xiangqi-board {
  display: grid;
  overflow: hidden;
  border-radius: 22px;
}

.xiangqi-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 26px;
  background: transparent;
}

.xiangqi-cell::before,
.xiangqi-cell::after {
  content: '';
  position: absolute;
  background: rgba(63, 63, 70, 0.68);
  pointer-events: none;
}

.xiangqi-cell::before {
  left: 50%;
  top: 0;
  width: 1.5px;
  height: 100%;
  transform: translateX(-50%);
}

.xiangqi-cell::after {
  left: 0;
  top: 50%;
  width: 100%;
  height: 1.5px;
  transform: translateY(-50%);
}

.xiangqi-cell.is-selected {
  background: rgba(251, 191, 36, 0.16);
}

.xiangqi-cell.is-target {
  background: rgba(14, 165, 233, 0.08);
}

.target-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.8);
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
  font-size: clamp(0.9rem, 1.8vw, 1.35rem);
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
</style>
