<template>
  <Teleport to="body">
    <div
      v-if="modelValue && safeImages.length"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col items-center justify-center gap-4">
        <button
          class="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-3xl leading-none text-white transition hover:bg-black/70"
          aria-label="Close image preview"
          @click="close"
        >
          ×
        </button>

        <button
          v-if="safeImages.length > 1"
          class="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-2xl text-white transition hover:bg-black/70"
          aria-label="Previous image"
          @click="prev"
        >
          ‹
        </button>

        <img
          :src="safeImages[currentIndex]"
          class="max-h-[82vh] max-w-full rounded-2xl border-2 border-white/20 bg-white object-contain shadow-2xl"
        />

        <button
          v-if="safeImages.length > 1"
          class="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/40 bg-black/50 text-2xl text-white transition hover:bg-black/70"
          aria-label="Next image"
          @click="next"
        >
          ›
        </button>

        <div
          v-if="safeImages.length > 1"
          class="rounded-full border border-white/20 bg-black/40 px-4 py-1 text-sm text-white"
        >
          {{ currentIndex + 1 }} / {{ safeImages.length }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  images: string[]
  startIndex?: number
}>(), {
  startIndex: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const currentIndex = ref(0)

const safeImages = computed(() => props.images.filter(Boolean))

const clampIndex = (value: number) => {
  if (!safeImages.value.length) return 0
  if (value < 0) return safeImages.value.length - 1
  if (value >= safeImages.value.length) return 0
  return value
}

const close = () => {
  emit('update:modelValue', false)
}

const prev = () => {
  currentIndex.value = clampIndex(currentIndex.value - 1)
}

const next = () => {
  currentIndex.value = clampIndex(currentIndex.value + 1)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue) return
  if (event.key === 'Escape') close()
  if (event.key === 'ArrowLeft') prev()
  if (event.key === 'ArrowRight') next()
}

watch(
  () => [props.modelValue, props.startIndex, safeImages.value.length],
  () => {
    if (!props.modelValue) return
    currentIndex.value = clampIndex(props.startIndex)
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
