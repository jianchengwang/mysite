<template><SeriesPage :key="route.path" /></template>
<script setup lang="ts">
const route = useRoute()
definePageMeta({ layout: 'series' })
</script>

