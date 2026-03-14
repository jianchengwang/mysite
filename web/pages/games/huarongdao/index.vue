<template>
  <GameShell
    eyebrow="Puzzle Lane"
    :title="game?.title || 'Huarongdao'"
    :description="game?.description || ''"
    :highlights="['Multiple Levels', 'Replay Hint', 'Exit Arrow']"
    :stats="heroStats"
  >
    <section class="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div class="sketch-card !p-4 sm:!p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Board State</p>
            <h2 class="text-2xl font-bold text-zinc-900 sm:text-3xl">{{ hintTitle }}</h2>
            <p class="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">{{ hintDetail }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="resetLevel">
              Restart
            </button>
            <button class="sketch-button px-4 py-2 text-sm" :disabled="history.length === 0" @click="undoMove">
              Undo
            </button>
            <button class="sketch-button px-4 py-2 text-sm" @click="requestHint">
              Hint
            </button>
          </div>
        </div>

        <div class="mt-6 rounded-[36px] border-2 border-zinc-900 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] p-4 shadow-[8px_8px_0_0_rgba(0,0,0,0.1)]">
          <div class="mx-auto w-full max-w-[34rem]">
            <div class="hua-board">
              <div class="hua-exit">Exit</div>

              <button
                v-for="move in selectedMoves"
                :key="`${move.pieceId}-${move.dx}-${move.dy}`"
                class="hua-target"
                :style="moveTargetStyle(move)"
                @click="applyMove(move)"
              />

              <div
                v-if="hintMove"
                class="hua-hint-arrow"
                :style="moveTargetStyle(hintMove)"
              >
                {{ hintArrow }}
              </div>

              <button
                v-for="piece in currentPieces"
                :key="piece.id"
                class="hua-piece"
                :class="[
                  `piece-${piece.type}`,
                  selectedPieceId === piece.id ? 'is-selected' : '',
                  hintMove?.pieceId === piece.id ? 'is-hint-piece' : ''
                ]"
                :style="pieceStyle(piece)"
                @click="selectPiece(piece.id)"
              >
                {{ piece.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3 xl:grid-cols-3">
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Level</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ currentLevel.title }}</p>
            <p class="mt-1 text-sm text-zinc-500">{{ currentLevel.note }}</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Selection</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ selectedPieceLabel }}</p>
            <p class="mt-1 text-sm text-zinc-500">Select a block to reveal valid one-step moves.</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Hint Marker</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ hintMove ? directionLabel(hintMove) : 'Not active' }}</p>
            <p class="mt-1 text-sm text-zinc-500">The arrow appears inside the board so the next action is easier to spot.</p>
          </div>
        </div>
      </div>

      <aside class="sketch-card !p-5">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Levels</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
          <button
            v-for="level in huarongdaoLevels"
            :key="level.id"
            class="rounded-[24px] border-2 px-4 py-3 text-left transition"
            :class="selectedLevelId === level.id ? 'border-zinc-900 bg-zinc-900 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.16)]' : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900'"
            @click="changeLevel(level.id)"
          >
            <p class="text-sm font-bold">{{ level.title }}</p>
            <p class="mt-1 text-xs opacity-80">Estimated depth {{ level.estimatedDepth }}</p>
          </button>
        </div>
      </aside>
    </section>
  </GameShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GameShell from '~/components/games/GameShell.vue'
import { getGameBySlug } from '~/utils/games/catalog'
import {
  applyHuarongdaoMove,
  cloneHuarongdaoPieces,
  getHuarongdaoLegalMoves,
  getHuarongdaoReplayHint,
  huarongdaoLevels,
  isHuarongdaoSolved,
  type HuarongdaoMove,
  type HuarongdaoPiece
} from '~/utils/games/huarongdao'

definePageMeta({ layout: 'default' })

const game = getGameBySlug('huarongdao')
const selectedLevelId = ref(huarongdaoLevels[0].id)
const currentPieces = ref<HuarongdaoPiece[]>(cloneHuarongdaoPieces(huarongdaoLevels[0].pieces))
const history = ref<HuarongdaoPiece[][]>([])
const selectedPieceId = ref<string | null>(null)
const moveLog = ref<HuarongdaoMove[]>([])
const hintRequested = ref(false)

const currentLevel = computed(
  () => huarongdaoLevels.find((level) => level.id === selectedLevelId.value) || huarongdaoLevels[0]
)
const isSolved = computed(() => isHuarongdaoSolved(currentPieces.value))
const selectedPiece = computed(() => currentPieces.value.find((piece) => piece.id === selectedPieceId.value) || null)
const selectedPieceLabel = computed(() => selectedPiece.value?.label || 'None')
const selectedMoves = computed(() =>
  selectedPieceId.value
    ? getHuarongdaoLegalMoves(currentPieces.value).filter((move) => move.pieceId === selectedPieceId.value)
    : []
)
const hint = computed(() => (hintRequested.value ? getHuarongdaoReplayHint(currentLevel.value.pathFromSolved, moveLog.value) : null))
const hintMove = computed(() => hint.value?.move ?? null)
const hintArrow = computed(() => {
  if (!hintMove.value) return ''
  if (hintMove.value.dx === 1) return '→'
  if (hintMove.value.dx === -1) return '←'
  if (hintMove.value.dy === 1) return '↓'
  return '↑'
})

const heroStats = computed(() => [
  { label: 'Level', value: currentLevel.value.title },
  { label: 'Moves', value: `${history.value.length}` },
  { label: 'Status', value: isSolved.value ? 'Solved' : 'In Progress' }
])

const directionLabel = (move: HuarongdaoMove) => {
  if (move.dx === 1) return 'Move right'
  if (move.dx === -1) return 'Move left'
  if (move.dy === 1) return 'Move down'
  return 'Move up'
}

const hintTitle = computed(() => {
  if (isSolved.value) return 'Puzzle solved'
  if (!hint.value) return 'Plan the next route'
  if (!hintMove.value) return 'Free play'
  const piece = currentPieces.value.find((item) => item.id === hintMove.value?.pieceId)
  return `${piece?.label || 'Selected block'} · ${directionLabel(hintMove.value)}`
})

const hintDetail = computed(() => {
  if (isSolved.value) return 'Cao Cao is already at the exit.'
  if (!hint.value) return 'Request a hint and the board will show a directional arrow inside the destination space.'
  if (!hintMove.value || hint.value.remainingSteps === null) {
    return 'You are already near the known path, so feel free to explore from here.'
  }
  return `Follow the arrow to step back toward the known route. About ${hint.value.remainingSteps} replay steps remain.`
})

const pieceStyle = (piece: HuarongdaoPiece) => ({
  left: `${piece.x * 25}%`,
  top: `${piece.y * 20}%`,
  width: `${piece.width * 25}%`,
  height: `${piece.height * 20}%`
})

const moveTargetStyle = (move: HuarongdaoMove) => {
  const piece = currentPieces.value.find((item) => item.id === move.pieceId)
  if (!piece) return {}
  return {
    left: `${(piece.x + move.dx) * 25}%`,
    top: `${(piece.y + move.dy) * 20}%`,
    width: `${piece.width * 25}%`,
    height: `${piece.height * 20}%`
  }
}

const resetLevel = () => {
  currentPieces.value = cloneHuarongdaoPieces(currentLevel.value.pieces)
  history.value = []
  moveLog.value = []
  selectedPieceId.value = null
  hintRequested.value = false
}

const changeLevel = (levelId: string) => {
  selectedLevelId.value = levelId
  resetLevel()
}

const selectPiece = (pieceId: string) => {
  selectedPieceId.value = selectedPieceId.value === pieceId ? null : pieceId
}

const applyMove = (move: HuarongdaoMove) => {
  history.value = [...history.value, cloneHuarongdaoPieces(currentPieces.value)]
  currentPieces.value = applyHuarongdaoMove(currentPieces.value, move)
  moveLog.value = [...moveLog.value, move]
  selectedPieceId.value = null
  hintRequested.value = false
}

const undoMove = () => {
  const last = history.value.at(-1)
  if (!last) return
  currentPieces.value = cloneHuarongdaoPieces(last)
  history.value = history.value.slice(0, -1)
  moveLog.value = moveLog.value.slice(0, -1)
  selectedPieceId.value = null
  hintRequested.value = false
}

const requestHint = () => {
  hintRequested.value = true
}
</script>

<style scoped>
.hua-board {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 28px;
  border: 2px solid #18181b;
  background:
    linear-gradient(to right, rgba(39, 39, 42, 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(39, 39, 42, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, #fefce8 0%, #fef3c7 100%);
  background-size: 25% 20%, 25% 20%, 100% 100%;
}

.hua-exit {
  position: absolute;
  left: 25%;
  bottom: 0;
  width: 50%;
  padding: 0.35rem 0;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #92400e;
  text-transform: uppercase;
  background: rgba(255, 251, 235, 0.88);
  border-top: 2px dashed rgba(146, 64, 14, 0.4);
}

.hua-piece,
.hua-target,
.hua-hint-arrow {
  position: absolute;
  margin: 0;
}

.hua-piece {
  display: grid;
  place-items: center;
  padding: 0.5rem;
  border: 2px solid rgba(24, 24, 27, 0.65);
  border-radius: 24px;
  box-shadow: 0 8px 14px rgba(24, 24, 27, 0.08);
  font-size: clamp(0.78rem, 1.5vw, 0.98rem);
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  color: #18181b;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.hua-piece:hover {
  transform: translateY(-1px);
}

.hua-piece.is-selected {
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.14);
  border-color: rgba(14, 116, 144, 0.72);
}

.hua-piece.is-hint-piece {
  box-shadow:
    0 0 0 4px rgba(245, 158, 11, 0.16),
    0 8px 14px rgba(24, 24, 27, 0.08);
  border-color: rgba(217, 119, 6, 0.72);
}

.piece-cao {
  background: linear-gradient(145deg, #fecaca 0%, #fca5a5 100%);
}

.piece-horizontal,
.piece-vertical {
  background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
}

.piece-soldier {
  background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
}

.hua-target {
  border-radius: 24px;
  border: 2px dashed rgba(14, 165, 233, 0.56);
  background: rgba(14, 165, 233, 0.12);
}

.hua-hint-arrow {
  display: grid;
  place-items: center;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  color: #b45309;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);
  pointer-events: none;
  animation: hint-pulse 1.1s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { transform: scale(0.96); opacity: 0.9; }
  50% { transform: scale(1.08); opacity: 1; }
}
</style>
