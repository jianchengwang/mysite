<template>
  <div class="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative overflow-hidden">
    <!-- Welcome Text -->
    <div class="text-center mb-16 relative z-10">
      <h1 class="text-5xl md:text-7xl font-bold text-zinc-900 mb-6 transform -rotate-1">
        Jiancheng Wang
      </h1>
      <p class="text-2xl md:text-3xl font-medium text-zinc-700 sketch-border-3 inline-block px-6 py-2 bg-white">
        👋🏻 To be a free coder and creator ✨
      </p>
    </div>

    <!-- Main Sketch Container -->
    <div class="relative mx-auto w-full max-w-4xl h-[600px] md:h-[700px] sketch-border bg-white p-8">
      
      <!-- Grid of Icons -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div class="flex flex-col items-center">
          <img src="/images/typing.svg" alt="typing" class="w-24 h-24 object-contain grayscale hover:grayscale-0 transition-all hover:scale-110" />
          <span class="font-hand text-lg mt-2">Typing</span>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/cycling.svg" alt="cycling" class="w-24 h-24 object-contain grayscale hover:grayscale-0 transition-all hover:scale-110" />
          <span class="font-hand text-lg mt-2">Cycling</span>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/watching.svg" alt="watching" class="w-24 h-24 object-contain grayscale hover:grayscale-0 transition-all hover:scale-110" />
          <span class="font-hand text-lg mt-2">Watching</span>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/sketching.svg" alt="sketching" class="w-24 h-24 object-contain grayscale hover:grayscale-0 transition-all hover:scale-110" />
          <span class="font-hand text-lg mt-2">Sketching</span>
        </div>
      </div>

      <!-- Center Content -->
      <div class="flex flex-col md:flex-row items-center justify-around gap-12 py-8">
        <div class="relative">
          <img src="/cat_hei.png" alt="cat_hei" 
            class="w-48 h-48 object-contain sketch-border-2 p-2 cursor-pointer transform -rotate-3 hover:rotate-0 transition-transform"
            @click="showLightbox = true; boxImage = '/cat_hei.png';" />
          <div class="absolute -bottom-4 -right-2 font-hand bg-yellow-100 px-2 border border-black transform rotate-6">Hei</div>
        </div>

        <div class="relative">
          <img
            src="/we.png"
            alt="we"
            class="w-56 h-56 rounded-full object-cover sketch-border-3 p-1 cursor-pointer z-10 hover:scale-105 transition-transform shadow-lg"
            @click="showLightbox = true; boxImage = '/we.png';"
          />
        </div>

        <div class="relative">
          <img src="/cat_xia.png" alt="cat_xia" 
            class="w-48 h-48 object-contain sketch-border-2 p-2 cursor-pointer transform rotate-3 hover:rotate-0 transition-transform"
            @click="showLightbox = true; boxImage = '/cat_xia.png';" />
          <div class="absolute -bottom-4 -left-2 font-hand bg-blue-100 px-2 border border-black transform -rotate-6">Xia</div>
        </div>
      </div>

      <!-- More Icons at bottom -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
        <div class="flex flex-col items-center">
          <img src="/images/reading.svg" alt="reading" class="w-20 h-20 object-contain grayscale hover:grayscale-0 transition-all" />
          <span class="font-hand text-lg mt-1">Reading</span>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/yoga.svg" alt="yoga" class="w-20 h-20 object-contain grayscale hover:grayscale-0 transition-all" />
          <span class="font-hand text-lg mt-1">Yoga</span>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/listening.svg" alt="listening" class="w-20 h-20 object-contain grayscale hover:grayscale-0 transition-all" />
          <span class="font-hand text-lg mt-1">Listening</span>
        </div>
        <div class="flex flex-col items-center">
          <img src="/images/walking.svg" alt="walking" class="w-20 h-20 object-contain grayscale hover:grayscale-0 transition-all" />
          <span class="font-hand text-lg mt-1">Walking</span>
        </div>
      </div>

      <!-- Scribble decorations -->
      <div class="absolute -top-6 -left-6 text-6xl opacity-20 pointer-events-none select-none">✏️</div>
      <div class="absolute -bottom-6 -right-6 text-6xl opacity-20 pointer-events-none select-none transform rotate-45">✒️</div>
    </div>
  </div>

  <!-- Lightbox modal -->
  <div v-if="showLightbox" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" @click="showLightbox = false">
    <div class="relative sketch-border-2 bg-white p-4 max-w-2xl max-h-[90vh]">
      <img :src="boxImage" class="max-w-full max-h-[80vh] object-contain" />
      <button class="absolute -top-4 -right-4 bg-white border-2 border-black rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold hover:bg-zinc-100">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

// Lightbox state
import { ref } from 'vue'
const boxImage = ref('/we.png')
const showLightbox = ref(false)
</script>

<style scoped>
 /* no extra styles */
</style>