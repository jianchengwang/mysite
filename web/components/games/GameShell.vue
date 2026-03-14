<template>
  <div class="mx-auto flex w-full max-w-[110rem] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <section class="sketch-card overflow-hidden bg-[linear-gradient(140deg,#ffffff_0%,#fafaf9_58%,#eff6ff_100%)]">
      <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0 space-y-4">
          <NuxtLink to="/games" class="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900">
            ← Back to Games
          </NuxtLink>
          <div class="space-y-2">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">{{ eyebrow }}</p>
            <h1 class="text-3xl font-bold text-zinc-900 sm:text-4xl lg:text-5xl">{{ title }}</h1>
            <p class="max-w-4xl text-base leading-relaxed text-zinc-600 sm:text-lg lg:text-xl">{{ description }}</p>
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

        <div v-if="stats.length" class="grid gap-3 sm:grid-cols-2 xl:min-w-[26rem] xl:grid-cols-3">
          <div v-for="stat in stats" :key="stat.label" class="rounded-[28px] border border-zinc-300 bg-white/90 px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.06)]">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{{ stat.label }}</p>
            <p class="mt-1 text-lg font-bold text-zinc-900">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="min-w-0">
      <slot />
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
