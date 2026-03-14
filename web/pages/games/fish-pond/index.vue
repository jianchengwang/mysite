<template>
  <GameShell
    eyebrow="Slow Fun"
    :title="game?.title || '摸鱼池'"
    :description="game?.description || ''"
    :highlights="['Whiteboard Save', 'Local Animation', 'Low-Stress Toy']"
    :stats="heroStats"
    :controls="[
      '点击 Draw A Fish 打开白板，随手画完直接保存。',
      '导出的手绘鱼会自动透明化并加入池塘动画。',
      '池塘会缓存在当前浏览器，本地摸鱼下次打开还在。'
    ]"
    :notes="[
      '如果想让轮廓更干净，先在白板里用 Crop 再保存。',
      '每条鱼都会带一点随机速度和浮动轨迹，尽量让池面看起来更松弛。',
      '这是一个放空页面，故意保留了慢节奏和一点点不规则。'
    ]"
  >
    <div class="space-y-6">
      <section class="sketch-card space-y-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Pond Controls</p>
            <h2 class="text-2xl font-bold text-zinc-900">白板画完，直接下水</h2>
          </div>
          <div class="flex flex-wrap gap-3">
            <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="showWhiteboard = true">
              Draw A Fish
            </button>
            <button class="sketch-button px-4 py-2 text-sm" @click="isPaused = !isPaused">
              {{ isPaused ? 'Resume Pond' : 'Pause Pond' }}
            </button>
            <button class="sketch-button px-4 py-2 text-sm border-red-200 text-red-600" :disabled="fishes.length === 0" @click="clearFishes">
              Clear Pond
            </button>
          </div>
        </div>

        <div ref="pondRef" class="pond-shell">
          <div class="pond-surface" />
          <div class="pond-ripple ripple-one" />
          <div class="pond-ripple ripple-two" />
          <div class="pond-lily lily-left" />
          <div class="pond-lily lily-right" />

          <div
            v-for="fish in fishes"
            :key="fish.id"
            class="pond-fish"
            :style="fishStyle(fish)"
          >
            <img :src="fish.image" alt="doodle fish" draggable="false" />
          </div>

          <div v-if="fishes.length === 0" class="empty-pond">
            <p class="text-lg font-bold text-zinc-800">池塘还没有鱼。</p>
            <p class="mt-2 text-sm text-zinc-500">点上面的 `Draw A Fish`，随手画一条就会自己游起来。</p>
          </div>
        </div>
      </section>

      <section class="sketch-card">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Fish Notes</p>
            <h3 class="text-2xl font-bold text-zinc-900">池里现在有什么</h3>
          </div>
          <p class="text-sm text-zinc-500">{{ fishes.length }} doodles</p>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="fish in fishes"
            :key="`${fish.id}-card`"
            class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-700"
          >
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{{ fish.label }}</p>
            <p class="mt-1 font-bold text-zinc-900">{{ fish.direction > 0 ? 'Swimming right' : 'Swimming left' }}</p>
            <p class="mt-1 text-xs text-zinc-500">Speed {{ Math.abs(fish.speed).toFixed(2) }} · Scale {{ fish.size }}px</p>
          </div>
          <div
            v-if="fishes.length === 0"
            class="rounded-[24px] border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500"
          >
            摸鱼也可以很认真，但这个页面更希望你随手画、随手放。
          </div>
        </div>
      </section>

      <Teleport to="body">
        <div
          v-if="showWhiteboard"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          @click.self="showWhiteboard = false"
        >
          <div class="relative h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border-2 border-zinc-900 bg-white shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
            <button
              class="absolute right-4 top-4 z-[110] rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-lg font-bold text-zinc-800"
              @click="showWhiteboard = false"
            >
              ×
            </button>
            <WhiteboardCanvas
              is-modal
              transparent-export
              @save="handleSaveFish"
            />
          </div>
        </div>
      </Teleport>
    </div>
  </GameShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GameShell from '~/components/games/GameShell.vue'
import WhiteboardCanvas from '~/components/WhiteboardCanvas.vue'
import { getGameBySlug } from '~/utils/games/catalog'

definePageMeta({ layout: 'default' })

type PondFish = {
  id: string
  image: string
  x: number
  y: number
  baseY: number
  speed: number
  direction: number
  phase: number
  size: number
  label: string
}

const STORAGE_KEY = 'games_fish_pond_items'
const game = getGameBySlug('fish-pond')
const fishes = ref<PondFish[]>([])
const showWhiteboard = ref(false)
const isPaused = ref(false)
const pondRef = ref<HTMLElement | null>(null)
let animationFrame = 0
let lastTick = 0

const heroStats = computed(() => [
  { label: 'Fish Count', value: `${fishes.value.length}` },
  { label: 'Pond State', value: isPaused.value ? 'Paused' : 'Swimming' },
  { label: 'Storage', value: 'Local Browser' }
])

const fishStyle = (fish: PondFish) => {
  const bob = Math.sin(fish.phase) * 12
  const scaleX = fish.direction > 0 ? 1 : -1
  return {
    width: `${fish.size}px`,
    transform: `translate(${fish.x}px, ${fish.baseY + bob}px) scaleX(${scaleX}) rotate(${Math.sin(fish.phase * 0.5) * 3}deg)`
  }
}

const persistFishes = () => {
  if (!import.meta.client) return
  const payload = fishes.value.map(({ id, image, x, y, baseY, speed, direction, phase, size, label }) => ({
    id,
    image,
    x,
    y,
    baseY,
    speed,
    direction,
    phase,
    size,
    label
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const animate = (timestamp: number) => {
  if (!lastTick) lastTick = timestamp
  const delta = Math.min(40, timestamp - lastTick)
  lastTick = timestamp

  if (!isPaused.value) {
    fishes.value = fishes.value.map((fish) => {
      const next = { ...fish }
      next.phase += delta * 0.0025
      next.x += next.speed * (delta / 16)
      next.y = next.baseY

      const maxX = Math.max(420, (pondRef.value?.clientWidth || 720) - next.size * 0.4)
      if (next.x > maxX) {
        next.x = maxX
        next.speed *= -1
        next.direction = -1
      }
      if (next.x < -next.size * 0.55) {
        next.x = -next.size * 0.55
        next.speed *= -1
        next.direction = 1
      }
      return next
    })
  }

  animationFrame = window.requestAnimationFrame(animate)
}

const handleSaveFish = (image: string) => {
  const size = 92 + Math.round(Math.random() * 56)
  const direction = Math.random() > 0.5 ? 1 : -1
  const speed = (1.4 + Math.random() * 1.2) * direction
  const id = `${Date.now()}-${Math.round(Math.random() * 10000)}`

  fishes.value = [
    ...fishes.value,
    {
      id,
      image,
      x: Math.random() * 620,
      y: 0,
      baseY: 80 + Math.random() * 260,
      speed,
      direction,
      phase: Math.random() * Math.PI * 2,
      size,
      label: `Fish ${fishes.value.length + 1}`
    }
  ].slice(-10)

  showWhiteboard.value = false
  persistFishes()
}

const clearFishes = () => {
  fishes.value = []
  persistFishes()
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      fishes.value = JSON.parse(saved)
    } catch {
      fishes.value = []
    }
  }
  animationFrame = window.requestAnimationFrame(animate)
})

onUnmounted(() => {
  persistFishes()
  window.cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
.pond-shell {
  position: relative;
  min-height: 460px;
  overflow: hidden;
  border-radius: 36px;
  border: 2px solid #18181b;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.9), transparent 22%),
    radial-gradient(circle at 80% 12%, rgba(255, 255, 255, 0.56), transparent 18%),
    linear-gradient(180deg, #e0f2fe 0%, #bae6fd 35%, #7dd3fc 100%);
  box-shadow: 8px 8px 0 0 rgba(0, 0, 0, 0.12);
}

.pond-surface {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent 22%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0, rgba(255, 255, 255, 0.08) 2px, transparent 2px, transparent 54px);
  opacity: 0.8;
}

.pond-ripple {
  position: absolute;
  border-radius: 999px;
  border: 2px dashed rgba(255, 255, 255, 0.44);
}

.ripple-one {
  left: 12%;
  top: 18%;
  width: 180px;
  height: 64px;
}

.ripple-two {
  right: 14%;
  bottom: 18%;
  width: 220px;
  height: 72px;
}

.pond-lily {
  position: absolute;
  border-radius: 999px 999px 999px 120px;
  background: linear-gradient(135deg, #86efac 0%, #22c55e 100%);
  border: 2px solid rgba(21, 128, 61, 0.42);
}

.lily-left {
  left: 36px;
  bottom: 30px;
  width: 110px;
  height: 74px;
  transform: rotate(-12deg);
}

.lily-right {
  right: 54px;
  top: 42px;
  width: 84px;
  height: 58px;
  transform: rotate(18deg);
}

.pond-fish {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: center center;
  transition: filter 180ms ease;
  will-change: transform;
}

.pond-fish img {
  width: 100%;
  height: auto;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 10px 12px rgba(8, 47, 73, 0.16));
}

.empty-pond {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}
</style>
