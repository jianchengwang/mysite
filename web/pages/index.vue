<template>
  <!-- Hero Section: Radiating Icons Around Center Avatar -->
  <div class="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 relative">
    <!-- Welcome Text -->
    <p class="mb-8 text-3xl md:text-4xl font-semibold text-gray-700 tracking-wide text-center">
      👋🏻 To be a free coder and creator ✨
    </p>
    <!-- Radiating container -->
    <div class="relative mx-auto w-full h-96 md:h-[60vh]">
      <!-- Top icons -->
      <div class="absolute top-8 left-1/2 transform -translate-x-1/2 flex space-x-8">
        <img src="https://public.mysite.jianchengwang.info/images/typing.svg" alt="typing" class="w-32 h-32 object-contain" />
        <img src="https://public.mysite.jianchengwang.info/images/cycling.svg" alt="cycling" class="w-32 h-32 object-contain" />
        <img src="https://public.mysite.jianchengwang.info/images/watching.svg" alt="watching" class="w-32 h-32 object-contain" />
        <img src="https://public.mysite.jianchengwang.info/images/sketching.svg" alt="sketching" class="w-32 h-32 object-contain" />
      </div>
      <!-- Bottom icons -->
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-8">
        <img src="https://public.mysite.jianchengwang.info/images/reading.svg" alt="reading" class="w-32 h-32 object-contain" />
        <img src="https://public.mysite.jianchengwang.info/images/yoga.svg" alt="yoga" class="w-32 h-32 object-contain" />
        <img src="https://public.mysite.jianchengwang.info/images/listening.svg" alt="listening" class="w-32 h-32 object-contain" />
        <img src="https://public.mysite.jianchengwang.info/images/walking.svg" alt="walking" class="w-32 h-32 object-contain" />
      </div>
      <!-- Left icons -->
      <div class="absolute left-8 top-1/2 transform -translate-y-1/2 flex flex-col space-y-8">
        <img src="https://public.mysite.jianchengwang.info/cat_hei.png" alt="cat_hei" class="w-64 h-64 object-contain"
        @click="showLightbox = true; boxImage = 'https://public.mysite.jianchengwang.info/cat_hei.png';"
        />
      
      </div>
      <!-- Right icons -->
      <div class="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col space-y-8">
        <img src="https://public.mysite.jianchengwang.info/cat_xia.png" alt="cat_xia" class="w-64 h-64 object-contain"
        @click="showLightbox = true; boxImage = 'https://public.mysite.jianchengwang.info/cat_xia.png';"
        />
      </div>
      <!-- Center avatar -->
      <img
        src="https://public.mysite.jianchengwang.info/we.png"
        alt="we"
        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full object-cover shadow-xl cursor-pointer z-10"
        @click="showLightbox = true; boxImage = 'https://public.mysite.jianchengwang.info/we.png';"
      />
    </div>
  </div>

  <!-- Lightbox modal -->
  <div v-if="showLightbox" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" @click="showLightbox = false">
    <img :src="boxImage" class="max-w-lg max-h-[120vh] rounded-lg shadow-2xl" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

// Lightbox state
import { ref } from 'vue'
const boxImage = ref('https://public.mysite.jianchengwang.info/we.png')
const showLightbox = ref(false)
</script>

<style scoped>
 /* no extra styles */
</style>