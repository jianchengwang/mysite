<template>
  <nav class="series-pager" aria-label="章节翻页">
    <NuxtLink v-if="neighbors.previous" :to="neighbors.previous.path" rel="prev"><span>← {{ series.section === 'store' ? '上一章' : '上一篇' }}</span><strong>{{ neighbors.previous.title }}</strong></NuxtLink><div v-else class="pager-boundary">已是开篇</div>
    <NuxtLink :to="series.path" class="pager-directory" aria-label="返回合集目录">返回目录</NuxtLink>
    <NuxtLink v-if="neighbors.next" :to="neighbors.next.path" rel="next"><span>{{ series.section === 'store' ? '下一章' : '下一篇' }} →</span><strong>{{ neighbors.next.title }}</strong></NuxtLink><div v-else class="pager-boundary">本次阅读到这里</div>
  </nav>
</template>
<script setup lang="ts">
import { adjacentEntries } from '~/utils/seriesCatalog.mjs'
const props = defineProps<{ series: any; entry: any }>()
const neighbors = computed(() => adjacentEntries(props.series, props.entry.path))
</script>

