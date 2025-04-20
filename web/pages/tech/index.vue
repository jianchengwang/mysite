<template>
  <CollectionList title="Tech" subtitle="Tech makes the world go round." :list="list" />
</template>

<script setup lang="ts">
import CollectionList from '~/components/CollectionList.vue'
const { data: list } = await useAsyncData(() =>
  (queryCollection('tech') as any).select('path', 'title', 'description').all()
)
</script>

<style scoped>
.aspect-w-16 {
  position: relative;
  padding-bottom: 56.25%;
}

.aspect-w-16>* {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>