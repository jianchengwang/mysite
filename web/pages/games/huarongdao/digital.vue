<template>
  <GameShell
    eyebrow="Number Puzzle"
    :title="game?.title || 'Digital Huarongdao'"
    :description="game?.description || ''"
    :highlights="['15-Puzzle', 'Shuffle Logic', 'Move Tracking']"
    :stats="heroStats"
  >
    <section class="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div class="sketch-card !p-4 sm:!p-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Board Status</p>
            <h2 class="text-2xl font-bold text-zinc-900 sm:text-3xl">{{ statusTitle }}</h2>
            <p class="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              Slide numbered tiles into the empty space. Arrange them from 1 to {{ state.size * state.size - 1 }} to win.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="sketch-button px-4 py-2 text-sm !bg-zinc-900 !text-white" @click="shuffleBoard">
              Shuffle
            </button>
            <button class="sketch-button px-4 py-2 text-sm" @click="resetBoard">
              Reset
            </button>
          </div>
        </div>

        <div class="mt-6 rounded-[36px] border-2 border-zinc-900 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] p-4 shadow-[8px_8px_0_0_rgba(0,0,0,0.1)]">
          <div class="mx-auto w-full max-w-[32rem]">
            <div 
              class="digital-board"
              :style="{ 
                gridTemplateColumns: `repeat(${state.size}, 1fr)`,
                gridTemplateRows: `repeat(${state.size}, 1fr)`
              }"
            >
              <button
                v-for="(val, idx) in state.board"
                :key="`${val}-${idx}`"
                class="digital-tile"
                :class="{ 'is-empty': val === 0, 'is-solved': val !== 0 && val === idx + 1 }"
                :disabled="!isMoveLegal(idx)"
                @click="handleTileClick(idx)"
              >
                <span v-if="val !== 0">{{ val }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3 xl:grid-cols-2">
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Grid Size</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button 
                v-for="s in [3, 4, 5, 6, 7, 8]" 
                :key="s"
                class="rounded-full border px-4 py-1 text-sm font-bold transition"
                :class="state.size === s ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 hover:border-zinc-900'"
                @click="changeSize(s)"
              >
                {{ s }}x{{ s }}
              </button>
            </div>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Pattern</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button 
                v-for="p in (['classic', 'snake', 'spiral'] as const)" 
                :key="p"
                class="rounded-full border px-4 py-1 text-sm font-bold transition capitalize"
                :class="state.pattern === p ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 hover:border-zinc-900'"
                @click="changePattern(p)"
              >
                {{ p }}
              </button>
            </div>
          </div>
          <div class="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Goal</p>
            <p class="mt-2 text-sm text-zinc-600">
              Restore the numbers to their specific pattern order.
            </p>
          </div>
        </div>
      </div>

      <aside class="sketch-card !p-5">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Puzzle Info</p>
        <div class="mt-4 space-y-4">
          <div class="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p class="text-sm font-bold text-zinc-900">Classic 15-Puzzle</p>
            <p class="mt-2 text-sm text-zinc-600 leading-relaxed">
              This digital version of Huarongdao focus on numerical order. It was popularised in the 1870s and remains a classic logic challenge.
            </p>
          </div>
          <div class="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p class="text-sm font-bold text-zinc-900">How to Play</p>
            <ul class="mt-2 space-y-2 text-sm text-zinc-600 list-disc pl-4">
              <li>Click tiles adjacent to the empty slot.</li>
              <li>Shuffle to start a new game.</li>
              <li>Track your moves in the header stats.</li>
            </ul>
          </div>
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
  applyDigitalHuarongdaoMove,
  createInitialDigitalHuarongdao,
  getDigitalHuarongdaoLegalMoves,
  isDigitalHuarongdaoSolved,
  shuffleDigitalHuarongdao
} from '~/utils/games/digitalHuarongdao'

definePageMeta({ layout: 'default' })

const game = getGameBySlug('huarongdao/digital')
const state = ref(createInitialDigitalHuarongdao(4))
const isSolved = computed(() => isDigitalHuarongdaoSolved(state.value))

const heroStats = computed(() => [
  { label: 'Moves', value: `${state.value.moves}` },
  { label: 'Size', value: `${state.value.size}x${state.value.size}` },
  { label: 'Status', value: isSolved.value ? 'Solved!' : 'Solving' }
])

const statusTitle = computed(() => {
  if (isSolved.value && state.value.moves > 0) return 'Puzzle Solved!'
  return 'Number Slide'
})

const isMoveLegal = (idx: number) => {
  if (isSolved.value && state.value.moves > 0) return false
  const legalMoves = getDigitalHuarongdaoLegalMoves(state.value)
  return legalMoves.some(m => m.from === idx)
}

const handleTileClick = (idx: number) => {
  const legalMoves = getDigitalHuarongdaoLegalMoves(state.value)
  const move = legalMoves.find(m => m.from === idx)
  if (move) {
    state.value = applyDigitalHuarongdaoMove(state.value, move)
  }
}

const shuffleBoard = () => {
  state.value = shuffleDigitalHuarongdao(state.value)
}

const resetBoard = () => {
  state.value = createInitialDigitalHuarongdao(state.value.size, state.value.pattern)
}

const changeSize = (s: number) => {
  state.value = createInitialDigitalHuarongdao(s, state.value.pattern)
}

const changePattern = (p: any) => {
  state.value = createInitialDigitalHuarongdao(state.value.size, p)
}
</script>

<style scoped>
.digital-board {
  display: grid;
  gap: 12px;
  aspect-ratio: 1 / 1;
  padding: 12px;
  background: #18181b;
  border-radius: 24px;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.4);
}

.digital-tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1.2rem, 3vw, 2rem);
  font-weight: 800;
  color: #18181b;
  background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #18181b;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.1s ease;
  box-shadow: 0 4px 0 0 #d97706;
}

.digital-tile:not(.is-empty):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 0 #d97706;
}

.digital-tile:not(.is-empty):active {
  transform: translateY(2px);
  box-shadow: 0 0 0 0 #d97706;
}

.digital-tile.is-empty {
  background: transparent;
  border: none;
  box-shadow: none;
  cursor: default;
}

.digital-tile.is-solved:not(.is-empty) {
  background: linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%);
  box-shadow: 0 4px 0 0 #16a34a;
}

.digital-tile.is-solved:not(.is-empty):hover {
  box-shadow: 0 6px 0 0 #16a34a;
}

.digital-tile.is-solved:not(.is-empty):active {
  box-shadow: 0 0 0 0 #16a34a;
}

.digital-tile:disabled {
  cursor: default;
}
</style>
