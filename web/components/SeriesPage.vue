<template>
  <CloudNativeDirectory v-if="current?.directory && current.series.id === 'cloudnative'" :key="current.series.path" :series="current.series" />
  <SeriesDirectory v-else-if="current?.directory" :key="current.series.path" :series="current.series" />
  <SeriesReader v-else-if="current?.entry" :key="current.entry.path" :series="current.series" :entry="current.entry" />
</template>
<script setup lang="ts">
const { current } = useSeriesCatalog()
if (!current.value) throw createError({ statusCode: 404, statusMessage: 'Collection or article not found' })
</script>

