<template>
  <div class="max-w-7xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
    <div class="mb-12 text-center sm:mb-16">
      <h1 class="mb-3 text-4xl font-bold text-zinc-900 transform -rotate-1 font-hand sm:mb-4 sm:text-5xl">Games Playground</h1>
      <p class="text-lg text-zinc-600 font-hand sm:text-2xl">Board games, puzzles, and playful experiments collected in one hand-drawn arcade.</p>
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
import CatalogCard from '~/components/CatalogCard.vue'
import { gamePath, gamesCatalog } from '~/utils/games/catalog'

definePageMeta({ layout: 'default' })
</script>
