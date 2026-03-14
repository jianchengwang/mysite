<template>
  <div class="max-w-7xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
    <div class="mb-12 text-center sm:mb-16">
      <h1 class="mb-3 text-4xl font-bold text-zinc-900 -rotate-1 sm:mb-4 sm:text-5xl">Games Playground</h1>
      <p class="text-lg text-zinc-600 sm:text-2xl">Sketchy board games, puzzles, and a few deliberately slow distractions.</p>
    </div>

    <div class="mb-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div class="sketch-card bg-[linear-gradient(140deg,#ffffff_0%,#fff7ed_100%)]">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Now Available</p>
        <p class="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">Gomoku, Xiangqi, Fish Pond, 3D Cube, and Huarongdao</p>
        <p class="mt-3 text-base text-zinc-600 sm:text-lg">
          The hand-drawn minimal style stays intact, but the focus is on launching straight into play and learning by doing.
        </p>
      </div>

      <div class="sketch-card bg-[linear-gradient(140deg,#ffffff_0%,#f0fdf4_100%)]">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Design Notes</p>
        <p class="mt-3 text-base leading-relaxed text-zinc-600 sm:text-lg">
          The game logic runs on the front end and keeps the same sketch-border language as the rest of the site, while giving the play area priority.
        </p>
      </div>
    </div>

    <div class="grid gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3">
      <CatalogCard
        v-for="game in gamesCatalog"
        :key="game.slug"
        :to="gamePath(game.slug)"
        :title="game.title"
        :subtitle="game.subtitle"
        :description="game.description"
        :detail="game.detail"
        :tags="game.tags.map(t => ({ label: t.label, tone: t.tone as any }))"
        :aria-label="'Play ' + game.title"
        action-text="Play"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { gamePath, gamesCatalog } from '~/utils/games/catalog'

definePageMeta({ layout: 'default' })
</script>
