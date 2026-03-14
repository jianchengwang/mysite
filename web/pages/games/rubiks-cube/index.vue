<template>
  <GameShell
    eyebrow="3D Practice"
    :title="game?.title || '3D Cube'"
    :description="game?.description || ''"
    :highlights="['Direct Face Drag', 'True Cubie State', 'Beginner Guide']"
    :stats="heroStats"
  >
    <section class="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="sketch-card !p-4 sm:!p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Cube Studio</p>
            <h2 class="text-2xl font-bold text-zinc-900 sm:text-3xl">{{ guide.title }}</h2>
            <p class="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              Drag a visible face to turn that layer. Drag empty stage space to orbit the camera. The buttons stay here only as a fallback.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="scrambleCube">
              Scramble
            </button>
            <button class="sketch-button px-4 py-2 text-sm" :disabled="moveHistory.length === 0" @click="undoLastMove">
              Undo
            </button>
            <button class="sketch-button px-4 py-2 text-sm" @click="resetCube">
              Reset
            </button>
          </div>
        </div>

        <div
          class="cube-stage mt-6"
          @pointerdown="handleStagePointerDown"
        >
          <div class="cube-stage-note">drag a face to turn • drag empty space to orbit</div>
          <div v-if="activeTurnLabel" class="cube-turn-badge">{{ activeTurnLabel }}</div>
          <div class="cube-model" :style="{ transform: cubeTransform }">
            <div
              v-for="face in faceOrder"
              :key="face"
              class="cube-face"
              :style="faceStyle(face)"
              @pointerdown.stop="handleFacePointerDown(face, $event)"
            >
              <div
                v-for="(color, index) in faceMap[face]"
                :key="`${face}-${index}`"
                class="cube-sticker"
                :class="stickerClass(color)"
              />
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3 xl:grid-cols-3">
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Current Hint</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ guide.title }}</p>
            <p class="mt-1 text-sm text-zinc-500">{{ guide.detail }}</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Next Suggested Undo</p>
            <p class="mt-2 text-lg font-bold text-zinc-900">{{ guide.nextMove || 'None' }}</p>
            <p class="mt-1 text-sm text-zinc-500">Useful when you want one dependable step backward.</p>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Fallback Buttons</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="move in cubeMoveButtons"
                :key="move"
                class="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold text-zinc-800 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]"
                @click="performMove(move)"
              >
                {{ move }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside class="sketch-card !p-5">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Beginner Route</p>
        <div class="mt-4 rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Current Lesson</p>
          <p class="mt-2 text-lg font-bold text-zinc-900">{{ currentGuideStep ? `Step ${currentGuideStep}` : 'Solved / Free Practice' }}</p>
          <p class="mt-1 text-sm text-zinc-500">{{ guide.detail }}</p>
        </div>
        <div class="mt-4 space-y-3">
          <div
            v-for="(step, index) in cubeTutorialSteps"
            :key="step"
            class="rounded-[24px] border border-dashed px-4 py-3 text-sm text-zinc-700 transition"
            :class="currentGuideStep === index + 1 ? 'border-sky-300 bg-sky-50' : 'border-zinc-300 bg-zinc-50'"
          >
            <p class="font-bold text-zinc-900">Step {{ index + 1 }}</p>
            <p class="mt-1">{{ step }}</p>
          </div>
        </div>
      </aside>
    </section>
  </GameShell>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import GameShell from '~/components/games/GameShell.vue'
import { getGameBySlug } from '~/utils/games/catalog'
import {
  applyCubeMove,
  countSolvedFaces,
  countSolvedStickers,
  createSolvedCube,
  cubeMoveButtons,
  cubeTutorialSteps,
  generateCubeScramble,
  getCubeFace,
  getCubeGuide,
  invertCubeMove,
  isCubeSolved,
  type CubeFace,
  type CubeMove,
  type StickerColor
} from '~/utils/games/rubiksCube'

definePageMeta({ layout: 'default' })

const game = getGameBySlug('rubiks-cube')
const cube = ref(createSolvedCube())
const moveHistory = ref<CubeMove[]>([])
const viewRotationX = ref(-26)
const viewRotationY = ref(34)
const turnNudgeX = ref(0)
const turnNudgeY = ref(0)
const turnNudgeZ = ref(0)
const activeTurnLabel = ref('')
const previewFace = ref<CubeFace | null>(null)
const previewAxis = ref<'x' | 'y' | 'z'>('z')
const previewAngle = ref(0)
const faceOrder: CubeFace[] = ['U', 'F', 'R', 'L', 'B', 'D']
let turnAnimationTimer = 0

const faceBaseTransforms: Record<CubeFace, string> = {
  F: 'rotateY(0deg) translateZ(var(--cube-depth))',
  B: 'rotateY(180deg) translateZ(var(--cube-depth))',
  R: 'rotateY(90deg) translateZ(var(--cube-depth))',
  L: 'rotateY(-90deg) translateZ(var(--cube-depth))',
  U: 'rotateX(90deg) translateZ(var(--cube-depth))',
  D: 'rotateX(-90deg) translateZ(var(--cube-depth))'
}

const faceTurnAxis: Record<CubeFace, 'x' | 'y' | 'z'> = {
  U: 'y',
  D: 'y',
  L: 'x',
  R: 'x',
  F: 'z',
  B: 'z'
}

const faceMap = computed<Record<CubeFace, StickerColor[]>>(() => ({
  U: getCubeFace(cube.value, 'U'),
  F: getCubeFace(cube.value, 'F'),
  R: getCubeFace(cube.value, 'R'),
  L: getCubeFace(cube.value, 'L'),
  B: getCubeFace(cube.value, 'B'),
  D: getCubeFace(cube.value, 'D')
}))

const guide = computed(() => getCubeGuide(cube.value, moveHistory.value))
const cubeTransform = computed(
  () => `rotateX(${viewRotationX.value + turnNudgeX.value}deg) rotateY(${viewRotationY.value + turnNudgeY.value}deg) rotateZ(${turnNudgeZ.value}deg)`
)
const currentGuideStep = computed(() => {
  const match = guide.value.title.match(/^Step\\s+(\\d+)/)
  return match ? Number(match[1]) : 0
})
const heroStats = computed(() => [
  { label: 'Solved Faces', value: `${countSolvedFaces(cube.value)} / 6` },
  { label: 'Solved Stickers', value: `${countSolvedStickers(cube.value)} / 54` },
  { label: 'Status', value: isCubeSolved(cube.value) ? 'Solved' : 'In Practice' }
])

const stickerClass = (color: StickerColor) => `sticker-${color}`
const faceStyle = (face: CubeFace) => {
  const transforms = [faceBaseTransforms[face]]

  if (previewFace.value === face && previewAngle.value !== 0) {
    const axis = previewAxis.value.toUpperCase()
    transforms.unshift(`rotate${axis}(${previewAngle.value}deg)`)
  }

  return {
    transform: transforms.join(' ')
  }
}

const formatTurnLabel = (move: CubeMove) => {
  const faceNames: Record<CubeFace, string> = {
    U: 'Top',
    D: 'Bottom',
    L: 'Left',
    R: 'Right',
    F: 'Front',
    B: 'Back'
  }
  const face = move[0] as CubeFace
  return `${faceNames[face]} ${move.endsWith("'") ? 'counter-clockwise' : 'clockwise'}`
}

const clearFacePreview = () => {
  previewFace.value = null
  previewAngle.value = 0
}

const animateMoveFeedback = (move: CubeMove) => {
  const face = move[0] as CubeFace
  const direction = move.endsWith("'") ? -1 : 1
  activeTurnLabel.value = formatTurnLabel(move)
  previewFace.value = face
  previewAxis.value = faceTurnAxis[face]
  previewAngle.value = direction * 26

  turnNudgeX.value = 0
  turnNudgeY.value = 0
  turnNudgeZ.value = 0

  switch (face) {
    case 'U':
      turnNudgeX.value = -10 * direction
      break
    case 'D':
      turnNudgeX.value = 10 * direction
      break
    case 'R':
      turnNudgeY.value = 12 * direction
      break
    case 'L':
      turnNudgeY.value = -12 * direction
      break
    case 'F':
      turnNudgeZ.value = -12 * direction
      break
    case 'B':
      turnNudgeZ.value = 12 * direction
      break
  }

  window.clearTimeout(turnAnimationTimer)
  turnAnimationTimer = window.setTimeout(() => {
    turnNudgeX.value = 0
    turnNudgeY.value = 0
    turnNudgeZ.value = 0
    clearFacePreview()
    activeTurnLabel.value = ''
  }, 220)
}

const performMove = (move: CubeMove, options: { animate?: boolean } = {}) => {
  if (options.animate !== false) {
    animateMoveFeedback(move)
  }
  cube.value = applyCubeMove(cube.value, move)
  moveHistory.value = [...moveHistory.value, move]
}

const undoLastMove = () => {
  const last = moveHistory.value.at(-1)
  if (!last) return
  cube.value = applyCubeMove(cube.value, invertCubeMove(last))
  moveHistory.value = moveHistory.value.slice(0, -1)
}

const scrambleCube = () => {
  const scramble = generateCubeScramble(20)
  for (const move of scramble) {
    performMove(move, { animate: false })
  }
  clearFacePreview()
  activeTurnLabel.value = ''
}

const resetCube = () => {
  cube.value = createSolvedCube()
  moveHistory.value = []
}

type PointerMode = 'orbit' | 'face' | null

let pointerMode: PointerMode = null
let activePointerId: number | null = null
let activeFace: CubeFace | null = null
let startX = 0
let startY = 0
let startRotationX = viewRotationX.value
let startRotationY = viewRotationY.value

const faceDragMap: Record<CubeFace, { horizontal: [CubeMove, CubeMove]; vertical: [CubeMove, CubeMove] }> = {
  F: { horizontal: ["F'", 'F'], vertical: ["F'", 'F'] },
  B: { horizontal: ['B', "B'"], vertical: ['B', "B'"] },
  R: { horizontal: ["R'", 'R'], vertical: ['R', "R'"] },
  L: { horizontal: ['L', "L'"], vertical: ["L'", 'L'] },
  U: { horizontal: ["U'", 'U'], vertical: ["U'", 'U'] },
  D: { horizontal: ['D', "D'"], vertical: ['D', "D'"] }
}

const resolveFaceMove = (face: CubeFace, dx: number, dy: number) => {
  const map = faceDragMap[face]
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? map.horizontal[0] : map.horizontal[1]
  }
  return dy < 0 ? map.vertical[0] : map.vertical[1]
}

const endPointerInteraction = (preserveFaceAnimation = false) => {
  activePointerId = null
  activeFace = null
  pointerMode = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  if (!preserveFaceAnimation) {
    clearFacePreview()
    activeTurnLabel.value = ''
  }
}

const handlePointerMove = (event: PointerEvent) => {
  if (activePointerId === null || event.pointerId !== activePointerId) return
  if (pointerMode === 'face' && activeFace) {
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    const dominantDelta = Math.abs(dx) >= Math.abs(dy) ? dx : -dy
    previewFace.value = activeFace
    previewAxis.value = faceTurnAxis[activeFace]
    previewAngle.value = Math.max(-34, Math.min(34, dominantDelta * 0.28))
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      activeTurnLabel.value = formatTurnLabel(resolveFaceMove(activeFace, dx, dy))
    }
    return
  }

  if (pointerMode !== 'orbit') return

  const dx = event.clientX - startX
  const dy = event.clientY - startY
  viewRotationY.value = startRotationY + dx * 0.35
  viewRotationX.value = Math.max(-70, Math.min(70, startRotationX - dy * 0.28))
}

const handlePointerUp = (event: PointerEvent) => {
  if (activePointerId === null || event.pointerId !== activePointerId) return

  let triggeredTurn = false
  if (pointerMode === 'face' && activeFace) {
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
      performMove(resolveFaceMove(activeFace, dx, dy))
      triggeredTurn = true
    }
  }

  endPointerInteraction(triggeredTurn)
}

const beginPointerInteraction = (mode: PointerMode, event: PointerEvent, face: CubeFace | null = null) => {
  activePointerId = event.pointerId
  activeFace = face
  pointerMode = mode
  startX = event.clientX
  startY = event.clientY
  startRotationX = viewRotationX.value
  startRotationY = viewRotationY.value
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleStagePointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement
  if (target.closest('.cube-face')) return
  beginPointerInteraction('orbit', event)
}

const handleFacePointerDown = (face: CubeFace, event: PointerEvent) => {
  beginPointerInteraction('face', event, face)
}

onUnmounted(() => {
  window.clearTimeout(turnAnimationTimer)
  endPointerInteraction()
})
</script>

<style scoped>
.cube-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 560px;
  overflow: hidden;
  border-radius: 32px;
  border: 1px dashed rgba(113, 113, 122, 0.4);
  background:
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.92), transparent 24%),
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.42), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #f8fafc 44%, #e0f2fe 100%);
  perspective: 1400px;
}

.cube-stage-note {
  position: absolute;
  left: 1rem;
  top: 1rem;
  z-index: 2;
  border-radius: 999px;
  border: 1px solid rgba(24, 24, 27, 0.12);
  background: rgba(255, 255, 255, 0.78);
  padding: 0.45rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #334155;
}

.cube-turn-badge {
  position: absolute;
  right: 1rem;
  top: 1rem;
  z-index: 2;
  border-radius: 999px;
  border: 1px solid rgba(14, 116, 144, 0.18);
  background: rgba(255, 255, 255, 0.84);
  padding: 0.45rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #0f3d63;
}

.cube-model {
  --cube-depth: 140px;
  position: relative;
  width: 280px;
  height: 280px;
  transform-style: preserve-3d;
  transition: transform 180ms ease;
}

.cube-face {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  width: 280px;
  height: 280px;
  padding: 12px;
  border-radius: 24px;
  background: rgba(24, 24, 27, 0.95);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.14);
  backface-visibility: hidden;
  cursor: grab;
  transition: transform 160ms ease;
}

.cube-face:active {
  cursor: grabbing;
}

.cube-sticker {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.18);
}

.sticker-white { background: #f8fafc; }
.sticker-yellow { background: #fde68a; }
.sticker-orange { background: #fdba74; }
.sticker-red { background: #f87171; }
.sticker-green { background: #86efac; }
.sticker-blue { background: #93c5fd; }

@media (max-width: 640px) {
  .cube-stage {
    min-height: 420px;
  }

  .cube-model {
    --cube-depth: 110px;
    width: 220px;
    height: 220px;
  }

  .cube-face {
    width: 220px;
    height: 220px;
    gap: 6px;
    padding: 10px;
  }
}
</style>
