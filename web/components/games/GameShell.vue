<template>
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
    <section class="sketch-card overflow-hidden !p-0">
      <div class="grid gap-6 bg-[linear-gradient(135deg,#ffffff_0%,#fafaf9_58%,#f1f5f9_100%)] px-6 py-8 sm:px-8 lg:grid-cols-[1.7fr_0.9fr]">
        <div class="space-y-4">
          <NuxtLink to="/games" class="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900">
            ← Back to Games
          </NuxtLink>
          <div class="space-y-2">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">{{ eyebrow }}</p>
            <h1 class="text-4xl font-bold text-zinc-900 sm:text-5xl">{{ title }}</h1>
            <p class="max-w-3xl text-lg leading-relaxed text-zinc-600 sm:text-xl">{{ description }}</p>
          </div>
          <div v-if="highlights.length" class="flex flex-wrap gap-2">
            <span
              v-for="highlight in highlights"
              :key="highlight"
              class="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-1 text-sm font-bold text-zinc-700"
            >
              {{ highlight }}
            </span>
          </div>
        </div>

        <div class="sketch-border bg-white/80 p-4">
          <div class="space-y-3">
            <div v-for="stat in stats" :key="stat.label" class="rounded-3xl border border-dashed border-zinc-300 px-4 py-3">
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{{ stat.label }}</p>
              <p class="mt-1 text-lg font-bold text-zinc-900">{{ stat.value }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_340px]">
      <div class="min-w-0">
        <slot />
      </div>

      <div class="space-y-6">
        <div v-if="controls.length" class="sketch-card">
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Controls</p>
          <ul class="space-y-3 text-sm text-zinc-600">
            <li v-for="control in controls" :key="control" class="rounded-3xl border border-dashed border-zinc-300 px-4 py-3">
              {{ control }}
            </li>
          </ul>
        </div>

        <div v-if="notes.length" class="sketch-card">
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Notes</p>
          <ul class="space-y-3 text-sm text-zinc-600">
            <li v-for="note in notes" :key="note" class="rounded-3xl border border-dashed border-zinc-300 px-4 py-3">
              {{ note }}
            </li>
          </ul>
        </div>

        <slot name="sidebar" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type GameStat = {
  label: string
  value: string
}

withDefaults(defineProps<{
  eyebrow: string
  title: string
  description: string
  stats?: GameStat[]
  highlights?: string[]
  controls?: string[]
  notes?: string[]
}>(), {
  stats: () => [],
  highlights: () => [],
  controls: () => [],
  notes: () => []
})
</script>
