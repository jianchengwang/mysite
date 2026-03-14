<template>
  <NuxtLink
    :to="to"
    class="group sketch-card flex h-full flex-col justify-between transition-all duration-300 hover:-rotate-1 hover:sketch-shadow-hover"
  >
    <div class="space-y-4">
      <div class="space-y-1">
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">{{ subtitle }}</p>
        <h2 class="text-2xl font-bold text-zinc-900 underline decoration-wavy decoration-zinc-200 group-hover:decoration-zinc-900">
          {{ title }}
        </h2>
      </div>

      <p class="min-h-[4.5rem] text-base text-zinc-600">{{ description }}</p>
      <p class="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
        {{ detail }}
      </p>
    </div>

    <div class="mt-6 space-y-4">
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in tags"
          :key="tag.label"
          class="inline-flex items-center px-3 py-1 text-xs font-bold sketch-border-3"
          :class="tagClass(tag.tone)"
        >
          # {{ tag.label }}
        </span>
      </div>
      <div class="flex justify-end font-bold text-zinc-800 transition-transform group-hover:translate-x-1">
        Play →
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { GameTag, GameTagTone } from '~/utils/games/catalog'

defineProps<{
  to: string
  title: string
  subtitle: string
  description: string
  detail: string
  tags: GameTag[]
}>()

const toneMap: Record<GameTagTone, string> = {
  green: 'bg-green-50 text-green-700',
  blue: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700'
}

const tagClass = (tone: GameTagTone) => toneMap[tone]
</script>
