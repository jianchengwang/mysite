<template>
  <CollectionList
    title="Store"
    subtitle="Browse through my written collection of stores."
    :list="list"
  />
</template>

<script setup lang="ts">
import CollectionList from '~/components/CollectionList.vue'
const { data: list } = await useAsyncData(() =>
  (queryCollection('english') as any).select('path', 'title', 'description').all()
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