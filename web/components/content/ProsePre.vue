<template>
  <div class="code-block"><pre ref="pre" v-bind="$attrs" :class="$props.class"><slot /></pre><button type="button" class="code-copy-btn" aria-label="Copy code" @click="copyCode">{{ copyLabel }}</button></div>
</template>
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
defineOptions({ inheritAttrs: false })
const props = defineProps<{ code?: string; language?: string; filename?: string; highlights?: number[]; meta?: string; class?: string }>()
const pre = ref<HTMLElement | null>(null)
const copyLabel = ref('Copy')
let reset: ReturnType<typeof setTimeout> | undefined
const copyCode = async () => {
  const text = props.code || pre.value?.textContent || ''
  try { await navigator.clipboard.writeText(text); copyLabel.value = 'Copied' }
  catch {
    if (pre.value) { const range = document.createRange(); range.selectNodeContents(pre.value); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range) }
    copyLabel.value = 'Press Ctrl/Cmd+C'
  }
  clearTimeout(reset)
  reset = setTimeout(() => { copyLabel.value = 'Copy' }, 2000)
}
onUnmounted(() => { clearTimeout(reset) })
</script>
<style>
pre code .line{display:block}
</style>
