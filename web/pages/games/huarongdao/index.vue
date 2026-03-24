<template>
  <GameShell
    eyebrow="Classic Puzzle"
    :title="game?.title || 'Huarongdao'"
    :description="game?.description || ''"
    :highlights="['Multi-Level', 'Shortest Path Hint', 'Board Guides']"
    :stats="heroStats"
  >
    <section class="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div class="sketch-card !p-4 sm:!p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Board Status</p>
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
              <div class="hua-exit">EXIT</div>

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
                @pointerdown="handlePiecePointerDown(piece.id, $event)"
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
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Selected</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ selectedPieceLabel }}</p>
            <p class="mt-1 text-sm text-zinc-500">Tap a piece to see available moves on the board.</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Hint Guide</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ hintMove ? directionLabel(hintMove) : 'Not Active' }}</p>
            <p class="mt-1 text-sm text-zinc-500">Hints show arrows directly on the board to guide you.</p>
          </div>
        </div>
      </div>

      <aside class="sketch-card !p-5">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Level List</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
          <button
            v-for="level in huarongdaoLevels"
            :key="level.id"
            class="rounded-[24px] border-2 px-4 py-3 text-left transition"
            :class="selectedLevelId === level.id ? 'border-zinc-900 bg-zinc-900 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.16)]' : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900'"
            @click="changeLevel(level.id)"
          >
            <p class="text-sm font-bold">{{ level.title }}</p>
            <p class="mt-1 text-xs opacity-80">Estimated {{ level.estimatedDepth }} steps</p>
          </button>
        </div>
      </aside>
    </section>
  </GameShell>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import GameShell from '~/components/games/GameShell.vue'
import { getGameBySlug } from '~/utils/games/catalog'
import {
  applyHuarongdaoMove,
  cloneHuarongdaoPieces,
  getHuarongdaoLegalMoves,
  huarongdaoLevels,
  isHuarongdaoSolved,
  type HuarongdaoMove,
  type HuarongdaoPiece,
  type HuarongdaoHint
} from '~/utils/games/huarongdao'

definePageMeta({ layout: 'default' })

const game = getGameBySlug('huarongdao')
const selectedLevelId = ref(huarongdaoLevels[0].id)
const currentPieces = ref<HuarongdaoPiece[]>(cloneHuarongdaoPieces(huarongdaoLevels[0].pieces))
const history = ref<HuarongdaoPiece[][]>([])
const selectedPieceId = ref<string | null>(null)
const hintRequested = ref(false)
const hintLoading = ref(false)
const hint = ref<HuarongdaoHint | null>(null)

let worker: Worker | null = null

onMounted(() => {
  worker = new Worker(new URL('../../../workers/huarongdao-search.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e) => {
    hint.value = e.data
    hintLoading.value = false
  }
})

onUnmounted(() => {
  worker?.terminate()
})

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
// hint computed removed

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
  { label: 'State', value: isSolved.value ? 'Solved' : 'In Progress' }
])

const directionLabel = (move: HuarongdaoMove) => {
  if (move.dx === 1) return 'Right'
  if (move.dx === -1) return 'Left'
  if (move.dy === 1) return 'Down'
  return 'Up'
}

const hintTitle = computed(() => {
  if (isSolved.value) return 'Solved'
  if (hintLoading.value) return 'Calculating...'
  if (!hintRequested.value) return 'Plan Next Move'
  if (!hintMove.value) return 'No Exact Path Found'
  const piece = currentPieces.value.find((item) => item.id === hintMove.value?.pieceId)
  if (hint.value?.remainingSteps === null) {
    return `${piece?.label || 'Piece'} · Try ${directionLabel(hintMove.value)}`
  }
  return `${piece?.label || 'Piece'} · Move ${directionLabel(hintMove.value)}`
})

const hintDetail = computed(() => {
  if (isSolved.value) return 'Cao Cao has reached the exit.'
  if (hintLoading.value) return 'Searching for the shortest path to the exit. This may take a moment...'
  if (!hintRequested.value) return 'Tap Hint to calculate the shortest path from the current board state.'
  if (hintMove.value && hint.value?.remainingSteps === null) {
    return 'The exact shortest route timed out, but this move should open the center lane or create more room.'
  }
  if (!hintMove.value) {
    return 'No useful move surfaced in time. Try one or two manual moves and ask again.'
  }
  return `Follow the hint arrow. You are approximately ${hint.value.remainingSteps} steps from solving.`
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
  selectedPieceId.value = null
  hintRequested.value = false
  hint.value = null
  hintLoading.value = false
}

const changeLevel = (levelId: string) => {
  selectedLevelId.value = levelId
  resetLevel()
}

let activePointerId: number | null = null
let startX = 0
let startY = 0

const handlePiecePointerDown = (pieceId: string, event: PointerEvent) => {
  if (isSolved.value) return
  selectedPieceId.value = pieceId
  activePointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  hasDragged = false
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

let hasDragged = false

const handlePointerMove = (event: PointerEvent) => {
  if (activePointerId === null || event.pointerId !== activePointerId) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY

  if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
    const moveDx = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : 0
    const moveDy = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 1 : -1) : 0

    const move = selectedMoves.value.find((m) => m.dx === moveDx && m.dy === moveDy)
    if (move) {
      applyMove(move)
      hasDragged = true
      handlePointerUp(event)
    }
  }
}

const handlePointerUp = (event: PointerEvent) => {
  if (activePointerId === null || event.pointerId !== activePointerId) return
  activePointerId = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

const applyMove = (move: HuarongdaoMove) => {
  history.value = [...history.value, cloneHuarongdaoPieces(currentPieces.value)]
  currentPieces.value = applyHuarongdaoMove(currentPieces.value, move)
  selectedPieceId.value = null
  hintRequested.value = false
  hint.value = null
  hintLoading.value = false
}

const undoMove = () => {
  const last = history.value.at(-1)
  if (!last) return
  currentPieces.value = cloneHuarongdaoPieces(last)
  history.value = history.value.slice(0, -1)
  selectedPieceId.value = null
  hintRequested.value = false
  hint.value = null
  hintLoading.value = false
}

const requestHint = () => {
  if (isSolved.value || hintLoading.value) return
  hintRequested.value = true
  hintLoading.value = true
  worker?.postMessage({
    pieces: JSON.parse(JSON.stringify(currentPieces.value)),
    maxStates: 320000
  })
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
  z-index: 10;
}

.hua-piece:hover {
  transform: translateY(-1px);
}

.hua-piece.is-selected {
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.14);
  border-color: rgba(14, 116, 144, 0.72);
  z-index: 15;
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
  z-index: 20;
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
