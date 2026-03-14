<template>
  <div class="max-w-7xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
    <div class="mb-12 text-center sm:mb-16">
      <h1 class="mb-3 text-4xl font-bold text-zinc-900 -rotate-1 sm:mb-4 sm:text-5xl">Games Playground</h1>
      <p class="text-lg text-zinc-600 sm:text-2xl">Sketchy board games, puzzles, and a few deliberately slow distractions.</p>
    </div>

    <div class="mb-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div class="sketch-card bg-[linear-gradient(140deg,#ffffff_0%,#fff7ed_100%)]">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Now Available</p>
        <p class="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">五子棋、中国象棋、摸鱼池、3D 魔方、华容道</p>
        <p class="mt-3 text-base text-zinc-600 sm:text-lg">
          延续当前站点的手绘极简风格，优先做“打开就能玩”，再逐步补强搜索强度、提示和动画细节。
        </p>
      </div>

      <div class="sketch-card bg-[linear-gradient(140deg,#ffffff_0%,#f0fdf4_100%)]">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Design Notes</p>
        <p class="mt-3 text-base leading-relaxed text-zinc-600 sm:text-lg">
          所有对战逻辑都在前端，适合静态部署。交互尽量收敛到同一套按钮、卡片、提示条和手绘边框语言里。
        </p>
      </div>
    </div>

    <div class="grid gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3">
      <GameCatalogCard
        v-for="game in gamesCatalog"
        :key="game.slug"
        :to="gamePath(game.slug)"
        :title="game.title"
        :subtitle="game.subtitle"
        :description="game.description"
        :detail="game.detail"
        :tags="game.tags"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import GameCatalogCard from '~/components/games/GameCatalogCard.vue'
import { gamePath, gamesCatalog } from '~/utils/games/catalog'

definePageMeta({ layout: 'default' })
</script>
