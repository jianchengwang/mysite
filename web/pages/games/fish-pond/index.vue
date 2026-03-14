<template>
  <GameShell
    eyebrow="Slow Fun"
    :title="game?.title || 'Fish Pond'"
    :description="game?.description || ''"
    :highlights="['Whiteboard Save', 'Local Animation', 'Relaxed Loop']"
    :stats="heroStats"
  >
    <section class="sketch-card !p-4 sm:!p-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="space-y-1">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Pond Controls</p>
          <h2 class="text-2xl font-bold text-zinc-900 sm:text-3xl">Draw, save, and let it drift</h2>
          <p class="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            This page is intentionally quiet. Use the whiteboard to sketch a fish, save it, and the pond keeps it swimming in local storage.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="showWhiteboard = true">
            Draw A Fish
          </button>
          <button class="sketch-button px-4 py-2 text-sm" @click="isPaused = !isPaused">
            {{ isPaused ? 'Resume Pond' : 'Pause Pond' }}
          </button>
          <button class="sketch-button border-red-200 px-4 py-2 text-sm text-red-600" :disabled="fishes.length === 0" @click="clearFishes">
            Clear Pond
          </button>
        </div>
      </div>

      <div ref="pondRef" class="pond-shell mt-6">
        <div class="pond-surface" />
        <div class="pond-ripple ripple-one" />
        <div class="pond-ripple ripple-two" />
        <div class="pond-ripple ripple-three" />
        <div class="pond-foam foam-left" />
        <div class="pond-foam foam-right" />

        <div class="pond-status">
          <span>{{ fishes.length }} fish</span>
          <span>{{ isPaused ? 'paused' : 'swimming' }}</span>
          <span>saved locally</span>
        </div>

        <div
          v-for="fish in fishes"
          :key="fish.id"
          class="pond-fish"
          :style="fishStyle(fish)"
        >
          <img :src="fish.image" alt="doodle fish" draggable="false" />
        </div>

        <div v-if="fishes.length === 0" class="empty-pond">
          <p class="text-xl font-bold text-zinc-800">The pond is empty.</p>
          <p class="mt-2 max-w-md text-sm text-zinc-600 sm:text-base">
            Tap <span class="font-bold text-zinc-900">Draw A Fish</span>, sketch something fast, and it will start moving right here.
          </p>
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
            class="absolute left-4 top-4 z-[110] rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-sm font-bold uppercase tracking-[0.14em] text-zinc-800"
            @click="showWhiteboard = false"
          >
            Close
          </button>
          <WhiteboardCanvas
            is-modal
            transparent-export
            @save="handleSaveFish"
          />
        </div>
      </div>
    </Teleport>
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

      const maxX = Math.max(520, (pondRef.value?.clientWidth || 880) - next.size * 0.4)
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
  const size = 96 + Math.round(Math.random() * 64)
  const direction = Math.random() > 0.5 ? 1 : -1
  const speed = (1.4 + Math.random() * 1.2) * direction
  const id = `${Date.now()}-${Math.round(Math.random() * 10000)}`

  fishes.value = [
    ...fishes.value,
    {
      id,
      image,
      x: Math.random() * 760,
      y: 0,
      baseY: 96 + Math.random() * 360,
      speed,
      direction,
      phase: Math.random() * Math.PI * 2,
      size,
      label: `Fish ${fishes.value.length + 1}`
    }
  ].slice(-12)

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
  min-height: 620px;
  overflow: hidden;
  border-radius: 40px;
  border: 2px solid #18181b;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.95), #fcfaf7 100%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  box-shadow: 8px 8px 0 0 rgba(0, 0, 0, 0.12);
}

.pond-surface {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(45deg, rgba(24, 24, 27, 0.02) 0, rgba(24, 24, 27, 0.02) 1px, transparent 1px, transparent 40px),
    repeating-linear-gradient(-45deg, rgba(24, 24, 27, 0.02) 0, rgba(24, 24, 27, 0.02) 1px, transparent 1px, transparent 50px);
}

.pond-status {
  position: absolute;
  left: 1rem;
  top: 1rem;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pond-status span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(24, 24, 27, 0.42);
  background: rgba(255, 255, 255, 0.88);
  padding: 0.35rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #18181b;
}

.pond-ripple {
  position: absolute;
  border-radius: 999px;
  border: 1.5px solid rgba(24, 24, 27, 0.14);
  opacity: 0.9;
}

.ripple-one {
  left: 12%;
  top: 22%;
  width: 220px;
  height: 84px;
  transform: rotate(-3deg);
}

.ripple-two {
  right: 16%;
  bottom: 18%;
  width: 260px;
  height: 90px;
  transform: rotate(2deg);
}

.ripple-three {
  left: 42%;
  bottom: 26%;
  width: 180px;
  height: 64px;
}

.pond-foam {
  position: absolute;
  width: 160px;
  height: 78px;
  border-radius: 999px;
  border: 1px dashed rgba(24, 24, 27, 0.12);
  background: rgba(255, 255, 255, 0.4);
}

.foam-left {
  left: 26px;
  bottom: 28px;
  transform: rotate(12deg);
}

.foam-right {
  right: 32px;
  top: 40px;
  transform: rotate(-8deg);
}

.pond-fish {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: center center;
  will-change: transform;
}

.pond-fish img {
  width: 100%;
  height: auto;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 8px 12px rgba(24, 24, 27, 0.12));
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

@media (max-width: 640px) {
  .pond-shell {
    min-height: 520px;
  }

  .pond-status {
    max-width: calc(100% - 2rem);
  }
}
</style>
