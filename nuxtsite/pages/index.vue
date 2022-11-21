<template>
  <!-- <div class="container">
    <NuxtLink class="site-author-avatar" to="/about">
      <img width="96" loading="lazy" src="https://blog.res.jianchengwang.info/avatar.jpg" alt="jiancheng_wang"><span class="site-author-status" title="balabala....">😊</span>
    </NuxtLink>
    <p class="sayWord">Have fun and enjoy every day.</p>
    <div>
      <ColorModePicker />
    </div>
  </div> -->

  <div class="container mx-auto px-4 mt-6 flex justify-center">
    <div class="p-16 md:p-16 max-w-screen-md w-full flex flex-col items-center justify-center rounded-3xl shadow-inset-white dark:shadow-none">
      <NuxtLink to="/about">
        <div class="relative p-8 md:p-8">
          <img class="h-32 w-32 ring ring-blue-500 ring-offset-4 rounded-full transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500 duration-300" src="https://blog.res.jianchengwang.info/avatar.jpg" alt="jiancheng_wang" />
          <span class="absolute bottom-4 right-4 h-8 w-8 ring-white-500 ring-offset-16" title="balabala....">😊</span>
        </div>
      </NuxtLink>

      <p class="inline-flex items-center text-center text-lg md:text-2xl text-gray-500 dark:text-gray-300 tracking-wide">
        Hey,
        <span class="wave text-5xl mx-3 max-2">👋🏻</span>
        I'm 
      </p>
      <h1 class="text-6xl md:text-8xl font-bold my-4 tracking-tight font-space">JianchengWang.</h1>
      <p class="mt-6 text-lg md:text-xl text-center text-gray-500 dark:text-gray-300 tracking-wide">
        A FullStack Developer obsessed with crafting beautiful experiences, also like to write something, life record, fantasy story ... ✨ 
      </p>

      <div class="mt-28 pb-16">
        <ColorModePicker />
      </div>
    </div>
  </div>
</template>

<script setup>
import ColorModePicker from "@/components/color-mode/ColorModePicker.vue";
</script>

<style scoped>
</style>
