<template>
  <ul class="chapter-list"><li v-for="item in items" :key="item.path || item.title"><details v-if="item.children?.length" open><summary>{{ item.title }}</summary><ChapterNavigation :items="item.children" /></details><NuxtLink v-else-if="item.path" :to="item.path" :aria-current="route.path.replace(/\/+$/, '') === item.path ? 'page' : undefined">{{ item.title }}</NuxtLink></li></ul>
</template>
<script setup lang="ts">
interface NavigationItem { title: string; path?: string; children?: NavigationItem[] }
defineProps<{ items: NavigationItem[] }>()
const route = useRoute()
</script>
