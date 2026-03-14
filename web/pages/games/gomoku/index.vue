<template>
  <GameShell
    eyebrow="Board Duel"
    :title="game?.title || 'Gomoku'"
    :description="game?.description || ''"
    :highlights="['Human vs AI', 'Front-End Alpha-Beta', '15×15 Board']"
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
                :class="humanColor === option.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'"
                @click="changeHumanColor(option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <label class="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-700">
              <span>Difficulty</span>
              <select v-model="difficultyId" class="bg-transparent text-sm font-bold text-zinc-900 outline-none">
                <option v-for="option in gomokuDifficulties" :key="option.id" :value="option.id">
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

        <div class="mt-6 rounded-[36px] border-2 border-zinc-900 bg-[#f4e7c8] p-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.1)] sm:p-5">
          <div class="mx-auto w-full max-w-[56rem]">
            <div class="gomoku-board" :style="{ gridTemplateColumns: `repeat(${GOMOKU_SIZE}, minmax(0, 1fr))` }">
              <button
                v-for="(cell, index) in board.flat()"
                :key="index"
                class="gomoku-cell"
                :class="{ 'is-disabled': !canHumanPlay || cell !== 0 }"
                :disabled="!canHumanPlay || cell !== 0"
                @click="playHumanMoveByIndex(index)"
              >
                <span v-if="isStarPointByIndex(index) && cell === 0" class="gomoku-star" />
                <span
                  v-if="cell !== 0"
                  class="gomoku-stone"
                  :class="[
                    cell === 1 ? 'stone-black' : 'stone-white',
                    isLastMoveByIndex(index) ? 'stone-last' : ''
                  ]"
                />
              </button>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3 xl:grid-cols-3">
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Turn</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ currentTurnLabel }}</p>
            <p class="mt-1 text-sm text-zinc-500">{{ isThinking ? 'The AI is searching from the current position.' : 'Play on any open intersection.' }}</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Last Move</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ lastMoveLabel }}</p>
            <p class="mt-1 text-sm text-zinc-500">The latest stone is ringed on the board.</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">AI Search</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ lastSearchNodes }} nodes</p>
            <p class="mt-1 text-sm text-zinc-500">Eval {{ lastSearchScore }}</p>
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
  { label: 'Play Black', value: 1 as GomokuColor },
  { label: 'Play White', value: 2 as GomokuColor }
]

const selectedDifficulty = computed(
  () => gomokuDifficulties.find((option) => option.id === difficultyId.value) || gomokuDifficulties[1]
)
const aiColor = computed(() => getOpponentColor(humanColor.value))
const canHumanPlay = computed(() => !winner.value && !isThinking.value && currentTurn.value === humanColor.value)
const currentTurnLabel = computed(() => (currentTurn.value === 1 ? 'Black to move' : 'White to move'))

const statusTitle = computed(() => {
  if (winner.value === 1) return 'Black wins'
  if (winner.value === 2) return 'White wins'
  if (winner.value === 3) return 'Draw'
  if (isThinking.value) return 'AI is thinking'
  return currentTurn.value === humanColor.value ? 'Your move' : 'AI move'
})

const statusDetail = computed(() => {
  if (winner.value === humanColor.value) {
    return 'You connected five in a row and closed the board cleanly.'
  }
  if (winner.value && winner.value !== 3) {
    return 'The AI found the stronger local threat. Undo the round or switch sides and try again.'
  }
  if (winner.value === 3) {
    return 'Every intersection is filled and nobody made five.'
  }
  if (isThinking.value) {
    return 'The browser is running alpha-beta search locally, so the page stays private and self-contained.'
  }
  return currentTurn.value === humanColor.value
    ? 'Build open threes, watch double threats, and use the highlighted last move to read the fight.'
    : 'The ring shows the AI’s latest stone so you can track the tempo more easily.'
})

const heroStats = computed(() => [
  { label: 'Difficulty', value: selectedDifficulty.value.label },
  { label: 'You Play', value: humanColor.value === 1 ? 'Black' : 'White' },
  { label: 'Board State', value: winner.value ? statusTitle.value : `${moveHistory.value.length} moves` }
])

const coordLetters = 'ABCDEFGHIJKLMNO'

const formatMove = (move: GomokuMove | null) => {
  if (!move) return 'No moves yet'
  const color = move.color === 1 ? 'Black' : 'White'
  return `${color} · ${coordLetters[move.col]}${move.row + 1}`
}

const lastMoveLabel = computed(() => formatMove(lastMove.value))

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
  width: 100%;
  overflow: hidden;
  border-radius: 26px;
}

.gomoku-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 20px;
  background: transparent;
}

.gomoku-cell::before,
.gomoku-cell::after {
  content: '';
  position: absolute;
  background: rgba(39, 39, 42, 0.76);
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

.gomoku-star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(39, 39, 42, 0.86);
}

.gomoku-stone {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 76%;
  height: 76%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 1.5px solid rgba(24, 24, 27, 0.65);
  box-shadow: 0 8px 14px rgba(24, 24, 27, 0.16);
}

.stone-black {
  background: radial-gradient(circle at 30% 28%, #52525b 0%, #18181b 72%);
}

.stone-white {
  background: radial-gradient(circle at 30% 28%, #ffffff 0%, #f4f4f5 65%, #d4d4d8 100%);
}

.stone-last::after {
  content: '';
  position: absolute;
  inset: -18%;
  border-radius: 999px;
  border: 3px solid rgba(14, 116, 144, 0.95);
  box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.16);
}

@media (max-width: 640px) {
  .gomoku-stone {
    width: 80%;
    height: 80%;
  }

  .stone-last::after {
    inset: -14%;
    border-width: 2px;
  }
}
</style>
