<template>
  <GameShell
    eyebrow="Puzzle Lane"
    :title="game?.title || '华容道'"
    :description="game?.description || ''"
    :highlights="['Multiple Levels', 'Search Hint', 'Classic Sliding Puzzle']"
    :stats="heroStats"
    :controls="[
      '点击棋子选中，再点击高亮目标区域移动一步。',
      'Hint 会给出一个可靠的回退下一步，适合卡住时先退一步再看。',
      '曹操移动到底部中央出口即算通关。'
    ]"
    :notes="[
      currentLevel.note,
      '这个版本更强调轻量交互和思路训练，不强求复杂拖拽。',
      '如果卡住了，先让空位循环起来，再考虑让大块转身。'
    ]"
  >
    <div class="space-y-6">
      <section class="sketch-card space-y-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Level Select</p>
            <h2 class="text-2xl font-bold text-zinc-900">多关卡华容道</h2>
          </div>

          <div class="flex flex-wrap gap-3">
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

        <div class="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="level in huarongdaoLevels"
                :key="level.id"
                class="rounded-[24px] border-2 px-4 py-3 text-left transition"
                :class="selectedLevelId === level.id ? 'border-zinc-900 bg-zinc-900 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.16)]' : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900'"
                @click="changeLevel(level.id)"
              >
                <p class="text-sm font-bold">{{ level.title }}</p>
                <p class="mt-1 text-xs opacity-80">Depth {{ level.estimatedDepth }}</p>
              </button>
            </div>

            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Hint</p>
              <p class="mt-2 text-2xl font-bold text-zinc-900">{{ hintTitle }}</p>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ hintDetail }}</p>
            </div>
          </div>

          <div class="rounded-[32px] border-2 border-zinc-900 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]">
            <div class="hua-board">
              <div class="hua-exit">出口</div>

              <button
                v-for="move in selectedMoves"
                :key="`${move.pieceId}-${move.dx}-${move.dy}`"
                class="hua-target"
                :style="moveTargetStyle(move)"
                @click="applyMove(move)"
              />

              <button
                v-for="piece in currentPieces"
                :key="piece.id"
                class="hua-piece"
                :class="[
                  `piece-${piece.type}`,
                  selectedPieceId === piece.id ? 'is-selected' : ''
                ]"
                :style="pieceStyle(piece)"
                @click="selectPiece(piece.id)"
              >
                {{ piece.label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="sketch-card">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Puzzle Notes</p>
            <h3 class="text-2xl font-bold text-zinc-900">当前局面</h3>
          </div>
          <p class="text-sm text-zinc-500">{{ history.length }} moves used</p>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Level</p>
            <p class="mt-1 font-bold text-zinc-900">{{ currentLevel.title }}</p>
          </div>
          <div class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">State</p>
            <p class="mt-1 font-bold text-zinc-900">{{ isSolved ? 'Solved' : 'In Progress' }}</p>
          </div>
          <div class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Selected</p>
            <p class="mt-1 font-bold text-zinc-900">{{ selectedPieceLabel }}</p>
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

const heroStats = computed(() => [
  { label: 'Level', value: currentLevel.value.title },
  { label: 'Moves', value: `${history.value.length}` },
  { label: 'Status', value: isSolved.value ? 'Solved' : 'Thinking Space' }
])

const directionLabel = (move: HuarongdaoMove) => {
  if (move.dx === 1) return '向右'
  if (move.dx === -1) return '向左'
  if (move.dy === 1) return '向下'
  return '向上'
}

const hintTitle = computed(() => {
  if (isSolved.value) return '已经通关'
  if (!hint.value) return '还没请求提示'
  if (!hint.value.move) return '当前局面已经很接近完成'
  const piece = currentPieces.value.find((item) => item.id === hint.value?.move?.pieceId)
  return `${piece?.label || '当前棋子'} ${directionLabel(hint.value.move)}`
})

const hintDetail = computed(() => {
  if (isSolved.value) return '曹操已经来到出口，不需要再挪了。'
  if (!hint.value) return '点一下 Hint，我会告诉你当前路径里最稳妥的回退下一步。'
  if (!hint.value.move || hint.value.remainingSteps === null) {
    return '已经没有可回退的既有路径了，可以自由尝试。'
  }
  return `沿着提示继续回退，大约还需要 ${hint.value.remainingSteps} 步能回到已知解路径。`
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
  border-radius: 26px;
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
  padding: 0.3rem 0;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #92400e;
  background: rgba(255, 251, 235, 0.86);
  border-top: 2px dashed rgba(146, 64, 14, 0.4);
}

.hua-piece,
.hua-target {
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
  font-size: clamp(0.82rem, 2vw, 1.05rem);
  font-weight: 700;
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
</style>
