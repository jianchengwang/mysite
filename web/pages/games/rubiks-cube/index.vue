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

const faceTurnAxis: Record<CubeFace, 'x' | 'y' | 'z'> = {
  U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z'
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
const cubeTransform = computed(
  () => `rotateX(${viewRotationX.value}deg) rotateY(${viewRotationY.value}deg)`
)

const stickerClass = (color: StickerColor) => `sticker-${color}`

const cubieStyle = (cubie: any) => {
  const { x, y, z } = cubie.position
  const transforms = [`translate3d(calc(${x} * var(--cubie-size)), calc(${-y} * var(--cubie-size)), calc(${z} * var(--cubie-size)))`]

  // Apply either the active animation or the current drag preview
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

const handleStickerPointerDown = (side: string, cubie: any, event: PointerEvent) => {
  const sideToFace: Record<string, CubeFace> = {
    py: 'U', ny: 'D', px: 'R', nx: 'L', pz: 'F', nz: 'B'
  }
  activeCubie = cubie
  beginPointerInteraction('face', event, sideToFace[side])
}

const performMove = (move: CubeMove, options: { animate?: boolean } = {}) => {
  if (options.animate !== false) {
    const face = move[0] as CubeFace
    const axis = faceTurnAxis[face]
    const layer = face === 'U' || face === 'R' || face === 'F' ? 1 : -1
    const direction = move.endsWith("'") ? -1 : 1
    
    // Fix direction mapping for certain faces/axes if needed based on moveDefinitions
    // In utils: U: axis y, layer 1, turns -1. So direction 1 should be -90deg? 
    // Actually, let's just use the move definition for the animation direction
    const moveDefinitions: any = {
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
    const def = moveDefinitions[move]

    activeTurnLabel.value = formatTurnLabel(move)
    turningAxis.value = def.axis
    turningLayer.value = def.layer
    turningAngle.value = 0

    const start = performance.now()
    const duration = 200

    const animate = (time: number) => {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
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

let pointerMode: PointerMode = null
let activePointerId: number | null = null
let activeFace: CubeFace | null = null
let activeCubie: any = null
let startX = 0
let startY = 0
let startRotationX = viewRotationX.value
let startRotationY = viewRotationY.value

const resolveFaceMove = (face: CubeFace, cubie: any, dx: number, dy: number): CubeMove | null => {
  if (!cubie) return null
  const { x, y, z } = cubie.position
  const absX = Math.abs(dx), absY = Math.abs(dy)
  const threshold = 15
  if (Math.max(absX, absY) < threshold) return null

  // We use the current view rotations to adjust how dx and dy map to cube moves.
  // This ensures that dragging "right" on the screen always feels like moving the layer "right".
  const rotY = viewRotationY.value
  const normalizedY = ((rotY % 360) + 360) % 360
  
  // Determine which face is "facing" where
  // Simplified logic: adjust dx/dy based on which quadrant of Y rotation we are in.
  let adjDx = dx
  let adjDy = dy

  if (face === 'F') {
    if (absX >= absY) {
      if (y === 1) return dx > 0 ? "U'" : 'U'
      if (y === -1) return dx > 0 ? 'D' : "D'"
      if (y === 0) return dx > 0 ? "E" : "E'" // E is not in buttons but we can add or map
    } else {
      if (x === 1) return dy < 0 ? 'R' : "R'"
      if (x === -1) return dy < 0 ? "L'" : 'L'
    }
  } else if (face === 'R') {
    if (absX >= absY) {
      // When looking at Right face, "Right" drag depends on if it's pointing towards or away from us
      // But usually dx > 0 should still be a clockwise-ish turn around Y
      if (y === 1) return dx > 0 ? 'U' : "U'"
      if (y === -1) return dx > 0 ? "D'" : 'D'
    } else {
      if (z === 1) return dy < 0 ? "F'" : 'F'
      if (z === -1) return dy < 0 ? 'B' : "B'"
    }
  } else if (face === 'U') {
    // Top face dragging is most sensitive to Y rotation
    const angle = (rotY % 360 + 360) % 360
    if (absX >= absY) {
      // Horizontal drag on top face
      if (angle < 45 || angle >= 315) { // Facing Front
        if (z === -1) return dx > 0 ? 'B' : "B'"
        if (z === 1) return dx > 0 ? "F'" : 'F'
      } else if (angle >= 45 && angle < 135) { // Facing Right
        if (x === 1) return dx > 0 ? 'R' : "R'"
        if (x === -1) return dx > 0 ? "L'" : 'L'
      } else if (angle >= 135 && angle < 225) { // Facing Back
        if (z === 1) return dx > 0 ? 'F' : "F'"
        if (z === -1) return dx > 0 ? "B'" : 'B'
      } else { // Facing Left
        if (x === -1) return dx > 0 ? "L'" : 'L'
        if (x === 1) return dx > 0 ? 'R' : "R'"
      }
    } else {
      // Vertical drag on top face
      if (angle < 45 || angle >= 315) { // Facing Front
        if (x === -1) return dy < 0 ? "L'" : 'L'
        if (x === 1) return dy < 0 ? 'R' : "R'"
      } else if (angle >= 45 && angle < 135) { // Facing Right
        if (z === 1) return dy < 0 ? 'F' : "F'"
        if (z === -1) return dy < 0 ? 'B' : "B'"
      } else if (angle >= 135 && angle < 225) { // Facing Back
        if (x === 1) return dy < 0 ? "R'" : 'R'
        if (x === -1) return dy < 0 ? 'L' : "L'"
      } else { // Facing Left
        if (z === -1) return dy < 0 ? "B'" : 'B'
        if (z === 1) return dy < 0 ? 'F' : "F'"
      }
    }
  } else if (face === 'L') {
    if (absX >= absY) {
      if (y === 1) return dx > 0 ? "U'" : 'U'
      if (y === -1) return dx > 0 ? 'D' : "D'"
    } else {
      if (z === 1) return dy < 0 ? 'F' : "F'"
      if (z === -1) return dy < 0 ? "B'" : 'B'
    }
  } else if (face === 'D') {
    if (absX >= absY) {
      if (z === 1) return dx > 0 ? 'F' : "F'"
      if (z === -1) return dx > 0 ? "B'" : 'B'
    } else {
      if (x === -1) return dy < 0 ? 'L' : "L'"
      if (x === 1) return dy < 0 ? "R'" : 'R'
    }
  } else if (face === 'B') {
    if (absX >= absY) {
      if (y === 1) return dx > 0 ? 'U' : "U'"
      if (y === -1) return dx > 0 ? "D'" : 'D'
    } else {
      if (x === 1) return dy < 0 ? "R'" : 'R'
      if (x === -1) return dy < 0 ? 'L' : "L'"
    }
  }
  return null
}

const endPointerInteraction = (preserveFaceAnimation = false) => {
  activePointerId = null
  activeFace = null
  activeCubie = null
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
    const move = resolveFaceMove(activeFace, activeCubie, dx, dy)
    
    if (move) {
      const moveDefinitions: any = {
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
      const def = moveDefinitions[move]
      const dominantDelta = Math.abs(dx) >= Math.abs(dy) ? dx : -dy
      
      previewFace.value = activeFace
      previewAxis.value = def.axis
      previewLayer.value = def.layer
      previewAngle.value = def.turns * Math.max(0, Math.min(34, Math.abs(dominantDelta) * 0.45))
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
    const move = resolveFaceMove(activeFace, activeCubie, dx, dy)
    if (move && Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
      performMove(move)
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
