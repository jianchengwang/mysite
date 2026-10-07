<template>
  <details class="reading-settings reader-settings">
    <summary>阅读设置</summary>
    <div class="reader-settings-panel">
      <div class="reader-settings-row" role="group" aria-label="背景"><span>背景</span><button :aria-pressed="theme === 'paper'" @click="$emit('theme', 'paper')">明亮</button><button :aria-pressed="theme === 'night'" @click="$emit('theme', 'night')">夜间</button></div>
      <div class="reader-settings-row" role="group" aria-label="文字大小"><span>字号</span><button :disabled="fontSize <= 16" aria-label="减小字号" @click="$emit('resize', -1)">A−</button><span class="reader-font-size" aria-live="polite">{{ fontSize }} px</span><button :disabled="fontSize >= 24" aria-label="增大字号" @click="$emit('resize', 1)">A+</button></div>
    </div>
  </details>
</template>
<script setup lang="ts">
defineProps<{ fontSize: number; theme: 'paper' | 'night' }>()
defineEmits<{ resize: [amount: number]; theme: [value: 'paper' | 'night'] }>()
</script>
<style scoped>
.reader-settings > .reader-settings-panel {display:flex;flex-direction:column;align-items:stretch;gap:14px;padding:14px;border:1px solid var(--line);border-radius:6px;background:var(--surface)}
.reader-settings-row {display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.reader-settings-row > span:first-child {min-width:2em}
.reader-settings button {min-width:44px;min-height:44px;background:var(--surface);color:var(--muted)}
.reader-settings button[aria-pressed=true] {background:var(--paper);color:var(--accent)}
.reader-settings button:disabled {opacity:.4;cursor:default}
.reader-font-size {min-width:3em;text-align:center;font-variant-numeric:tabular-nums}
</style>
