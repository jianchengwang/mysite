<template>
  <GameShell
    eyebrow="Board Duel"
    :title="game?.title || '五子棋'"
    :description="game?.description || ''"
    :highlights="['Human vs AI', 'Front-end Alpha-Beta', '15×15 Minimal Board']"
    :stats="heroStats"
    :controls="[
      '点击交叉点落子，黑棋先手。',
      '切换执子后会自动重开，方便练习先手或后手。',
      '悔棋会回退最近一整轮，方便重新试探。'
    ]"
    :notes="[
      selectedDifficulty.note,
      'AI 只在前端搜索，当前更强调局部攻防和封堵，不追求职业级强度。',
      '如果你想更安静地练习，可以把自己设为白棋，让 AI 先落中央。'
    ]"
  >
    <div class="space-y-6">
      <section class="sketch-card space-y-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Match Setup</p>
            <h2 class="text-2xl font-bold text-zinc-900">手绘棋盘对局</h2>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in sideOptions"
              :key="option.value"
              class="sketch-button px-4 py-2 text-sm"
              :class="humanColor === option.value ? '!bg-zinc-900 !text-white' : ''"
              @click="changeHumanColor(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div class="rounded-[32px] border-2 border-zinc-900 bg-[#f5ead0] p-3 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)] sm:p-4">
            <div class="gomoku-board" :style="{ gridTemplateColumns: `repeat(${GOMOKU_SIZE}, minmax(0, 1fr))` }">
              <button
                v-for="(cell, index) in board.flat()"
                :key="index"
                class="gomoku-cell"
                :class="{
                  'is-disabled': !canHumanPlay || cell !== 0,
                  'is-last-move': isLastMoveByIndex(index)
                }"
                :disabled="!canHumanPlay || cell !== 0"
                @click="playHumanMoveByIndex(index)"
              >
                <span
                  v-if="isStarPointByIndex(index) && cell === 0"
                  class="gomoku-star"
                />
                <span
                  v-if="cell !== 0"
                  class="gomoku-stone"
                  :class="cell === 1 ? 'stone-black' : 'stone-white'"
                />
              </button>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Game Flow</p>
              <p class="mt-2 text-2xl font-bold text-zinc-900">{{ statusTitle }}</p>
              <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ statusDetail }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-2">
                <span class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Difficulty</span>
                <select v-model="difficultyId" class="w-full sketch-border bg-white px-3 py-2 text-sm outline-none">
                  <option v-for="option in gomokuDifficulties" :key="option.id" :value="option.id">
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
            <h3 class="text-2xl font-bold text-zinc-900">最近几手</h3>
          </div>
          <p class="text-sm text-zinc-500">{{ moveHistory.length }} moves</p>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="(move, index) in recentMoves"
            :key="`${move.row}-${move.col}-${index}`"
            class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700"
          >
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Step {{ moveHistory.length - recentMoves.length + index + 1 }}</p>
            <p class="mt-1 font-bold text-zinc-900">{{ move.color === 1 ? 'Black' : 'White' }} → {{ move.col + 1 }}, {{ move.row + 1 }}</p>
          </div>
          <div
            v-if="recentMoves.length === 0"
            class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500"
          >
            棋盘还很安静，先下一手看看。
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
  GOMOKU_SIZE,
  applyGomokuMove,
  checkGomokuWin,
  createGomokuBoard,
  getOpponentColor,
  gomokuDifficulties,
  type GomokuBoard,
  type GomokuColor,
  type GomokuMove,
  searchBestGomokuMove
} from '~/utils/games/gomoku'

definePageMeta({ layout: 'default' })

const game = getGameBySlug('gomoku')
const board = ref<GomokuBoard>(createGomokuBoard())
const moveHistory = ref<GomokuMove[]>([])
const currentTurn = ref<GomokuColor>(1)
const humanColor = ref<GomokuColor>(1)
const winner = ref<GomokuColor | 3 | null>(null)
const isThinking = ref(false)
const lastSearchNodes = ref(0)
const lastSearchScore = ref('0')
const difficultyId = ref(gomokuDifficulties[1].id)
const lastMove = ref<GomokuMove | null>(null)

const sideOptions = [
  { label: '我执黑先手', value: 1 as GomokuColor },
  { label: '我执白后手', value: 2 as GomokuColor }
]

const selectedDifficulty = computed(
  () => gomokuDifficulties.find((option) => option.id === difficultyId.value) || gomokuDifficulties[1]
)
const aiColor = computed(() => getOpponentColor(humanColor.value))
const canHumanPlay = computed(() => !winner.value && !isThinking.value && currentTurn.value === humanColor.value)
const currentTurnLabel = computed(() => (currentTurn.value === 1 ? 'Black to move' : 'White to move'))

const statusTitle = computed(() => {
  if (winner.value === 1) return '黑棋胜'
  if (winner.value === 2) return '白棋胜'
  if (winner.value === 3) return '平局'
  if (isThinking.value) return 'AI 思考中'
  return currentTurn.value === humanColor.value ? '轮到你落子' : '轮到 AI'
})

const statusDetail = computed(() => {
  if (winner.value === humanColor.value) {
    return '这一盘的节奏抓得很好，已经成功连成五子。'
  }
  if (winner.value && winner.value !== 3) {
    return 'AI 抓住了局部先手。你可以悔棋或者换个执子方式再试一盘。'
  }
  if (winner.value === 3) {
    return '棋盘已满，没有再出现五连。'
  }
  if (isThinking.value) {
    return '正在前端执行 alpha-beta 剪枝，稍等片刻。'
  }
  return currentTurn.value === humanColor.value
    ? '点击棋盘空点落子，尽量制造活三和冲四。'
    : '观察 AI 的应对，注意它优先处理即将成五的威胁。'
})

const recentMoves = computed(() => moveHistory.value.slice(-6))

const heroStats = computed(() => [
  { label: 'Difficulty', value: selectedDifficulty.value.label },
  { label: 'You Play', value: humanColor.value === 1 ? 'Black' : 'White' },
  { label: 'Position', value: winner.value ? statusTitle.value : `${moveHistory.value.length} moves` }
])

const indexToCoord = (index: number) => ({
  row: Math.floor(index / GOMOKU_SIZE),
  col: index % GOMOKU_SIZE
})

const isStarPointByIndex = (index: number) => {
  const { row, col } = indexToCoord(index)
  const stars = ['3:3', '3:7', '3:11', '7:3', '7:7', '7:11', '11:3', '11:7', '11:11']
  return stars.includes(`${row}:${col}`)
}

const isLastMoveByIndex = (index: number) => {
  if (!lastMove.value) return false
  const { row, col } = indexToCoord(index)
  return lastMove.value.row === row && lastMove.value.col === col
}

const syncGameStateFromHistory = () => {
  let nextBoard = createGomokuBoard()
  let nextTurn: GomokuColor = 1
  let nextWinner: GomokuColor | 3 | null = null
  let recent: GomokuMove | null = null

  for (const move of moveHistory.value) {
    nextBoard = applyGomokuMove(nextBoard, move)
    recent = move
    if (checkGomokuWin(nextBoard, move.row, move.col, move.color)) {
      nextWinner = move.color
    }
    nextTurn = getOpponentColor(move.color)
  }

  if (!nextWinner && moveHistory.value.length === GOMOKU_SIZE * GOMOKU_SIZE) {
    nextWinner = 3
  }

  board.value = nextBoard
  currentTurn.value = nextTurn
  winner.value = nextWinner
  lastMove.value = recent
}

const resetGame = async () => {
  moveHistory.value = []
  board.value = createGomokuBoard()
  currentTurn.value = 1
  winner.value = null
  lastMove.value = null
  lastSearchNodes.value = 0
  lastSearchScore.value = '0'
  isThinking.value = false

  if (humanColor.value === 2) {
    await triggerAiMove()
  }
}

const commitMove = (move: GomokuMove) => {
  moveHistory.value = [...moveHistory.value, move]
  syncGameStateFromHistory()
}

const playHumanMoveByIndex = async (index: number) => {
  if (!canHumanPlay.value) return
  const { row, col } = indexToCoord(index)
  if (board.value[row][col] !== 0) return

  commitMove({ row, col, color: humanColor.value })
  if (!winner.value) {
    await triggerAiMove()
  }
}

const triggerAiMove = async () => {
  if (winner.value || currentTurn.value !== aiColor.value) return

  isThinking.value = true
  await new Promise((resolve) => setTimeout(resolve, 120))

  try {
    const result = searchBestGomokuMove(board.value, aiColor.value, selectedDifficulty.value)
    lastSearchNodes.value = result.nodes
    lastSearchScore.value = result.score.toLocaleString()

    if (result.move) {
      commitMove(result.move)
    }
  } finally {
    isThinking.value = false
  }
}

const undoRound = () => {
  if (moveHistory.value.length === 0 || isThinking.value) return
  const removeCount = moveHistory.value.length >= 2 ? 2 : 1
  moveHistory.value = moveHistory.value.slice(0, -removeCount)
  syncGameStateFromHistory()
}

const changeHumanColor = async (color: GomokuColor) => {
  if (humanColor.value === color) return
  humanColor.value = color
  await resetGame()
}

await resetGame()
</script>

<style scoped>
.gomoku-board {
  display: grid;
  overflow: hidden;
  border-radius: 22px;
}

.gomoku-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 18px;
  background: transparent;
}

.gomoku-cell::before,
.gomoku-cell::after {
  content: '';
  position: absolute;
  background: rgba(39, 39, 42, 0.78);
  pointer-events: none;
}

.gomoku-cell::before {
  left: 50%;
  top: 0;
  width: 1.5px;
  height: 100%;
  transform: translateX(-50%);
}

.gomoku-cell::after {
  left: 0;
  top: 50%;
  width: 100%;
  height: 1.5px;
  transform: translateY(-50%);
}

.gomoku-cell:hover:not(.is-disabled) {
  background: rgba(255, 255, 255, 0.28);
}

.gomoku-cell.is-disabled {
  cursor: default;
}

.gomoku-cell.is-last-move::before,
.gomoku-cell.is-last-move::after {
  background: rgba(14, 116, 144, 0.9);
}

.gomoku-star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(39, 39, 42, 0.86);
}

.gomoku-stone {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 72%;
  height: 72%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 1.5px solid rgba(24, 24, 27, 0.65);
  box-shadow: 0 6px 12px rgba(24, 24, 27, 0.16);
}

.stone-black {
  background: radial-gradient(circle at 30% 28%, #52525b 0%, #18181b 72%);
}

.stone-white {
  background: radial-gradient(circle at 30% 28%, #ffffff 0%, #f4f4f5 65%, #d4d4d8 100%);
}
</style>
