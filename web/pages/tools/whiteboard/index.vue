<template>
  <div class="h-screen bg-zinc-50">
    <WhiteboardCanvas :is-modal="false" />
  </div>
</template>

<script setup lang="ts">
import WhiteboardCanvas from '~/components/WhiteboardCanvas.vue'

definePageMeta({ layout: 'default' })
</script>
