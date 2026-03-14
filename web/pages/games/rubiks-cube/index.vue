<template>
  <GameShell
    eyebrow="3D Practice"
    :title="game?.title || '3D 魔方'"
    :description="game?.description || ''"
    :highlights="['3D View', 'True Cubie State', 'Beginner Guide']"
    :stats="heroStats"
    :controls="[
      '拖拽舞台可以旋转观察视角。',
      '点击下面的 U / R / F 等按钮操作对应面，撇号表示逆时针。',
      'Hint 会给出当前阶段建议，同时提供一个可靠的回退下一步。'
    ]"
    :notes="[
      '当前提示以新手分阶段方法为主，适合学习“先做哪一层”。',
      'Next rewind move 总能把你往已知路径的上一步带回去，适合卡住时退一步再看。',
      '如果只是想重新来一盘，直接用 Scramble 或 Reset 会更轻松。'
    ]"
  >
    <div class="space-y-6">
      <section class="sketch-card space-y-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Cube Controls</p>
            <h2 class="text-2xl font-bold text-zinc-900">立体魔方实验台</h2>
          </div>

          <div class="flex flex-wrap gap-3">
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

        <div class="grid gap-5 xl:grid-cols-[1.2fr_0.88fr]">
          <div class="rounded-[32px] border-2 border-zinc-900 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]">
            <div
              class="cube-stage"
              @pointerdown="handlePointerDown"
            >
              <div class="cube-model" :style="{ transform: `rotateX(${viewRotationX}deg) rotateY(${viewRotationY}deg)` }">
                <div
                  v-for="face in faceOrder"
                  :key="face"
                  class="cube-face"
                  :class="`face-${face.toLowerCase()}`"
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

            <div class="mt-4 rounded-[26px] border border-dashed border-zinc-300 bg-white px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Current Hint</p>
              <p class="mt-2 text-2xl font-bold text-zinc-900">{{ guide.title }}</p>
              <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ guide.detail }}</p>
              <p class="mt-3 inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm font-bold text-zinc-800">
                {{ guide.nextMove ? `Next rewind move: ${guide.nextMove}` : 'No rewind needed' }}
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Moves</p>
              <div class="mt-3 grid grid-cols-4 gap-2">
                <button
                  v-for="move in cubeMoveButtons"
                  :key="move"
                  class="rounded-[18px] border border-zinc-300 bg-white px-3 py-3 text-sm font-bold text-zinc-800 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,0.16)]"
                  @click="performMove(move)"
                >
                  {{ move }}
                </button>
              </div>
            </div>

            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-white px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Recent Sequence</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="(move, index) in recentMoves"
                  :key="`${move}-${index}`"
                  class="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm font-bold text-zinc-800"
                >
                  {{ move }}
                </span>
                <span v-if="recentMoves.length === 0" class="text-sm text-zinc-500">还没开始转动。</span>
              </div>
            </div>

            <div class="rounded-[28px] border border-dashed border-zinc-300 bg-white px-4 py-4">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">View</p>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <label class="space-y-2">
                  <span class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Rotate X</span>
                  <input v-model.number="viewRotationX" type="range" min="-65" max="65" class="w-full accent-zinc-700" />
                </label>
                <label class="space-y-2">
                  <span class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Rotate Y</span>
                  <input v-model.number="viewRotationY" type="range" min="-180" max="180" class="w-full accent-zinc-700" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div class="sketch-card">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Beginner Method</p>
          <div class="mt-4 space-y-3">
            <div
              v-for="(step, index) in cubeTutorialSteps"
              :key="step"
              class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700"
            >
              <p class="font-bold text-zinc-900">Step {{ index + 1 }}</p>
              <p class="mt-1">{{ step }}</p>
            </div>
          </div>
        </div>

        <div class="sketch-card">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">State Snapshot</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              v-for="face in faceOrder"
              :key="`${face}-mini`"
              class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3"
            >
              <p class="mb-3 text-sm font-bold text-zinc-900">{{ face }}</p>
              <div class="grid grid-cols-3 gap-1">
                <div
                  v-for="(color, index) in faceMap[face]"
                  :key="`${face}-${index}-mini`"
                  class="h-5 rounded-md border border-zinc-300"
                  :class="stickerClass(color)"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
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
const viewRotationX = ref(-24)
const viewRotationY = ref(34)
const faceOrder: CubeFace[] = ['U', 'F', 'R', 'L', 'B', 'D']

const faceMap = computed<Record<CubeFace, StickerColor[]>>(() => ({
  U: getCubeFace(cube.value, 'U'),
  F: getCubeFace(cube.value, 'F'),
  R: getCubeFace(cube.value, 'R'),
  L: getCubeFace(cube.value, 'L'),
  B: getCubeFace(cube.value, 'B'),
  D: getCubeFace(cube.value, 'D')
}))

const guide = computed(() => getCubeGuide(cube.value, moveHistory.value))
const recentMoves = computed(() => moveHistory.value.slice(-12))
const heroStats = computed(() => [
  { label: 'Solved Faces', value: `${countSolvedFaces(cube.value)} / 6` },
  { label: 'Solved Stickers', value: `${countSolvedStickers(cube.value)} / 54` },
  { label: 'Status', value: isCubeSolved(cube.value) ? 'Solved' : 'In Practice' }
])

const stickerClass = (color: StickerColor) => `sticker-${color}`

const performMove = (move: CubeMove) => {
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
    performMove(move)
  }
}

const resetCube = () => {
  cube.value = createSolvedCube()
  moveHistory.value = []
}

let pointerId: number | null = null
let startX = 0
let startY = 0
let startRotationX = viewRotationX.value
let startRotationY = viewRotationY.value

const handlePointerMove = (event: PointerEvent) => {
  if (pointerId === null || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  viewRotationY.value = startRotationY + dx * 0.35
  viewRotationX.value = Math.max(-70, Math.min(70, startRotationX - dy * 0.28))
}

const handlePointerUp = (event: PointerEvent) => {
  if (pointerId === null || event.pointerId !== pointerId) return
  pointerId = null
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
}

const handlePointerDown = (event: PointerEvent) => {
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  startRotationX = viewRotationX.value
  startRotationY = viewRotationY.value
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
})
</script>

<style scoped>
.cube-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 360px;
  overflow: hidden;
  border-radius: 28px;
  border: 1px dashed rgba(113, 113, 122, 0.4);
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.9), transparent 26%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  perspective: 1200px;
  cursor: grab;
}

.cube-stage:active {
  cursor: grabbing;
}

.cube-model {
  position: relative;
  width: 200px;
  height: 200px;
  transform-style: preserve-3d;
  transition: transform 180ms ease;
}

.cube-face {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  width: 200px;
  height: 200px;
  padding: 10px;
  border-radius: 20px;
  background: rgba(24, 24, 27, 0.94);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.14);
  backface-visibility: hidden;
}

.cube-sticker {
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.18);
}

.face-f { transform: rotateY(0deg) translateZ(100px); }
.face-b { transform: rotateY(180deg) translateZ(100px); }
.face-r { transform: rotateY(90deg) translateZ(100px); }
.face-l { transform: rotateY(-90deg) translateZ(100px); }
.face-u { transform: rotateX(90deg) translateZ(100px); }
.face-d { transform: rotateX(-90deg) translateZ(100px); }

.sticker-white { background: #f8fafc; }
.sticker-yellow { background: #fde68a; }
.sticker-orange { background: #fdba74; }
.sticker-red { background: #f87171; }
.sticker-green { background: #86efac; }
.sticker-blue { background: #93c5fd; }
</style>
