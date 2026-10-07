<template>
  <nav aria-label="On this page" class="table-of-contents"><p class="eyebrow">On this page</p><ul><li v-for="link in links || []" :key="link.id"><a :href="'#' + link.id" :class="{ active: currentHash === '#' + link.id }">{{ link.text }}</a><ul v-if="link.children?.length"><li v-for="child in link.children" :key="child.id"><a :href="'#' + child.id" :class="{ active: currentHash === '#' + child.id }">{{ child.text }}</a></li></ul></li></ul></nav>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
interface TocLink { id: string; text: string; children?: TocLink[] }
defineProps<{ links?: TocLink[] }>()
const route = useRoute()
const currentHash = ref(route.hash)
const updateHash = () => { currentHash.value = window.location.hash }
watch(() => route.hash, (value) => { currentHash.value = value })
onMounted(() => { window.addEventListener('hashchange', updateHash) })
onUnmounted(() => { window.removeEventListener('hashchange', updateHash) })
</script>
