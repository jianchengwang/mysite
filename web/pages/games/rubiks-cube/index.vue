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
              v-for="cubie in cube.cubies"
              :key="cubie.id"
              class="cubie"
              :style="cubieStyle(cubie)"
            >
              <div
                v-for="(color, side) in cubie.stickers"
                :key="side"
                class="cubie-sticker"
                :class="[side, stickerClass(color)]"
                @pointerdown.stop="handleStickerPointerDown(side, cubie, $event)"
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
const viewRotationX = ref(-26)
const viewRotationY = ref(34)
const activeTurnLabel = ref('')
const moveHistory = ref<CubeMove[]>([])

const moveDefinitions: Record<CubeMove, { axis: 'x' | 'y' | 'z'; layer: number; turns: 1 | -1 }> = {
  U: { axis: 'y', layer: 1, turns: -1 },
  "U'": { axis: 'y', layer: 1, turns: 1 },
  D: { axis: 'y', layer: -1, turns: 1 },
  "D'": { axis: 'y', layer: -1, turns: -1 },
  L: { axis: 'x', layer: -1, turns: 1 },
  "L'": { axis: 'x', layer: -1, turns: -1 },
  R: { axis: 'x', layer: 1, turns: -1 },
  "R'": { axis: 'x', layer: 1, turns: 1 },
  F: { axis: 'z', layer: 1, turns: -1 },
  "F'": { axis: 'z', layer: 1, turns: 1 },
  B: { axis: 'z', layer: -1, turns: 1 },
  "B'": { axis: 'z', layer: -1, turns: -1 }
}

const faceDragMap: Record<CubeFace, { horizontal: [CubeMove, CubeMove]; vertical: [CubeMove, CubeMove] }> = {
  F: { horizontal: ["F'", 'F'], vertical: ["F'", 'F'] },
  B: { horizontal: ['B', "B'"], vertical: ['B', "B'"] },
  R: { horizontal: ["R'", 'R'], vertical: ['R', "R'"] },
  L: { horizontal: ['L', "L'"], vertical: ["L'", 'L'] },
  U: { horizontal: ["U'", 'U'], vertical: ["U'", 'U'] },
  D: { horizontal: ['D', "D'"], vertical: ['D', "D'"] }
}

const formatTurnLabel = (move: CubeMove) => {
  const faceNames: Record<CubeFace, string> = {
    U: 'Top', D: 'Bottom', L: 'Left', R: 'Right', F: 'Front', B: 'Back'
  }
  const face = move[0] as CubeFace
  return `${faceNames[face]} ${move.endsWith("'") ? 'counter-clockwise' : 'clockwise'}`
}

// For the "live" turning effect
const turningLayer = ref<number | null>(null)
const turningAxis = ref<'x' | 'y' | 'z' | null>(null)
const turningAngle = ref(0)

// For the drag preview
const previewFace = ref<CubeFace | null>(null)
const previewAxis = ref<'x' | 'y' | 'z' | null>(null)
const previewLayer = ref<number | null>(null)
const previewAngle = ref(0)
const previewMove = ref<CubeMove | null>(null)

const clearFacePreview = () => {
  previewFace.value = null
  previewAxis.value = null
  previewLayer.value = null
  previewAngle.value = 0
  previewMove.value = null
}

const guide = computed(() => getCubeGuide(cube.value, moveHistory.value))
const currentGuideStep = computed(() => {
  const match = guide.value.title.match(/^Step\s+(\d+)/i)
  return match ? Number(match[1]) : 0
})
const heroStats = computed(() => [
  { label: 'Solved Faces', value: `${countSolvedFaces(cube.value)}/6` },
  { label: 'Solved Stickers', value: `${countSolvedStickers(cube.value)}/54` },
  { label: 'Moves', value: String(moveHistory.value.length) }
])
const cubeTransform = computed(
  () => `rotateX(${viewRotationX.value}deg) rotateY(${viewRotationY.value}deg)`
)

const stickerClass = (color: StickerColor) => `sticker-${color}`

const cubieStyle = (cubie: any) => {
  const { x, y, z } = cubie.position
  const transforms = [`translate3d(calc(${x} * var(--cubie-size)), calc(${-y} * var(--cubie-size)), calc(${z} * var(--cubie-size)))`]

  const axis = turningAxis.value || previewAxis.value
  const layer = turningLayer.value ?? previewLayer.value
  
  if (axis && cubie.position[axis] === layer) {
    const angle = turningAngle.value || previewAngle.value
    transforms.unshift(`rotate${axis.toUpperCase()}(${angle}deg)`)
  }

  return {
    transform: transforms.join(' ')
  }
}

const handleStickerPointerDown = (side: string, _cubie: any, event: PointerEvent) => {
  if (turningAxis.value) return
  const sideToFace: Record<string, CubeFace> = {
    py: 'U', ny: 'D', px: 'R', nx: 'L', pz: 'F', nz: 'B'
  }
  beginPointerInteraction('face', event, sideToFace[side])
}

const performMove = (move: CubeMove, options: { animate?: boolean } = {}) => {
  if (turningAxis.value) return
  if (options.animate !== false) {
    const def = moveDefinitions[move]

    activeTurnLabel.value = formatTurnLabel(move)
    turningAxis.value = def.axis
    turningLayer.value = def.layer
    turningAngle.value = 0

    const start = performance.now()
    const duration = 160 // Slightly faster for smoother feel

    const animate = (time: number) => {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
      turningAngle.value = def.turns * 90 * ease

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        cube.value = applyCubeMove(cube.value, move)
        moveHistory.value = [...moveHistory.value, move]
        turningAxis.value = null
        turningLayer.value = null
        turningAngle.value = 0
        activeTurnLabel.value = ''
      }
    }
    requestAnimationFrame(animate)
  } else {
    cube.value = applyCubeMove(cube.value, move)
    moveHistory.value = [...moveHistory.value, move]
  }
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
type FaceDragAxis = 'horizontal' | 'vertical' | null

const FACE_PREVIEW_THRESHOLD = 18
const FACE_COMMIT_THRESHOLD = 38
const FACE_AXIS_LOCK_RATIO = 1.3
const FACE_AXIS_LOCK_GAP = 9

let pointerMode: PointerMode = null
let activePointerId: number | null = null
let activeFace: CubeFace | null = null
let activePointerTarget: HTMLElement | null = null
let lockedFaceDragAxis: FaceDragAxis = null
let startX = 0
let startY = 0
let startRotationX = viewRotationX.value
let startRotationY = viewRotationY.value

const detectFaceDragAxis = (dx: number, dy: number): FaceDragAxis => {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  const maxDistance = Math.max(absX, absY)
  const minDistance = Math.min(absX, absY)

  if (maxDistance < FACE_PREVIEW_THRESHOLD) return null
  if (maxDistance < minDistance * FACE_AXIS_LOCK_RATIO) return null
  if (maxDistance - minDistance < FACE_AXIS_LOCK_GAP) return null

  return absX >= absY ? 'horizontal' : 'vertical'
}

const resolveFaceMove = (face: CubeFace, dx: number, dy: number, axisOverride: FaceDragAxis = null): CubeMove | null => {
  const mapping = faceDragMap[face]
  const axis = axisOverride || detectFaceDragAxis(dx, dy)
  if (!axis) return null

  if (axis === 'horizontal') {
    return dx < 0 ? mapping.horizontal[0] : mapping.horizontal[1]
  }
  return dy < 0 ? mapping.vertical[0] : mapping.vertical[1]
}

const endPointerInteraction = (preserveFaceAnimation = false) => {
  if (activePointerTarget && activePointerId !== null && activePointerTarget.hasPointerCapture?.(activePointerId)) {
    activePointerTarget.releasePointerCapture(activePointerId)
  }
  activePointerTarget = null
  activePointerId = null
  activeFace = null
  pointerMode = null
  lockedFaceDragAxis = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
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
    if (!lockedFaceDragAxis) {
      lockedFaceDragAxis = detectFaceDragAxis(dx, dy)
    }
    const move = resolveFaceMove(activeFace, dx, dy, lockedFaceDragAxis)

    if (move) {
      const def = moveDefinitions[move]
      const dominantDelta = lockedFaceDragAxis === 'vertical' ? dy : dx
      const previewTravel = Math.max(0, Math.abs(dominantDelta) - FACE_PREVIEW_THRESHOLD)

      previewFace.value = activeFace
      previewAxis.value = def.axis
      previewLayer.value = def.layer
      previewAngle.value = def.turns * Math.max(0, Math.min(42, previewTravel * 0.5))
      previewMove.value = move
      activeTurnLabel.value = formatTurnLabel(move)
    } else {
      clearFacePreview()
      activeTurnLabel.value = ''
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
    const move = resolveFaceMove(activeFace, dx, dy, lockedFaceDragAxis)
    const commitDistance = lockedFaceDragAxis === 'vertical' ? Math.abs(dy) : Math.abs(dx)
    if (move && commitDistance >= FACE_COMMIT_THRESHOLD) {
      performMove(move)
      triggeredTurn = true
    }
  }

  endPointerInteraction(triggeredTurn)
}

const beginPointerInteraction = (mode: PointerMode, event: PointerEvent, face: CubeFace | null = null) => {
  const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  activePointerId = event.pointerId
  activeFace = face
  activePointerTarget = target
  pointerMode = mode
  lockedFaceDragAxis = null
  startX = event.clientX
  startY = event.clientY
  startRotationX = viewRotationX.value
  startRotationY = viewRotationY.value
  target?.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

const handleStagePointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement
  if (turningAxis.value || target.closest('.cubie-sticker')) return
  beginPointerInteraction('orbit', event)
}

onUnmounted(() => {
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
  touch-action: none;
  user-select: none;
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
  --cubie-size: 94px;
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

.cubie {
  position: absolute;
  width: 90px;
  height: 90px;
  transform-style: preserve-3d;
  left: -45px;
  top: -45px;
}

.cubie-sticker {
  position: absolute;
  width: 84px;
  height: 84px;
  border-radius: 12px;
  border: 4px solid #18181b;
  backface-visibility: hidden;
  cursor: grab;
  touch-action: none;
}

.cubie-sticker:active {
  cursor: grabbing;
}

.cubie-sticker.py { transform: rotateX(90deg) translateZ(45px); }
.cubie-sticker.ny { transform: rotateX(-90deg) translateZ(45px); }
.cubie-sticker.px { transform: rotateY(90deg) translateZ(45px); }
.cubie-sticker.nx { transform: rotateY(-90deg) translateZ(45px); }
.cubie-sticker.pz { transform: translateZ(45px); }
.cubie-sticker.nz { transform: rotateY(180deg) translateZ(45px); }

.sticker-white { background: #f8fafc; }
.sticker-yellow { background: #fde68a; }
.sticker-orange { background: #fdba74; }
.sticker-red { background: #f87171; }
.sticker-green { background: #86efac; }
.sticker-blue { background: #93c5fd; }

@media (max-width: 640px) {
  .cube-model {
    --cubie-size: 70px;
  }
  .cubie {
    width: 66px;
    height: 66px;
    left: -33px;
    top: -33px;
  }
  .cubie-sticker {
    width: 60px;
    height: 60px;
  }
  .cubie-sticker.py { transform: rotateX(90deg) translateZ(33px); }
  .cubie-sticker.ny { transform: rotateX(-90deg) translateZ(33px); }
  .cubie-sticker.px { transform: rotateY(90deg) translateZ(33px); }
  .cubie-sticker.nx { transform: rotateY(-90deg) translateZ(33px); }
  .cubie-sticker.pz { transform: translateZ(33px); }
  .cubie-sticker.nz { transform: rotateY(180deg) translateZ(33px); }
}
</style>
